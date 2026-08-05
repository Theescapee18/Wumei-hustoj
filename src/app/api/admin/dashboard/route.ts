import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRight } from '@/lib/adminGuard';

export async function GET(request: NextRequest) {
  const guard = await requireRight(request, [
    'administrator', 'problem_editor', 'contest_creator', 'class_manager', 'club_manager',
  ]);
  if (!guard.ok) return guard.response;

  try {
    const [userCount, problemCount, submitCount, acCount, recentSubmits] = await Promise.all([
      query<any[]>("SELECT COUNT(*) AS cnt FROM users"),
      query<any[]>("SELECT COUNT(*) AS cnt FROM problem WHERE defunct='N'"),
      query<any[]>("SELECT COUNT(*) AS cnt FROM solution"),
      query<any[]>("SELECT COUNT(*) AS cnt FROM solution WHERE result=4"),
      query<any[]>(
        "SELECT TO_CHAR(in_date, 'YYYY-MM-DD') AS date, COUNT(*) AS cnt FROM solution WHERE in_date >= NOW() - INTERVAL '7 days' GROUP BY date ORDER BY date"
      ),
    ]);

    return NextResponse.json({
      userCount: parseInt(userCount[0]?.cnt || '0'),
      problemCount: parseInt(problemCount[0]?.cnt || '0'),
      submitCount: parseInt(submitCount[0]?.cnt || '0'),
      acCount: parseInt(acCount[0]?.cnt || '0'),
      recentSubmits: recentSubmits || [],
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
