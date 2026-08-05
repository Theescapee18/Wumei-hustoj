import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRight } from '@/lib/adminGuard';

export async function GET(request: NextRequest) {
  const guard = await requireRight(request);
  if (!guard.ok) return guard.response;

  try {
    const privileges = await query<any[]>(
      "SELECT p.user_id, p.rightstr, u.nick FROM privilege p LEFT JOIN users u ON p.user_id=u.user_id ORDER BY p.rightstr, p.user_id"
    );
    return NextResponse.json({ privileges: privileges || [] });
  } catch (error) {
    console.error('Get privileges error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireRight(request);
  if (!guard.ok) return guard.response;

  try {
    const { user_id, rightstr } = await request.json();
    if (!user_id || !rightstr) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    const exists = await query<any[]>(
      "SELECT * FROM privilege WHERE user_id=$1 AND rightstr=$2",
      [user_id, rightstr]
    );
    if (exists && exists.length > 0) {
      return NextResponse.json({ error: '该权限已存在' }, { status: 409 });
    }

    await query(
      "INSERT INTO privilege(user_id, rightstr) VALUES($1, $2)",
      [user_id, rightstr]
    );
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Add privilege error:', error);
    return NextResponse.json({ error: '添加失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requireRight(request);
  if (!guard.ok) return guard.response;

  try {
    const { user_id, rightstr } = await request.json();
    if (user_id === guard.userId && rightstr === 'administrator') {
      return NextResponse.json({ error: '不能移除自己的管理员权限' }, { status: 400 });
    }
    await query(
      "DELETE FROM privilege WHERE user_id=$1 AND rightstr=$2",
      [user_id, rightstr]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete privilege error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
