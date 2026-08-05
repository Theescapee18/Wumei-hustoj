import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';
import { finalizeAttempt } from '@/lib/examGrade';

// 我的成绩：已交卷的作答记录（coding 判题完成后自动刷新分数）
export async function GET(request: NextRequest) {
  const user = getUserFromCookies(request);
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  try {
    const rows = await query<any[]>(
      `SELECT a.attempt_id, a.paper_id, p.title AS paper_title, c.name AS category_name,
              a.mode, a.started_at, a.submitted_at, a.score, a.total_score,
              a.switch_count, a.auto_submitted, a.answers
       FROM exam_attempt a
       JOIN exam_paper p ON p.paper_id = a.paper_id
       LEFT JOIN exam_category c ON c.category_id = p.category_id
       WHERE a.user_id=$1 AND a.submitted_at IS NOT NULL
       ORDER BY a.submitted_at DESC
       LIMIT 100`,
      [user.userId]
    );

    // 有 coding 题且判题可能已完成的记录，刷新一遍分数
    const refreshed: any[] = [];
    for (const row of rows || []) {
      const hasCoding = Object.values(row.answers || {}).some((a: any) => typeof a?.solution_id === 'number');
      if (hasCoding) {
        try {
          const grade = await finalizeAttempt(row.attempt_id, false);
          row.score = grade.got;
          row.total_score = grade.total;
          row.pending = grade.pending;
        } catch { /* 保留原分数 */ }
      }
      const { answers: _answers, ...rest } = row;
      refreshed.push(rest);
    }

    return NextResponse.json({ scores: refreshed });
  } catch (error) {
    console.error('My scores error:', error);
    return NextResponse.json({ error: '获取成绩失败' }, { status: 500 });
  }
}
