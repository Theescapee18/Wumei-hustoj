import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';
import { finalizeAttempt } from '@/lib/examGrade';

const MAX_SWITCHES = 3; // 考试模式允许的最大切屏次数，超过自动交卷

// 切屏上报（仅考试模式生效）
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromCookies(request);
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  try {
    const { id } = await params;
    const attemptId = parseInt(id);
    const rows = await query<any[]>(
      "SELECT attempt_id, mode, submitted_at, switch_count FROM exam_attempt WHERE attempt_id=$1 AND user_id=$2",
      [attemptId, user.userId]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: '作答记录不存在' }, { status: 404 });
    }
    const attempt = rows[0];
    if (attempt.submitted_at) {
      return NextResponse.json({ switch_count: attempt.switch_count, auto_submitted: true });
    }
    if (attempt.mode !== 'exam') {
      // 练习模式不计切屏
      return NextResponse.json({ switch_count: 0, auto_submitted: false });
    }

    const updated = await query<any[]>(
      "UPDATE exam_attempt SET switch_count = switch_count + 1 WHERE attempt_id=$1 RETURNING switch_count",
      [attemptId]
    );
    const count = Number(updated[0].switch_count);

    if (count > MAX_SWITCHES) {
      await finalizeAttempt(attemptId, true);
      return NextResponse.json({
        switch_count: count,
        auto_submitted: true,
        message: `切屏超过 ${MAX_SWITCHES} 次，已自动交卷`,
      });
    }
    return NextResponse.json({
      switch_count: count,
      auto_submitted: false,
      remaining: MAX_SWITCHES - count + 1,
      message: `警告：检测到切屏（第 ${count} 次），超过 ${MAX_SWITCHES} 次将自动交卷`,
    });
  } catch (error) {
    console.error('Report switch error:', error);
    return NextResponse.json({ error: '上报失败' }, { status: 500 });
  }
}
