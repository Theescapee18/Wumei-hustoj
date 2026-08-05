import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const solutionId = parseInt(id);

  if (isNaN(solutionId)) {
    return NextResponse.json({ error: '无效的提交ID' }, { status: 400 });
  }

  try {
    const solutions = await query<any[]>(
      "SELECT s.solution_id, s.problem_id, p.title, s.user_id, s.result, s.time, s.memory, s.in_date, s.language, s.code_length, s.pass_rate, s.judger FROM solution s LEFT JOIN problem p ON s.problem_id=p.problem_id WHERE s.solution_id=$1",
      [solutionId]
    );

    if (!solutions || solutions.length === 0) {
      return NextResponse.json({ error: '提交记录不存在' }, { status: 404 });
    }

    const solution = solutions[0];

    // 获取代码
    const sources = await query<any[]>(
      "SELECT source FROM source_code WHERE solution_id=$1",
      [solutionId]
    );
    solution.source = sources[0]?.source || '';

    // 获取判题详情（运行错误 / 编译错误）
    try {
      const runtimes = await query<any[]>(
        "SELECT * FROM runtimeinfo WHERE solution_id=$1",
        [solutionId]
      );
      if (runtimes && runtimes.length > 0) {
        solution.runtimeinfo = runtimes[0].error;
      }
    } catch { /* runtimeinfo table may not exist */ }

    try {
      const compiles = await query<any[]>(
        "SELECT * FROM compileinfo WHERE solution_id=$1",
        [solutionId]
      );
      if (compiles && compiles.length > 0) {
        solution.compileinfo = compiles[0].error;
      }
    } catch { /* compileinfo table may not exist */ }

    return NextResponse.json(solution);
  } catch (error) {
    console.error('Solution detail error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
