import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

// GET /api/classes/[id] - 获取班级详情和成员列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 权限检查 - 所有登录用户都可以查看班级详情
    const userId = getUserFromCookies(request)?.userId;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const classId = parseInt(id);
    if (isNaN(classId)) {
      return NextResponse.json({ error: '无效的班级ID' }, { status: 400 });
    }

    // 检查班级是否存在
    const classInfo = await query<any[]>(
      `SELECT
        c.class_id,
        c.class_name,
        c.class_code,
        c.head_teacher,
        u.nick AS head_teacher_name,
        c.grade,
        c.department,
        c.description,
        c.max_members,
        c.created_at,
        COALESCE(COUNT(DISTINCT CASE WHEN cm.status = 'Y' THEN cm.user_id END), 0) AS member_count
      FROM class c
      LEFT JOIN users u ON c.head_teacher = u.user_id
      LEFT JOIN class_member cm ON c.class_id = cm.class_id
      WHERE c.class_id = $1 AND c.defunct = 'N'
      GROUP BY c.class_id, c.class_name, c.class_code, c.head_teacher, u.nick, c.grade, c.department, c.description, c.max_members, c.created_at`,
      [classId]
    );

    if (!classInfo || classInfo.length === 0) {
      return NextResponse.json({ error: '班级不存在或已停用' }, { status: 404 });
    }

    // 检查用户是否属于该班级
    const isMember = await query<any[]>(
      `SELECT role, join_time FROM class_member
      WHERE class_id = $1 AND user_id = $2 AND status = 'Y'`,
      [classId, userId]
    );

    // 查询班级成员列表
    // 如果用户是该班级成员，可以查看完整成员列表
    // 如果用户不是该班级成员，只能查看基本信息
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
        FROM class_member cm
        INNER JOIN users u ON cm.user_id = u.user_id
        WHERE cm.class_id = $1 AND cm.status = 'Y'
        ORDER BY
          CASE cm.role
            WHEN 'teacher' THEN 1
            WHEN 'monitor' THEN 2
            WHEN 'vice_monitor' THEN 3
            ELSE 4
          END,
          cm.join_time ASC`,
        [classId]
      );
    }

    return NextResponse.json({
      class: classInfo[0],
      user_role: isMember[0]?.role || null,
      user_join_time: isMember[0]?.join_time || null,
      is_member: isMember && isMember.length > 0,
      members: members || []
    });
  } catch (error) {
    console.error('Get class detail error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}