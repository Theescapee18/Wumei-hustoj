import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

// 提交代码并加入判题排队API
export async function POST(request: NextRequest) {
  const user = getUserFromCookies(request);
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const { problem_id, language, source } = await request.json();

    if (!problem_id || language === undefined || language === null || !source) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    // 题目存在性检查
    const problems = await query<any[]>(
      "SELECT problem_id FROM problem WHERE problem_id=$1 AND defunct='N'",
      [problem_id]
    );
    if (!problems || problems.length === 0) {
      return NextResponse.json({ error: '题目不存在' }, { status: 404 });
    }

    // 创建提交记录（状态=排队）
    const codeLength = Buffer.byteLength(source, 'utf8');
    const insertResult = await query<any>(
      `INSERT INTO solution
       (problem_id, user_id, language, result, code_length, in_date)
       VALUES ($1, $2, $3, 0, $4, NOW())
       RETURNING solution_id`,
      [problem_id, user.userId, language, codeLength]
    );

    const solutionId = insertResult[0].solution_id;

    // 保存源代码（判题器从 source_code 读取）
    await query(
      `INSERT INTO source_code(solution_id, source) VALUES($1, $2)`,
      [solutionId, source]
    );

    // 检查题目类型（是否比赛题）
    const contest = await query<any[]>(
      `SELECT contest_id FROM contest_problem
       WHERE problem_id = $1
       ORDER BY contest_id DESC
       LIMIT 1`,
      [problem_id]
    );

    // 计算优先级（比赛题优先）
    const priority = contest.length > 0 ? 10 : 0;

    // 预估判题时间
    const estimatedTime = estimateJudgeTime(language);

    // 加入判题队列
    await query(
      `INSERT INTO judge_queue
       (solution_id, priority, estimated_time, language, create_time)
       VALUES ($1, $2, $3, $4, NOW())`,
      [solutionId, priority, estimatedTime, language]
    );

    // 更新题目与用户提交计数
    await query("UPDATE problem SET submit=submit+1 WHERE problem_id=$1", [problem_id]);
    await query("UPDATE users SET submit=COALESCE(submit,0)+1 WHERE user_id=$1", [user.userId]);

    // 获取当前排队情况
    const queueInfo = await query<any[]>(
      `SELECT 
        COUNT(*) as total_waiting,
        AVG(CASE WHEN priority >= 10 THEN estimated_time ELSE NULL END) as contest_avg_time,
        AVG(estimated_time) as normal_avg_time
       FROM judge_queue
       WHERE status = 0`
    );

    const estimatedWait = calculateWaitTime(queueInfo[0], priority);

    return NextResponse.json({
      success: true,
      solution_id: solutionId,
      queue_info: {
        total_waiting: parseInt(queueInfo[0]?.total_waiting || '0'),
        estimated_wait: estimatedWait,
        is_contest: priority > 0,
        priority: priority
      },
      message: '已加入判题队列，请稍候...'
    });
  } catch (error) {
    console.error('Submit to queue error:', error);
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  }
}

// 预估判题时间（根据语言类型）
function estimateJudgeTime(language: number): number {
  // 0=C, 1=C++, 3=Java, 6=Python
  const times: Record<number, number> = { 0: 30, 1: 30, 3: 60, 6: 40 };
  return times[language] || 30;
}

// 计算预计等待时间
function calculateWaitTime(queueInfo: any, priority: number): number {
  const totalWaiting = parseInt(queueInfo?.total_waiting || '0');
  const avgTime = priority >= 10
    ? parseFloat(queueInfo?.contest_avg_time || '30')
    : parseFloat(queueInfo?.normal_avg_time || '30');

  // 考虑最大并发数=2
  const maxConcurrent = 2;
  const waitingTime = Math.floor((totalWaiting / maxConcurrent) * avgTime);

  return waitingTime;
}