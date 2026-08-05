import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';
import { finalizeAttempt, gradeAttempt, AttemptAnswers, ExamQuestion } from '@/lib/examGrade';

// 校验 attempt 归属，返回记录
async function loadAttempt(attemptId: number, userId: string) {
  const rows = await query<any[]>(
    `SELECT a.*, p.title AS paper_title, p.duration_minutes
     FROM exam_attempt a JOIN exam_paper p ON p.paper_id = a.paper_id
     WHERE a.attempt_id=$1 AND a.user_id=$2`,
    [attemptId, userId]
  );
  return rows && rows.length > 0 ? rows[0] : null;
}

// 考试模式超时则服务端强制交卷
async function enforceDeadline(attempt: any): Promise<boolean> {
  if (attempt.mode === 'exam' && !attempt.submitted_at && attempt.deadline
    && new Date(attempt.deadline).getTime() < Date.now()) {
    await finalizeAttempt(attempt.attempt_id, true);
    return true;
  }
  return false;
}

// 获取作答现场：题目（隐藏标准答案）、已保存答案、剩余时间、切屏次数
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromCookies(request);
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  try {
    const { id } = await params;
    const attempt = await loadAttempt(parseInt(id), user.userId);
    if (!attempt) return NextResponse.json({ error: '作答记录不存在' }, { status: 404 });

    const timedOut = await enforceDeadline(attempt);
    if (timedOut) attempt.submitted_at = new Date().toISOString();

    const questions = await query<ExamQuestion[]>(
      "SELECT * FROM exam_question WHERE paper_id=$1 ORDER BY question_order", [attempt.paper_id]);
    const answers: AttemptAnswers = attempt.answers || {};

    const submitted = !!attempt.submitted_at;
    let result: any = null;
    if (submitted) {
      // 已交卷：返回判分明细（含标准答案，练习/考试均可复盘）
      const grade = await gradeAttempt(questions || [], answers);
      result = {
        score: grade.got, total: grade.total, pending: grade.pending,
        details: grade.details.map(d => ({
          ...d,
          standard_answer: (questions || []).find(q => q.question_id === d.question_id)?.answer || '',
        })),
      };
    }

    return NextResponse.json({
      attempt: {
        attempt_id: attempt.attempt_id,
        paper_id: attempt.paper_id,
        paper_title: attempt.paper_title,
        mode: attempt.mode,
        started_at: attempt.started_at,
        deadline: attempt.deadline,
        remaining_seconds: attempt.deadline
          ? Math.max(0, Math.floor((new Date(attempt.deadline).getTime() - Date.now()) / 1000))
          : null,
        submitted: submitted,
        auto_submitted: attempt.auto_submitted === 'Y',
        switch_count: attempt.switch_count,
      },
      questions: (questions || []).map(q => ({
        question_id: q.question_id,
        question_order: q.question_order,
        qtype: q.qtype,
        content: q.content,
        options: q.options || [],
        score: q.score,
        problem_id: q.problem_id,
        // 未交卷时不下发标准答案
        my_answer: answers[String(q.question_id)]?.answer || '',
        my_solution_id: answers[String(q.question_id)]?.solution_id || null,
      })),
      result,
    });
  } catch (error) {
    console.error('Get attempt error:', error);
    return NextResponse.json({ error: '获取作答信息失败' }, { status: 500 });
  }
}

/**
 * 保存答案（可多次调用）
 * body: { answers: { [question_id]: "A" } }                       —— 客观题
 *       { coding: { question_id, language, source } }             —— 算法题提交评测
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromCookies(request);
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  try {
    const { id } = await params;
    const attemptId = parseInt(id);
    const attempt = await loadAttempt(attemptId, user.userId);
    if (!attempt) return NextResponse.json({ error: '作答记录不存在' }, { status: 404 });
    if (attempt.submitted_at) return NextResponse.json({ error: '已交卷，不能再作答' }, { status: 400 });
    if (await enforceDeadline(attempt)) {
      return NextResponse.json({ error: '考试时间已到，已自动交卷' }, { status: 400 });
    }

    const body = await request.json();
    const questions = await query<ExamQuestion[]>(
      "SELECT * FROM exam_question WHERE paper_id=$1", [attempt.paper_id]);
    const qMap = new Map((questions || []).map(q => [Number(q.question_id), q]));
    const answers: AttemptAnswers = attempt.answers || {};

    // 客观题答案合并
    if (body?.answers && typeof body.answers === 'object') {
      for (const [qid, ans] of Object.entries(body.answers)) {
        const q = qMap.get(parseInt(qid));
        if (!q || q.qtype === 'coding') continue;
        answers[qid] = { ...answers[qid], answer: String(ans ?? '').slice(0, 2000) };
      }
    }

    // 算法题：提交到评测队列
    let solutionId: number | null = null;
    if (body?.coding) {
      const { question_id, language, source } = body.coding;
      const q = qMap.get(parseInt(question_id));
      if (!q || q.qtype !== 'coding' || !q.problem_id) {
        return NextResponse.json({ error: '算法题不存在' }, { status: 400 });
      }
      if (!source || !String(source).trim()) {
        return NextResponse.json({ error: '代码不能为空' }, { status: 400 });
      }
      const lang = parseInt(language);
      const codeLength = Buffer.byteLength(source, 'utf8');
      const ins = await query<any[]>(
        `INSERT INTO solution(problem_id, user_id, language, result, code_length, in_date)
         VALUES($1, $2, $3, 0, $4, NOW()) RETURNING solution_id`,
        [q.problem_id, user.userId, lang, codeLength]
      );
      solutionId = ins[0].solution_id;
      await query("INSERT INTO source_code(solution_id, source) VALUES($1, $2)", [solutionId, source]);
      await query(
        `INSERT INTO judge_queue(solution_id, priority, estimated_time, language, create_time)
         VALUES($1, 10, 30, $2, NOW())`,
        [solutionId, lang]
      );
      await query("UPDATE problem SET submit=submit+1 WHERE problem_id=$1", [q.problem_id]);
      await query("UPDATE users SET submit=COALESCE(submit,0)+1 WHERE user_id=$1", [user.userId]);
      answers[String(q.question_id)] = { ...answers[String(q.question_id)], solution_id: solutionId as number };
    }

    await query("UPDATE exam_attempt SET answers=$1::jsonb WHERE attempt_id=$2",
      [JSON.stringify(answers), attemptId]);

    return NextResponse.json({ message: '已保存', solution_id: solutionId });
  } catch (error) {
    console.error('Save attempt error:', error);
    return NextResponse.json({ error: '保存答案失败' }, { status: 500 });
  }
}
