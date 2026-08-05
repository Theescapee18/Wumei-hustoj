import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

// GET /api/clubs/[id] - 获取社团详情和成员列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 权限检查 - 所有登录用户都可以查看社团详情
    const userId = getUserFromCookies(request)?.userId;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const clubId = parseInt(id);
    if (isNaN(clubId)) {
      return NextResponse.json({ error: '无效的社团ID' }, { status: 400 });
    }

    // 检查社团是否存在
    const clubInfo = await query<any[]>(
      `SELECT
        cl.club_id,
        cl.club_name,
        cl.club_code,
        cl.president,
        u.nick AS president_name,
        cl.vice_president,
        u2.nick AS vice_president_name,
        cl.category,
        cl.description,
        cl.max_members,
        cl.created_at,
        COALESCE(COUNT(DISTINCT CASE WHEN cm.status = 'Y' THEN cm.user_id END), 0) AS member_count
      FROM club cl
      LEFT JOIN users u ON cl.president = u.user_id
      LEFT JOIN users u2 ON cl.vice_president = u2.user_id
      LEFT JOIN club_member cm ON cl.club_id = cm.club_id
      WHERE cl.club_id = $1 AND cl.defunct = 'N'
      GROUP BY cl.club_id, cl.club_name, cl.club_code, cl.president, u.nick, cl.vice_president, u2.nick, cl.category, cl.description, cl.max_members, cl.created_at`,
      [clubId]
    );

    if (!clubInfo || clubInfo.length === 0) {
      return NextResponse.json({ error: '社团不存在或已停用' }, { status: 404 });
    }

    // 检查用户是否属于该社团
    const isMember = await query<any[]>(
      `SELECT role, join_time FROM club_member
      WHERE club_id = $1 AND user_id = $2 AND status = 'Y'`,
      [clubId, userId]
    );

    // 查询社团成员列表
    // 如果用户是该社团成员，可以查看完整成员列表
    // 如果用户不是该社团成员，只能查看基本信息
    let members: any[] = [];
    if (isMember && isMember.length > 0) {
      members = await query<any[]>(
        `SELECT
          cm.user_id,
          u.nick,
          u.email,
          u.school,
          cm.role,
          cm.join_time
        FROM club_member cm
        INNER JOIN users u ON cm.user_id = u.user_id
        WHERE cm.club_id = $1 AND cm.status = 'Y'
        ORDER BY
          CASE cm.role
            WHEN 'president' THEN 1
            WHEN 'vice_president' THEN 2
            WHEN 'manager' THEN 3
            ELSE 4
          END,
          cm.join_time ASC`,
        [clubId]
      );
    }

    return NextResponse.json({
      club: clubInfo[0],
      user_role: isMember[0]?.role || null,
      user_join_time: isMember[0]?.join_time || null,
      is_member: isMember && isMember.length > 0,
      members: members || []
    });
  } catch (error) {
    console.error('Get club detail error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}