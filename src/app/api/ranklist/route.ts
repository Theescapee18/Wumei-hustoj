import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = 100;
  const offset = (page - 1) * pageSize;

  try {
    const users = await query<any[]>(
      "SELECT user_id, nick, solved, submit, school, accesstime FROM users WHERE defunct='N' AND solved>0 ORDER BY solved DESC, submit ASC LIMIT $1 OFFSET $2",
      [pageSize, offset]
    );

    const countResult = await query<any[]>(
      "SELECT COUNT(*) AS cnt FROM users WHERE defunct='N' AND solved>0"
    );
    const total = parseInt(countResult[0]?.cnt || '0');

    // 每个用户的排名
    const rankedUsers = users.map((u: any, i: number) => ({
      rank: offset + i + 1,
      ...u,
      acRate: u.submit > 0 ? ((u.solved / u.submit) * 100).toFixed(1) : '0.0',
    }));

    return NextResponse.json({ users: rankedUsers, total, page, pageSize });
  } catch (error) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
