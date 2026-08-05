import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRight } from '@/lib/adminGuard';

export async function GET(request: NextRequest) {
  const guard = await requireRight(request, ['administrator', 'problem_editor']);
  if (!guard.ok) return guard.response;

  try {
    const problems = await query<any[]>(
      "SELECT problem_id, title, accepted, submit, difficulty, defunct FROM problem ORDER BY problem_id DESC LIMIT 200"
    );
    return NextResponse.json({ problems: problems || [] });
  } catch (error) {
    console.error('Get problems error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireRight(request, ['administrator', 'problem_editor']);
  if (!guard.ok) return guard.response;

  try {
    const data = await request.json();
    if (!data.title) return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
    const result = await query<any>(
      "INSERT INTO problem(title, description, input, output, sample_input, sample_output, hint, source, difficulty) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING problem_id",
      [data.title, data.description || '', data.input || '', data.output || '', data.sample_input || '', data.sample_output || '', data.hint || '', data.source || '', data.difficulty || 0]
    );
    const problemId = result[0].problem_id;
    return NextResponse.json({ problem_id: problemId }, { status: 201 });
  } catch (error) {
    console.error('Create problem error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
