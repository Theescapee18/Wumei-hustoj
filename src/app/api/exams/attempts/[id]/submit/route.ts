import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';
import { finalizeAttempt } from '@/lib/examGrade';

// 主动交卷（考试/练习通用）
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromCookies(request);
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  try {
    const { id } = await params;
    const attemptId = parseInt(id);
    const rows = await query<any[]>(
      "SELECT attempt_id, submitted_at FROM exam_attempt WHERE attempt_id=$1 AND user_id=$2",
      [attemptId, user.userId]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: '作答记录不存在' }, { status: 404 });
    }
    if (rows[0].submitted_at) {
      return NextResponse.json({ error: '已交卷，请勿重复提交' }, { status: 400 });
    }
    const grade = await finalizeAttempt(attemptId, false);
    return NextResponse.json({
      message: grade.pending ? '已交卷，算法题判题中，成绩稍后更新' : '交卷成功',
      score: grade.got,
      total: grade.total,
      pending: grade.pending,
    });
  } catch (error) {
    console.error('Submit attempt error:', error);
    return NextResponse.json({ error: '交卷失败' }, { status: 500 });
  }
}
