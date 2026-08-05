import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

// GET /api/clubs - 获取用户所属的所有社团
export async function GET(request: NextRequest) {
  try {
    // 权限检查 - 所有登录用户都可以查看自己的社团
    const userId = getUserFromCookies(request)?.userId;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 使用数据库函数获取用户所属的所有社团
    const clubs = await query<any[]>(
      `SELECT * FROM get_user_clubs($1)`,
      [userId]
    );

    // 如果函数不存在，使用备用查询
    if (!clubs || clubs.length === 0) {
      const alternativeClubs = await query<any[]>(
        `SELECT
          cl.club_id,
          cl.club_name,
          cl.club_code,
          cl.category,
          cl.description,
          cm.role,
          cm.join_time,
          cl.president,
          u.nick AS president_name,
          cl.vice_president,
          u2.nick AS vice_president_name,
          COALESCE(COUNT(DISTINCT cm2.user_id), 0) AS member_count
        FROM club_member cm
        INNER JOIN club cl ON cm.club_id = cl.club_id
        LEFT JOIN users u ON cl.president = u.user_id
        LEFT JOIN users u2 ON cl.vice_president = u2.user_id
        LEFT JOIN club_member cm2 ON cl.club_id = cm2.club_id AND cm2.status = 'Y'
        WHERE cm.user_id = $1 AND cm.status = 'Y'
        GROUP BY cl.club_id, cl.club_name, cl.club_code, cl.category, cl.description, cm.role, cm.join_time, cl.president, u.nick, cl.vice_president, u2.nick
        ORDER BY cm.join_time DESC`,
        [userId]
      );

      return NextResponse.json({
        clubs: alternativeClubs || []
      });
    }

    return NextResponse.json({
      clubs: clubs || []
    });
  } catch (error) {
    console.error('Get user clubs error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}