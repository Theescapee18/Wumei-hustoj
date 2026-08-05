import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const problemId = parseInt(id);

  if (isNaN(problemId)) {
    return NextResponse.json({ error: '无效的题目ID' }, { status: 400 });
  }

  try {
    const problems = await query<any[]>(
      "SELECT problem_id, title, description, input, output, sample_input, sample_output, hint, source, accepted, submit, difficulty, spj, time_limit, memory_limit FROM problem WHERE problem_id=$1 AND defunct='N'",
      [problemId]
    );

    if (!problems || problems.length === 0) {
      return NextResponse.json({ error: '题目不存在' }, { status: 404 });
    }

    return NextResponse.json(problems[0]);
  } catch (error) {
    console.error('Problem detail error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
