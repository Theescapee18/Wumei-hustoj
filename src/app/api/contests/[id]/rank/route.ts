import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contestId = parseInt(id);

  try {
    // ACM 模式排名: 按 solved 数降序, penalty 升序
    const sql = [
      'SELECT u.user_id, u.nick,',
      '  SUM(CASE WHEN s.result=4 THEN 1 ELSE 0 END) AS solved,',
      '  SUM(CASE WHEN s.result=4 THEN EXTRACT(EPOCH FROM (s.in_date - c.start_time)) ELSE 0 END) AS penalty,',
      '  COUNT(s.solution_id) AS attempts',
      'FROM solution s',
      'JOIN users u ON s.user_id=u.user_id',
      'JOIN contest c ON c.contest_id=$1',
      'WHERE s.contest_id=$2',
      'GROUP BY s.user_id',
      'ORDER BY solved DESC, penalty ASC',
      'LIMIT 300',
    ].join(' ');

    const rankings = await query<any[]>(sql, [contestId, contestId]);

    return NextResponse.json({ rankings: rankings || [] });
  } catch (error) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
