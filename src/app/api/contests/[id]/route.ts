import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contestId = parseInt(id);

  try {
    const contests = await query<any[]>(
      "SELECT * FROM contest WHERE contest_id=$1",
      [contestId]
    );
    if (!contests || contests.length === 0) {
      return NextResponse.json({ error: '竞赛不存在' }, { status: 404 });
    }

    const problemList = await query<any[]>(
      "SELECT cp.num, cp.problem_id, p.title, p.accepted, p.submit FROM contest_problem cp LEFT JOIN problem p ON cp.problem_id=p.problem_id WHERE cp.contest_id=$1 ORDER BY cp.num",
      [contestId]
    );

    // 只取已经开始的竞赛或者公开竞赛的题目
    const contest = contests[0];
    const now = new Date();
    const start = new Date(contest.start_time);
    const isStarted = now >= start;

    return NextResponse.json({
      contest,
      problems: isStarted || !contest.private ? (problemList || []) : [],
    });
  } catch (error) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
