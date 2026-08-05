import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRight } from '@/lib/adminGuard';

// 试卷详情（含题目和答案，供管理端查看）
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRight(request, ['administrator']);
  if (!guard.ok) return guard.response;
  try {
    const { id } = await params;
    const pid = parseInt(id);
    const papers = await query<any[]>(
      `SELECT p.*, c.name AS category_name FROM exam_paper p
       LEFT JOIN exam_category c ON c.category_id = p.category_id
       WHERE p.paper_id=$1`, [pid]);
    if (!papers || papers.length === 0) {
      return NextResponse.json({ error: '试卷不存在' }, { status: 404 });
    }
    const questions = await query<any[]>(
      "SELECT * FROM exam_question WHERE paper_id=$1 ORDER BY question_order", [pid]);
    return NextResponse.json({ paper: papers[0], questions: questions || [] });
  } catch (error) {
    console.error('Get exam paper error:', error);
    return NextResponse.json({ error: '获取试卷失败' }, { status: 500 });
  }
}

// 更新试卷（时长/分类/上下架/标题）
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRight(request, ['administrator']);
  if (!guard.ok) return guard.response;
  try {
    const { id } = await params;
    const pid = parseInt(id);
    const body = await request.json();
    const papers = await query<any[]>("SELECT paper_id FROM exam_paper WHERE paper_id=$1", [pid]);
    if (!papers || papers.length === 0) {
      return NextResponse.json({ error: '试卷不存在' }, { status: 404 });
    }
    if (body.toggle_defunct) {
      await query("UPDATE exam_paper SET defunct = CASE WHEN defunct='Y' THEN 'N' ELSE 'Y' END WHERE paper_id=$1", [pid]);
      return NextResponse.json({ message: '状态已切换' });
    }
    const sets: string[] = [];
    const vals: any[] = [];
    let n = 1;
    if (body.title !== undefined) { sets.push(`title=$${n++}`); vals.push(String(body.title).trim()); }
    if (body.duration_minutes !== undefined) {
      const d = parseInt(body.duration_minutes);
      if (!d || d < 1) return NextResponse.json({ error: '考试时长无效' }, { status: 400 });
      sets.push(`duration_minutes=$${n++}`); vals.push(d);
    }
    if (body.category_id !== undefined) {
      const cid = body.category_id === null || body.category_id === '' ? null : parseInt(body.category_id);
      sets.push(`category_id=$${n++}`); vals.push(cid);
    }
    if (sets.length === 0) return NextResponse.json({ error: '无更新内容' }, { status: 400 });
    vals.push(pid);
    await query(`UPDATE exam_paper SET ${sets.join(', ')} WHERE paper_id=$${n}`, vals);
    return NextResponse.json({ message: '试卷已更新' });
  } catch (error) {
    console.error('Update exam paper error:', error);
    return NextResponse.json({ error: '更新试卷失败' }, { status: 500 });
  }
}

// 删除试卷（级联删除题目与作答记录）
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRight(request, ['administrator']);
  if (!guard.ok) return guard.response;
  try {
    const { id } = await params;
    const pid = parseInt(id);
    await query("DELETE FROM exam_paper WHERE paper_id=$1", [pid]);
    return NextResponse.json({ message: '试卷已删除' });
  } catch (error) {
    console.error('Delete exam paper error:', error);
    return NextResponse.json({ error: '删除试卷失败' }, { status: 500 });
  }
}
