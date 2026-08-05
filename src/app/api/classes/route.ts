import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

// GET /api/classes - 获取用户所属的所有班级
export async function GET(request: NextRequest) {
  try {
    // 权限检查 - 所有登录用户都可以查看自己的班级
    const userId = getUserFromCookies(request)?.userId;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 使用数据库函数获取用户所属的所有班级
    const classes = await query<any[]>(
      `SELECT * FROM get_user_classes($1)`,
      [userId]
    );

    // 如果函数不存在，使用备用查询
    if (!classes || classes.length === 0) {
      const alternativeClasses = await query<any[]>(
        `SELECT
          c.class_id,
          c.class_name,
          c.class_code,
          c.grade,
          c.department,
          c.description,
          cm.role,
          cm.join_time,
          c.head_teacher,
          u.nick AS head_teacher_name,
          COALESCE(COUNT(DISTINCT cm2.user_id), 0) AS member_count
        FROM class_member cm
        INNER JOIN class c ON cm.class_id = c.class_id
        LEFT JOIN users u ON c.head_teacher = u.user_id
        LEFT JOIN class_member cm2 ON c.class_id = cm2.class_id AND cm2.status = 'Y'
        WHERE cm.user_id = $1 AND cm.status = 'Y'
        GROUP BY c.class_id, c.class_name, c.class_code, c.grade, c.department, c.description, cm.role, cm.join_time, c.head_teacher, u.nick
        ORDER BY cm.join_time DESC`,
        [userId]
      );

      return NextResponse.json({
        classes: alternativeClasses || []
      });
    }

    return NextResponse.json({
      classes: classes || []
    });
  } catch (error) {
    console.error('Get user classes error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}