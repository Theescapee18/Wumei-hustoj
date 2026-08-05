import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRight } from '@/lib/adminGuard';

export async function GET(request: NextRequest) {
  const guard = await requireRight(request, ['administrator', 'class_manager', 'club_manager']);
  if (!guard.ok) return guard.response;

  try {
    const users = await query<any[]>(
      "SELECT user_id, nick, email, school, reg_time, defunct FROM users ORDER BY reg_time DESC LIMIT 200"
    );
    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
