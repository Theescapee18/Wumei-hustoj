import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { pwGen } from '@/lib/auth';
import { requireRight } from '@/lib/adminGuard';

export async function POST(request: NextRequest) {
  const guard = await requireRight(request);
  if (!guard.ok) return guard.response;

  try {
    const { user_id, new_password } = await request.json();
    if (!user_id || !new_password) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }
    if (String(new_password).length < 6) {
      return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 });
    }

    const exists = await query<any[]>("SELECT 1 FROM users WHERE user_id=$1", [user_id]);
    if (!exists || exists.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const hashedPw = pwGen(new_password);
    await query("UPDATE users SET password=$1 WHERE user_id=$2", [hashedPw, user_id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '修改失败' }, { status: 500 });
  }
}
