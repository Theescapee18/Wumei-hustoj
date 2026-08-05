import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRight } from '@/lib/adminGuard';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRight(request, ['administrator', 'knowledge_editor']);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  try {
    const { title, content } = await request.json();
    await query("UPDATE news SET title=$1, content=$2 WHERE news_id=$3", [title, content, parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
