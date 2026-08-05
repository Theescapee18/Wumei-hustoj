import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { pwGen, getUserFromCookies } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 权限检查
    const userId = getUserFromCookies(request)?.userId;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const privs = await query<any[]>(
      "SELECT 1 FROM privilege WHERE user_id=$1 AND (rightstr='administrator' OR rightstr='class_manager' OR rightstr='club_manager')",
      [userId]
    );
    if (!privs || privs.length === 0) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, password, nick, email, school, class_id, club_ids } = body;

    if (!user_id) {
      return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
    }

    const exists = await query<any[]>("SELECT user_id FROM users WHERE user_id=$1", [user_id]);
    if (exists && exists.length > 0) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 409 });
    }

    // 验证班级是否存在（如果提供了）
    if (class_id) {
      const classExists = await query<any[]>(
        "SELECT class_id, max_members FROM class WHERE class_id = $1 AND defunct = 'N'",
        [class_id]
      );
      if (!classExists || classExists.length === 0) {
        return NextResponse.json({ error: '班级不存在或已停用' }, { status: 400 });
      }

      // 检查班级是否已满
      const memberCount = await query<any[]>(
        "SELECT COUNT(*) AS cnt FROM class_member WHERE class_id = $1 AND status = 'Y'",
        [class_id]
      );
      if (parseInt(memberCount[0]?.cnt || '0') >= parseInt(classExists[0]?.max_members || '0')) {
        return NextResponse.json({ error: '班级成员已满' }, { status: 400 });
      }
    }

    // 验证社团是否存在（如果提供了）
    if (club_ids && Array.isArray(club_ids)) {
      for (const club_id of club_ids) {
        if (club_id) {
          const clubExists = await query<any[]>(
            "SELECT club_id, max_members FROM club WHERE club_id = $1 AND defunct = 'N'",
            [club_id]
          );
          if (!clubExists || clubExists.length === 0) {
            return NextResponse.json({ error: `社团ID ${club_id} 不存在或已停用` }, { status: 400 });
          }

          // 检查社团是否已满
          const memberCount = await query<any[]>(
            "SELECT COUNT(*) AS cnt FROM club_member WHERE club_id = $1 AND status = 'Y'",
            [club_id]
          );
          if (parseInt(memberCount[0]?.cnt || '0') >= parseInt(clubExists[0]?.max_members || '0')) {
            return NextResponse.json({ error: `社团ID ${club_id} 成员已满` }, { status: 400 });
          }
        }
      }
    }

    const hashedPw = password ? pwGen(password) : pwGen(user_id);

    // 创建用户
    await query(
      "INSERT INTO users(user_id, password, nick, email, school, class_id, reg_time, ip) VALUES($1, $2, $3, $4, $5, $6, NOW(), $7)",
      [user_id, hashedPw, nick || user_id, email || '', school || '', class_id || null, request.headers.get('x-forwarded-for') || '']
    );

    // 如果选择了班级，将用户加入班级
    if (class_id) {
      await query(
        `INSERT INTO class_member(class_id, user_id, role, status, join_time)
        VALUES($1, $2, 'student', 'Y', CURRENT_TIMESTAMP)`,
        [class_id, user_id]
      );
    }

    // 如果选择了社团，将用户加入社团
    if (club_ids && Array.isArray(club_ids)) {
      for (const club_id of club_ids) {
        if (club_id) {
          await query(
            `INSERT INTO club_member(club_id, user_id, role, status, join_time)
            VALUES($1, $2, 'member', 'Y', CURRENT_TIMESTAMP)
            ON CONFLICT (club_id, user_id) DO UPDATE SET status = 'Y'`,
            [club_id, user_id]
          );
        }
      }

      // 如果有多个社团，设置第一个为主社团
      if (club_ids.length > 0 && club_ids[0]) {
        await query(
          "UPDATE users SET primary_club_id = $1 WHERE user_id = $2",
          [club_ids[0], user_id]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: '用户创建成功',
      user_id: user_id,
      class_id: class_id,
      club_ids: club_ids
    }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

// GET /api/admin/users/add - 获取可用的班级和社团列表（用于下拉选择）
export async function GET(request: NextRequest) {
  try {
    // 权限检查
    const userId = getUserFromCookies(request)?.userId;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const privs = await query<any[]>(
      "SELECT 1 FROM privilege WHERE user_id=$1 AND (rightstr='administrator' OR rightstr='class_manager' OR rightstr='club_manager')",
      [userId]
    );
    if (!privs || privs.length === 0) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    // 获取所有活跃的班级
    const classes = await query<any[]>(
      `SELECT
        c.class_id,
        c.class_name,
        c.class_code,
        c.grade,
        c.department,
        c.max_members,
        COALESCE(COUNT(DISTINCT CASE WHEN cm.status = 'Y' THEN cm.user_id END), 0) AS current_members
      FROM class c
      LEFT JOIN class_member cm ON c.class_id = cm.class_id
      WHERE c.defunct = 'N'
      GROUP BY c.class_id, c.class_name, c.class_code, c.grade, c.department, c.max_members
      ORDER BY c.grade, c.department, c.class_name`,
      []
    );

    // 获取所有活跃的社团
    const clubs = await query<any[]>(
      `SELECT
        cl.club_id,
        cl.club_name,
        cl.club_code,
        cl.category,
        cl.description,
        cl.max_members,
        COALESCE(COUNT(DISTINCT CASE WHEN cm.status = 'Y' THEN cm.user_id END), 0) AS current_members
      FROM club cl
      LEFT JOIN club_member cm ON cl.club_id = cm.club_id
      WHERE cl.defunct = 'N'
      GROUP BY cl.club_id, cl.club_name, cl.club_code, cl.category, cl.description, cl.max_members
      ORDER BY cl.category, cl.club_name`,
      []
    );

    return NextResponse.json({
      classes: classes || [],
      clubs: clubs || []
    });
  } catch (error) {
    console.error('Get classes and clubs error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
