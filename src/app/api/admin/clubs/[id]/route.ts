import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

// GET /api/admin/clubs/[id] - 获取社团详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 权限检查
    const userId = getUserFromCookies(request)?.userId;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const privs = await query<any[]>(
      "SELECT 1 FROM privilege WHERE user_id=$1 AND (rightstr='administrator' OR rightstr='club_manager')",
      [userId]
    );
    if (!privs || privs.length === 0) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const clubId = parseInt(id);
    if (isNaN(clubId)) {
      return NextResponse.json({ error: '无效的社团ID' }, { status: 400 });
    }

    // 查询社团详情
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
        cl.defunct,
        cl.created_at,
        cl.updated_at,
        cl.created_by,
        ub.nick AS created_by_name,
        COALESCE(COUNT(DISTINCT CASE WHEN cm.status = 'Y' THEN cm.user_id END), 0) AS member_count
      FROM club cl
      LEFT JOIN users u ON cl.president = u.user_id
      LEFT JOIN users u2 ON cl.vice_president = u2.user_id
      LEFT JOIN users ub ON cl.created_by = ub.user_id
      LEFT JOIN club_member cm ON cl.club_id = cm.club_id
      WHERE cl.club_id = $1
      GROUP BY cl.club_id, cl.club_name, cl.club_code, cl.president, u.nick, cl.vice_president, u2.nick, cl.category, cl.description, cl.max_members, cl.defunct, cl.created_at, cl.updated_at, cl.created_by, ub.nick`,
      [clubId]
    );

    if (!clubInfo || clubInfo.length === 0) {
      return NextResponse.json({ error: '社团不存在' }, { status: 404 });
    }

    // 查询社团成员列表
    const members = await query<any[]>(
      `SELECT
        cm.user_id,
        u.nick,
        u.email,
        u.school,
        cm.role,
        cm.join_time,
        cm.status
      FROM club_member cm
      INNER JOIN users u ON cm.user_id = u.user_id
      WHERE cm.club_id = $1
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

    return NextResponse.json({
      club: clubInfo[0],
      members: members || []
    });
  } catch (error) {
    console.error('Get club detail error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// PUT /api/admin/clubs/[id] - 更新社团信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 权限检查
    const userId = getUserFromCookies(request)?.userId;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const privs = await query<any[]>(
      "SELECT 1 FROM privilege WHERE user_id=$1 AND (rightstr='administrator' OR rightstr='club_manager')",
      [userId]
    );
    if (!privs || privs.length === 0) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const clubId = parseInt(id);
    if (isNaN(clubId)) {
      return NextResponse.json({ error: '无效的社团ID' }, { status: 400 });
    }

    // 检查社团是否存在
    const clubExists = await query<any[]>(
      "SELECT club_id FROM club WHERE club_id = $1",
      [clubId]
    );
    if (!clubExists || clubExists.length === 0) {
      return NextResponse.json({ error: '社团不存在' }, { status: 404 });
    }

    const body = await request.json();
    const {
      club_name,
      club_code,
      president,
      vice_president,
      description,
      category,
      max_members,
      defunct
    } = body;

    // 检查社团名称是否与其他社团重复
    if (club_name) {
      const nameExists = await query<any[]>(
        "SELECT club_id FROM club WHERE club_name = $1 AND club_id != $2",
        [club_name, clubId]
      );
      if (nameExists && nameExists.length > 0) {
        return NextResponse.json({ error: '社团名称已存在' }, { status: 409 });
      }
    }

    // 检查社团代码是否与其他社团重复
    if (club_code) {
      const codeExists = await query<any[]>(
        "SELECT club_id FROM club WHERE club_code = $1 AND club_id != $2",
        [club_code, clubId]
      );
      if (codeExists && codeExists.length > 0) {
        return NextResponse.json({ error: '社团代码已存在' }, { status: 409 });
      }
    }

    // 验证社长是否存在（如果提供了）
    if (president) {
      const presidentExists = await query<any[]>(
        "SELECT user_id FROM users WHERE user_id = $1",
        [president]
      );
      if (!presidentExists || presidentExists.length === 0) {
        return NextResponse.json({ error: '社长用户不存在' }, { status: 400 });
      }
    }

    // 验证副社长是否存在（如果提供了）
    if (vice_president) {
      const viceExists = await query<any[]>(
        "SELECT user_id FROM users WHERE user_id = $1",
        [vice_president]
      );
      if (!viceExists || viceExists.length === 0) {
        return NextResponse.json({ error: '副社长用户不存在' }, { status: 400 });
      }
    }

    // 构建更新语句
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (club_name !== undefined) {
      updateFields.push(`club_name = $${paramIndex}`);
      updateValues.push(club_name);
      paramIndex++;
    }

    if (club_code !== undefined) {
      updateFields.push(`club_code = $${paramIndex}`);
      updateValues.push(club_code || null);
      paramIndex++;
    }

    if (president !== undefined) {
      updateFields.push(`president = $${paramIndex}`);
      updateValues.push(president || null);
      paramIndex++;
    }

    if (vice_president !== undefined) {
      updateFields.push(`vice_president = $${paramIndex}`);
      updateValues.push(vice_president || null);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }

    if (category !== undefined) {
      updateFields.push(`category = $${paramIndex}`);
      updateValues.push(category);
      paramIndex++;
    }

    if (max_members !== undefined) {
      updateFields.push(`max_members = $${paramIndex}`);
      updateValues.push(max_members);
      paramIndex++;
    }

    if (defunct !== undefined) {
      updateFields.push(`defunct = $${paramIndex}`);
      updateValues.push(defunct);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 });
    }

    updateValues.push(clubId);

    await query(
      `UPDATE club SET ${updateFields.join(', ')} WHERE club_id = $${paramIndex}`,
      updateValues
    );

    // 如果更新了社长，更新社团成员关系
    if (president !== undefined) {
      // 先移除旧的社长成员角色
      await query(
        "UPDATE club_member SET role = 'member' WHERE club_id = $1 AND role = 'president'",
        [clubId]
      );

      // 添加新社长
      if (president) {
        await query(
          `INSERT INTO club_member(club_id, user_id, role, status)
          VALUES($1, $2, 'president', 'Y')
          ON CONFLICT (club_id, user_id) DO UPDATE SET role = 'president', status = 'Y'`,
          [clubId, president]
        );
      }
    }

    // 如果更新了副社长，更新社团成员关系
    if (vice_president !== undefined) {
      // 先移除旧的副社长成员角色
      await query(
        "UPDATE club_member SET role = 'member' WHERE club_id = $1 AND role = 'vice_president'",
        [clubId]
      );

      // 添加新副社长
      if (vice_president) {
        await query(
          `INSERT INTO club_member(club_id, user_id, role, status)
          VALUES($1, $2, 'vice_president', 'Y')
          ON CONFLICT (club_id, user_id) DO UPDATE SET role = 'vice_president', status = 'Y'`,
          [clubId, vice_president]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: '社团信息更新成功'
    });
  } catch (error) {
    console.error('Update club error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// DELETE /api/admin/clubs/[id] - 删除社团
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 权限检查
    const userId = getUserFromCookies(request)?.userId;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const privs = await query<any[]>(
      "SELECT 1 FROM privilege WHERE user_id=$1 AND rightstr='administrator'",
      [userId]
    );
    if (!privs || privs.length === 0) {
      return NextResponse.json({ error: '无权限，仅管理员可以删除社团' }, { status: 403 });
    }

    const { id } = await params;
    const clubId = parseInt(id);
    if (isNaN(clubId)) {
      return NextResponse.json({ error: '无效的社团ID' }, { status: 400 });
    }

    // 检查社团是否存在
    const clubInfo = await query<any[]>(
      "SELECT club_id, club_name FROM club WHERE club_id = $1",
      [clubId]
    );
    if (!clubInfo || clubInfo.length === 0) {
      return NextResponse.json({ error: '社团不存在' }, { status: 404 });
    }

    // 检查社团是否还有成员
    const memberCount = await query<any[]>(
      "SELECT COUNT(*) AS cnt FROM club_member WHERE club_id = $1 AND status = 'Y'",
      [clubId]
    );
    if (parseInt(memberCount[0]?.cnt || '0') > 0) {
      return NextResponse.json({
        error: '社团还有成员，请先移除所有成员或使用停用功能'
      }, { status: 400 });
    }

    // 删除社团（级联删除成员记录）
    await query("DELETE FROM club WHERE club_id = $1", [clubId]);

    return NextResponse.json({
      success: true,
      message: '社团删除成功'
    });
  } catch (error) {
    console.error('Delete club error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}