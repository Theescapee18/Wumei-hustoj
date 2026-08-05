import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  try {
    const problems = await query<any[]>(
      "SELECT problem_id, title, accepted, submit, difficulty FROM problem WHERE defunct='N' AND problem_id>0 ORDER BY problem_id ASC LIMIT $1 OFFSET $2",
      [pageSize, offset]
    );

    const countResult = await query<any[]>(
      "SELECT COUNT(*) AS cnt FROM problem WHERE defunct='N' AND problem_id>0"
    );
    const total = parseInt(countResult[0]?.cnt || '0');

    return NextResponse.json({
      problems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Problem list error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
