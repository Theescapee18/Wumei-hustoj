import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRight } from '@/lib/adminGuard';

// 考试分类：列表 + 创建（管理员自定义）
export async function GET(request: NextRequest) {
  const guard = await requireRight(request, ['administrator']);
  if (!guard.ok) return guard.response;
  try {
    const rows = await query<any[]>(
      `SELECT c.category_id, c.name, c.description, c.created_at,
              COUNT(p.paper_id)::int AS paper_count
       FROM exam_category c
       LEFT JOIN exam_paper p ON p.category_id = c.category_id
       GROUP BY c.category_id
       ORDER BY c.category_id`
    );
    return NextResponse.json({ categories: rows || [] });
  } catch (error) {
    console.error('List exam categories error:', error);
    return NextResponse.json({ error: '获取分类失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireRight(request, ['administrator']);
  if (!guard.ok) return guard.response;
  try {
    const { name, description } = await request.json();
    const n = String(name || '').trim();
    if (!n) return NextResponse.json({ error: '分类名不能为空' }, { status: 400 });
    if (n.length > 100) return NextResponse.json({ error: '分类名过长' }, { status: 400 });
    const exists = await query<any[]>("SELECT 1 FROM exam_category WHERE name=$1", [n]);
    if (exists && exists.length > 0) {
      return NextResponse.json({ error: '分类已存在' }, { status: 400 });
    }
    const rows = await query<any[]>(
      "INSERT INTO exam_category(name, description) VALUES($1, $2) RETURNING category_id, name, description",
      [n, String(description || '').trim()]
    );
    return NextResponse.json({ message: '分类创建成功', category: rows[0] });
  } catch (error) {
    console.error('Create exam category error:', error);
    return NextResponse.json({ error: '创建分类失败' }, { status: 500 });
  }
}
