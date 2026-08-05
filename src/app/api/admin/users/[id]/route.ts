import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRight } from '@/lib/adminGuard';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRight(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (id === guard.userId) {
    return NextResponse.json({ error: '不能停用自己的账号' }, { status: 400 });
  }

  try {
    const body = await request.json();

    if (body.action === 'toggle_defunct') {
      const user = await query<any[]>("SELECT defunct FROM users WHERE user_id=$1", [id]);
      if (!user || user.length === 0) {
        return NextResponse.json({ error: '用户不存在' }, { status: 404 });
      }
      const newStatus = user[0].defunct === 'Y' ? 'N' : 'Y';
      await query("UPDATE users SET defunct=$1 WHERE user_id=$2", [newStatus, id]);
      return NextResponse.json({ success: true, defunct: newStatus });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
