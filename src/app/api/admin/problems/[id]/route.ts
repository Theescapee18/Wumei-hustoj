import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRight } from '@/lib/adminGuard';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRight(request, ['administrator', 'problem_editor']);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const problemId = parseInt(id);
  if (isNaN(problemId)) {
    return NextResponse.json({ error: '无效题目 ID' }, { status: 400 });
  }

  try {
    const data = await request.json();

    if (data.action === 'toggle_defunct') {
      const problem = await query<any[]>("SELECT defunct FROM problem WHERE problem_id=$1", [problemId]);
      if (!problem || problem.length === 0) {
        return NextResponse.json({ error: '题目不存在' }, { status: 404 });
      }
      const newStatus = problem[0].defunct === 'Y' ? 'N' : 'Y';
      await query("UPDATE problem SET defunct=$1 WHERE problem_id=$2", [newStatus, problemId]);
      return NextResponse.json({ success: true, defunct: newStatus });
    }

    if (data.action === 'update') {
      await query(
        "UPDATE problem SET title=$1, description=$2, input=$3, output=$4, sample_input=$5, sample_output=$6, hint=$7, source=$8, difficulty=$9 WHERE problem_id=$10",
        [data.title, data.description || '', data.input || '', data.output || '',
         data.sample_input || '', data.sample_output || '', data.hint || '', data.source || '',
         data.difficulty || 0, problemId]
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('Update problem error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
