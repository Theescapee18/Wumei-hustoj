import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const userId = getUserFromCookies(request)?.userId;
  if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const privs = await query<any[]>("SELECT 1 FROM privilege WHERE user_id=$1 AND rightstr='administrator'", [userId]);
  if (!privs || privs.length === 0) return NextResponse.json({ error: '无权限' }, { status: 403 });

  const body = await request.json();
  const { type, problem_id, solution_id, contest_id, result_from, result_to } = body;

  if (!type) return NextResponse.json({ error: '请指定重判类型' }, { status: 400 });

  // 重判：重新加入判题队列后重置状态（先入队，避免 result 条件被提前重置导致查不到）
  const requeue = async (whereSql: string, params: any[]) => {
    await query(
      `INSERT INTO judge_queue (solution_id, priority, language)
       SELECT solution_id, 5, language FROM solution WHERE ${whereSql}
       AND solution_id NOT IN (SELECT solution_id FROM judge_queue WHERE status IN (0, 1))`,
      params
    );
    await query(`UPDATE solution SET result=0, pass_rate=0 WHERE ${whereSql}`, params);
  };

  try {
    if (type === 'problem' && problem_id) {
      const pid = parseInt(problem_id);
      if (pid <= 0) return NextResponse.json({ error: '无效题目 ID' }, { status: 400 });
      await requeue('problem_id=$1 AND problem_id>0', [pid]);
      await query("UPDATE problem SET accepted=0 WHERE problem_id=$1", [pid]);
      return NextResponse.json({ message: `已重判题目 #${pid}` });
    }

    if (type === 'solution' && solution_id) {
      const sid = parseInt(solution_id);
      await requeue('solution_id=$1 AND problem_id>0', [sid]);
      return NextResponse.json({ message: `已重判提交 #${sid}` });
    }

    if (type === 'contest' && contest_id) {
      const cid = parseInt(contest_id);
      if (cid <= 0) return NextResponse.json({ error: '无效竞赛 ID' }, { status: 400 });
      const pid = body.pid !== undefined ? parseInt(body.pid) : undefined;
      if (pid !== undefined && !isNaN(pid)) {
        await requeue('contest_id=$1 AND num=$2', [cid, pid]);
      } else {
        await requeue('contest_id=$1 AND problem_id>0', [cid]);
      }
      return NextResponse.json({ message: `已重判竞赛 #${cid}` });
    }

    if (type === 'result' && result_from !== undefined && result_to !== undefined) {
      const from = parseInt(result_from);
      // 按结果重判：将指定结果的提交重新入队
      await requeue('result=$1 AND problem_id>0', [from]);
      return NextResponse.json({ message: `已将 result=${from} 的提交重新入队重判` });
    }

    return NextResponse.json({ error: '参数不完整' }, { status: 400 });
  } catch (error) {
    console.error('Rejudge error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
