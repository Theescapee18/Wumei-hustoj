import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRight } from '@/lib/adminGuard';

export async function POST(request: NextRequest) {
  const guard = await requireRight(request, ['administrator', 'knowledge_editor']);
  if (!guard.ok) return guard.response;

  try {
    const { title, content } = await request.json();
    if (!title) return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
    await query(
      "INSERT INTO news(user_id, title, content, in_date, importance, defunct) VALUES($1, $2, $3, CURRENT_TIMESTAMP, 1, 'N')",
      [guard.userId, title, content || '']
    );
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '发布失败' }, { status: 500 });
  }
}
