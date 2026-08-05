import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const news = await query<any[]>(
      "SELECT news_id, title, content, in_date AS time, importance FROM news WHERE defunct='N' ORDER BY importance DESC, news_id DESC LIMIT 10"
    );

    const stats = await query<any[]>(
      "SELECT (SELECT COUNT(*) FROM users) AS user_count, (SELECT COUNT(*) FROM problem WHERE defunct='N') AS problem_count, (SELECT COUNT(*) FROM solution) AS submit_count, (SELECT COUNT(*) FROM solution WHERE result=4) AS ac_count"
    );

    return NextResponse.json({ news, stats: stats[0] || {} });
  } catch (error) {
    console.error('News list error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
