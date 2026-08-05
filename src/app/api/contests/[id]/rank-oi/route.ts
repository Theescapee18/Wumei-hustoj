import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cid = parseInt(id);

  try {
    const contests = await query<any[]>(
      "SELECT start_time, end_time, title FROM contest WHERE contest_id=$1",
      [cid]
    );
    if (!contests || contests.length === 0) {
      return NextResponse.json({ error: '竞赛不存在' }, { status: 404 });
    }

    const contest = contests[0];
    const startTime = new Date(contest.start_time).getTime();
    const endTime = new Date(contest.end_time).getTime();

    // Get contest problems
    const problemList = await query<any[]>(
      "SELECT num, problem_id, title FROM contest_problem cp LEFT JOIN problem p ON cp.problem_id=p.problem_id WHERE cp.contest_id=$1 ORDER BY cp.num",
      [cid]
    );
    const pidCnt = problemList.length;

    // Get all submissions for this contest
    const submissions = await query<any[]>(
      "SELECT s.user_id, u.nick, s.num, s.result, s.pass_rate, s.in_date, s.solution_id FROM solution s LEFT JOIN users u ON s.user_id=u.user_id WHERE s.contest_id=$1 AND s.problem_id>0 ORDER BY s.user_id, s.solution_id",
      [cid]
    );

    // Build OI ranking data
    // OI mode: users are ranked by total score (sum of pass_rate * 100 per problem)
    const userMap = new Map<string, {
      user_id: string;
      nick: string;
      scores: number[];
      problem_scores: { pass_rate: number; attempts: number; time?: number }[];
      solved: number;
      total: number;
    }>();

    for (const s of submissions) {
      if (!userMap.has(s.user_id)) {
        userMap.set(s.user_id, {
          user_id: s.user_id,
          nick: s.nick || s.user_id,
          scores: new Array(pidCnt).fill(0),
          problem_scores: new Array(pidCnt).fill(null).map(() => ({ pass_rate: 0, attempts: 0 })),
          solved: 0,
          total: 0,
        });
      }

      const u = userMap.get(s.user_id)!;
      const num = s.num;

      if (num < 0 || num >= pidCnt) continue;

      const ps = u.problem_scores[num];
      ps.attempts++;

      // In OI: take the highest pass_rate
      // AC (result=4): pass_rate = 1.0
      // Non-AC: take max pass_rate
      let passRate = s.result === 4 ? 1.0 : Math.max(0, parseFloat(s.pass_rate) || 0);

      // If the contest has total_100 mode, AC = 100, else AC = 1.0
      if (s.result === 4) {
        passRate = 1.0;
      }

      if (passRate > ps.pass_rate) {
        ps.pass_rate = passRate;
        if (s.result === 4) {
          ps.time = Math.floor((new Date(s.in_date).getTime() - startTime) / 1000);
        }
      }
    }

    // Calculate totals
    for (const u of userMap.values()) {
      for (let i = 0; i < pidCnt; i++) {
        const ps = u.problem_scores[i];
        const score = Math.round(ps.pass_rate * 100);
        u.scores[i] = score;
        u.total += score;
        if (ps.pass_rate >= 1.0) u.solved++;
      }
    }

    // Sort by total score DESC, then solved DESC, then last AC time
    const ranking = Array.from(userMap.values()).sort((a, b) => {
      if (a.total !== b.total) return b.total - a.total;
      if (a.solved !== b.solved) return b.solved - a.solved;
      return 0;
    });

    return NextResponse.json({
      contest,
      problems: problemList,
      ranking,
    });
  } catch (error) {
    console.error('OI Rank error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
