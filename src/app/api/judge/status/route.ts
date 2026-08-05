import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 查询判题排队状态API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const solutionId = searchParams.get('solution_id');

  if (!solutionId) {
    return NextResponse.json({ error: '缺少solution_id' }, { status: 400 });
  }

  try {
    // 查询队列状态
    const queueStatus = await query<any[]>(
      `SELECT 
        queue_id, status, priority,
        create_time, start_time, end_time,
        estimated_time,
        EXTRACT(EPOCH FROM (NOW() - create_time)) as waiting_time
       FROM judge_queue
       WHERE solution_id = $1`,
      [parseInt(solutionId)]
    );

    if (!queueStatus || queueStatus.length === 0) {
      return NextResponse.json({ error: '未找到提交记录' }, { status: 404 });
    }

    const status = queueStatus[0];

    // 计算队列位置
    const position = await getQueuePosition(status.queue_id);

    // 计算预计等待时间
    const estimatedWait = calculateRemainingTime(status);

    // 查询提交结果（如果已完成）
    let solutionResult = null;
    if (status.status === 2 || status.status === 3) {
      const solution = await query<any[]>(
        `SELECT result, time, memory FROM solution WHERE solution_id = $1`,
        [parseInt(solutionId)]
      );
      if (solution && solution.length > 0) {
        solutionResult = solution[0];
      }
    }

    return NextResponse.json({
      solution_id: solutionId,
      status: getStatusText(status.status),
      queue_position: position,
      estimated_wait: estimatedWait,
      waiting_time: Math.floor(status.waiting_time || 0),
      is_judging: status.status === 1,
      priority: status.priority,
      result: solutionResult
    });
  } catch (error) {
    console.error('Get queue status error:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}

// 获取状态文本
function getStatusText(status: number): string {
  switch (status) {
    case 0: return '排队中';
    case 1: return '判题中';
    case 2: return '已完成';
    case 3: return '判题超时';
    default: return '未知';
  }
}

// 计算队列位置
async function getQueuePosition(queueId: number): Promise<number> {
  try {
    const result = await query<any[]>(
      `SELECT COUNT(*) as position
       FROM judge_queue
       WHERE status = 0 
       AND priority >= (
         SELECT priority FROM judge_queue WHERE queue_id = $1
       )
       AND create_time <= (
         SELECT create_time FROM judge_queue WHERE queue_id = $2
       )`,
      [queueId, queueId]
    );

    return parseInt(result[0]?.position || 0);
  } catch {
    return 0;
  }
}

// 计算剩余等待时间
function calculateRemainingTime(status: any): number {
  if (status.status !== 0) return 0; // 不在排队，无需等待

  const avgJudgeTime = 30; // 平均判题时间
  const position = Math.floor(status.waiting_time / avgJudgeTime);

  // 考虑最大并发数=2
  return Math.floor(position * avgJudgeTime / 2);
}