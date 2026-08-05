import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const users = await query<any[]>(
      "SELECT u.user_id, u.nick, u.email, u.school, u.solved, u.submit, u.reg_time, u.accesstime FROM users u WHERE u.user_id=$1",
      [id]
    );

    if (!users || users.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = users[0];

    // 最近的提交
    const submissions = await query<any[]>(
      "SELECT s.solution_id, s.problem_id, p.title, s.result, s.time, s.memory, s.in_date FROM solution s LEFT JOIN problem p ON s.problem_id=p.problem_id WHERE s.user_id=$1 ORDER BY s.solution_id DESC LIMIT 20",
      [id]
    );

    return NextResponse.json({ ...user, submissions });
  } catch (error) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
