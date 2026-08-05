import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

// 开始作答：mode = practice（自由练习，可反复）| exam（模拟考试，倒计时）
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromCookies(request);
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  try {
    const { id } = await params;
    const pid = parseInt(id);
    const body = await request.json().catch(() => ({}));
    const mode = body?.mode === 'exam' ? 'exam' : 'practice';

    const papers = await query<any[]>(
      "SELECT paper_id, duration_minutes FROM exam_paper WHERE paper_id=$1 AND defunct='N'", [pid]);
    if (!papers || papers.length === 0) {
      return NextResponse.json({ error: '考试不存在或已下架' }, { status: 404 });
    }

    // 有未交卷的同模式作答则继续（考试模式防止刷新重开重置倒计时）
    const existing = await query<any[]>(
      `SELECT attempt_id FROM exam_attempt
       WHERE paper_id=$1 AND user_id=$2 AND mode=$3 AND submitted_at IS NULL
       ORDER BY attempt_id DESC LIMIT 1`,
      [pid, user.userId, mode]
    );
    if (existing && existing.length > 0) {
      return NextResponse.json({ attempt_id: existing[0].attempt_id, resumed: true });
    }

    const duration = papers[0].duration_minutes;
    const rows = await query<any[]>(
      mode === 'exam'
        ? `INSERT INTO exam_attempt(paper_id, user_id, mode, deadline)
           VALUES($1, $2, $3, NOW() + ($4 || ' minutes')::interval) RETURNING attempt_id`
        : `INSERT INTO exam_attempt(paper_id, user_id, mode) VALUES($1, $2, $3) RETURNING attempt_id`,
      mode === 'exam' ? [pid, user.userId, mode, String(duration)] : [pid, user.userId, mode]
    );
    return NextResponse.json({ attempt_id: rows[0].attempt_id, resumed: false });
  } catch (error) {
    console.error('Start exam error:', error);
    return NextResponse.json({ error: '开始考试失败' }, { status: 500 });
  }
}
