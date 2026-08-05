// 考试判分共享逻辑
import { query } from './db';

export interface ExamQuestion {
  question_id: number;
  paper_id: number;
  question_order: number;
  qtype: string; // single/multiple/fill/judge/coding
  content: string;
  options: any[];
  answer: string;
  score: number;
  problem_id: number | null;
}

// 用户答案存储格式：{ [question_id]: { answer?: string, solution_id?: number } }
export type AttemptAnswers = Record<string, { answer?: string; solution_id?: number }>;

// 规范化判断题答案：T/F
function normJudge(s: string): string {
  const t = s.trim().toUpperCase();
  if (['T', 'TRUE', '对', '正确', '√', 'Y', 'YES', '1'].includes(t)) return 'T';
  if (['F', 'FALSE', '错', '错误', '×', 'X', 'N', 'NO', '0'].includes(t)) return 'F';
  return t;
}

// 规范化选择题答案：去分隔符、排序、大写（多选 "B,A" -> "AB"）
function normChoice(s: string): string {
  return s.toUpperCase().replace(/[^A-Z]/g, '').split('').sort().join('');
}

/**
 * 给单题判分（客观题）。coding 题需异步查 solution，见 gradeAttempt。
 * 返回得分（0 ~ q.score）
 */
export function gradeObjective(q: ExamQuestion, userAnswer: string): number {
  const ua = (userAnswer || '').trim();
  const std = (q.answer || '').trim();
  if (!ua || !std) return 0;
  switch (q.qtype) {
    case 'single':
    case 'multiple':
      return normChoice(ua) === normChoice(std) ? q.score : 0;
    case 'judge':
      return normJudge(ua) === normJudge(std) ? q.score : 0;
    case 'fill':
      // 标准答案支持多个可接受项，用 | 分隔
      return std.split('|').map(s => s.trim()).filter(Boolean).some(acc => acc === ua) ? q.score : 0;
    default:
      return 0;
  }
}

export interface GradeDetail {
  question_id: number;
  question_order: number;
  qtype: string;
  score: number;      // 题目满分
  got: number;        // 实际得分
  pending: boolean;   // coding 题判题未出结果
  user_answer: string;
  solution_id?: number;
  solution_result?: number;
}

export interface GradeResult {
  total: number;      // 试卷满分
  got: number;        // 实际得分
  pending: boolean;   // 是否有 coding 题仍在判题
  details: GradeDetail[];
}

/**
 * 对整份作答判分。
 * coding 题按关联 solution 判分：AC 得满分，否则按通过率折算（pass_rate * score）。
 */
export async function gradeAttempt(questions: ExamQuestion[], answers: AttemptAnswers): Promise<GradeResult> {
  const details: GradeDetail[] = [];
  let total = 0, got = 0, pending = false;

  // 一次性查出所有关联的 solution
  const solutionIds = Object.values(answers || {})
    .map(a => a?.solution_id)
    .filter((x): x is number => typeof x === 'number');
  const solutionMap = new Map<number, { result: number; pass_rate: number }>();
  if (solutionIds.length > 0) {
    const rows = await query<any[]>(
      "SELECT solution_id, result, COALESCE(pass_rate, 0) AS pass_rate FROM solution WHERE solution_id = ANY($1::int[])",
      [solutionIds]
    );
    for (const r of rows || []) {
      solutionMap.set(Number(r.solution_id), { result: Number(r.result), pass_rate: Number(r.pass_rate) });
    }
  }

  for (const q of questions) {
    total += q.score;
    const entry = answers?.[String(q.question_id)] || {};
    const ua = entry.answer || '';
    let qGot = 0;
    let qPending = false;
    let solResult: number | undefined;

    if (q.qtype === 'coding') {
      const sid = entry.solution_id;
      if (typeof sid === 'number') {
        const sol = solutionMap.get(sid);
        if (sol) {
          solResult = sol.result;
          if (sol.result === 4) qGot = q.score; // AC
          else if (sol.result < 4) { qPending = true; pending = true; } // 排队/编译/运行中
          else qGot = Math.round(q.score * Math.max(0, Math.min(1, sol.pass_rate)) * 100) / 100;
        }
      }
    } else {
      qGot = gradeObjective(q, ua);
    }

    got += qGot;
    details.push({
      question_id: q.question_id,
      question_order: q.question_order,
      qtype: q.qtype,
      score: q.score,
      got: qGot,
      pending: qPending,
      user_answer: ua,
      solution_id: entry.solution_id,
      solution_result: solResult,
    });
  }

  return { total, got: Math.round(got * 100) / 100, pending, details };
}

const VALID_QTYPES = ['single', 'multiple', 'fill', 'judge', 'coding'];

// 题型别名（中文/常见写法 → 标准）
const QTYPE_ALIAS: Record<string, string> = {
  'single': 'single', '单选': 'single', '选择': 'single', 'choice': 'single', 'single_choice': 'single',
  'multiple': 'multiple', '多选': 'multiple', 'multi': 'multiple', 'multiple_choice': 'multiple',
  'fill': 'fill', '填空': 'fill', 'blank': 'fill', 'fill_blank': 'fill',
  'judge': 'judge', '判断': 'judge', 'tf': 'judge', 'true_false': 'judge',
  'coding': 'coding', '算法': 'coding', '算法题': 'coding', '编程': 'coding', '编程题': 'coding', 'program': 'coding',
};

export function normalizeQtype(t: string): string | null {
  const norm = QTYPE_ALIAS[String(t || '').trim().toLowerCase()] || QTYPE_ALIAS[String(t || '').trim()];
  return norm && VALID_QTYPES.includes(norm) ? norm : null;
}

/**
 * 交卷并落库：判分后更新 exam_attempt（submitted_at/score/total_score/auto_submitted）
 * 返回判分结果。已交卷的 attempt 只重算分数（coding 题判题结果可能后到）。
 */
export async function finalizeAttempt(attemptId: number, auto: boolean): Promise<GradeResult> {
  const attempts = await query<any[]>("SELECT * FROM exam_attempt WHERE attempt_id=$1", [attemptId]);
  if (!attempts || attempts.length === 0) throw new Error('作答记录不存在');
  const attempt = attempts[0];
  const questions = await query<ExamQuestion[]>(
    "SELECT * FROM exam_question WHERE paper_id=$1 ORDER BY question_order", [attempt.paper_id]);
  const answers: AttemptAnswers = attempt.answers || {};
  const grade = await gradeAttempt(questions || [], answers);

  if (!attempt.submitted_at) {
    await query(
      `UPDATE exam_attempt SET submitted_at=NOW(), score=$1, total_score=$2, auto_submitted=$3 WHERE attempt_id=$4`,
      [grade.got, grade.total, auto ? 'Y' : 'N', attemptId]
    );
  } else {
    // 已交卷：仅刷新分数（coding 判题结果出来后）
    await query("UPDATE exam_attempt SET score=$1, total_score=$2 WHERE attempt_id=$3",
      [grade.got, grade.total, attemptId]);
  }
  return grade;
}
