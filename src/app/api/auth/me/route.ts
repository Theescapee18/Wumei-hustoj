import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: '登录已过期' }, { status: 401 });
  }

  try {
    const users = await query<any[]>(
      "SELECT user_id, nick, email, school FROM users WHERE user_id=$1",
      [payload.userId]
    );

    if (!users || users.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = users[0];
    return NextResponse.json({
      userId: user.user_id,
      user_id: user.user_id,
      nick: user.nick,
      email: user.email,
      school: user.school,
      role: payload.role,
    });
  } catch (error) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
