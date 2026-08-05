import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  try {
    const contests = await query<any[]>(
      "SELECT contest_id, title, start_time, end_time, private, contest_type FROM contest WHERE defunct='N' ORDER BY contest_id DESC LIMIT $1 OFFSET $2",
      [pageSize, offset]
    );

    const countResult = await query<any[]>("SELECT COUNT(*) AS cnt FROM contest WHERE defunct='N'");
    const total = parseInt(countResult[0]?.cnt || '0');

    return NextResponse.json({ contests, total, page, pageSize });
  } catch (error) {
    console.error('Contest list error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
