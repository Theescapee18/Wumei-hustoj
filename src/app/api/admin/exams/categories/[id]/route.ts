import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRight } from '@/lib/adminGuard';

// 删除考试分类（分类下试卷会保留，category_id 置空）
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRight(request, ['administrator']);
  if (!guard.ok) return guard.response;
  try {
    const { id } = await params;
    const cid = parseInt(id);
    if (!Number.isInteger(cid)) return NextResponse.json({ error: '参数错误' }, { status: 400 });
    await query("DELETE FROM exam_category WHERE category_id=$1", [cid]);
    return NextResponse.json({ message: '分类已删除' });
  } catch (error) {
    console.error('Delete exam category error:', error);
    return NextResponse.json({ error: '删除分类失败' }, { status: 500 });
  }
}
