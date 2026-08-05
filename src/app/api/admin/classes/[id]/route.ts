import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

// GET /api/admin/classes/[id] - 获取班级详情
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
      "SELECT 1 FROM privilege WHERE user_id=$1 AND (rightstr='administrator' OR rightstr='class_manager')",
      [userId]
    );
    if (!privs || privs.length === 0) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const classId = parseInt(id);
    if (isNaN(classId)) {
      return NextResponse.json({ error: '无效的班级ID' }, { status: 400 });
    }

    // 查询班级详情
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
        c.defunct,
        c.created_at,
        c.updated_at,
        c.created_by,
        ub.nick AS created_by_name,
        COALESCE(COUNT(DISTINCT CASE WHEN cm.status = 'Y' THEN cm.user_id END), 0) AS member_count
      FROM class c
      LEFT JOIN users u ON c.head_teacher = u.user_id
      LEFT JOIN users ub ON c.created_by = ub.user_id
      LEFT JOIN class_member cm ON c.class_id = cm.class_id
      WHERE c.class_id = $1
      GROUP BY c.class_id, c.class_name, c.class_code, c.head_teacher, u.nick, c.grade, c.department, c.description, c.max_members, c.defunct, c.created_at, c.updated_at, c.created_by, ub.nick`,
      [classId]
    );

    if (!classInfo || classInfo.length === 0) {
      return NextResponse.json({ error: '班级不存在' }, { status: 404 });
    }

    // 查询班级成员列表
    const members = await query<any[]>(
      `SELECT
        cm.user_id,
        u.nick,
        u.email,
        u.school,
        cm.role,
        cm.join_time,
        cm.status
      FROM class_member cm
      INNER JOIN users u ON cm.user_id = u.user_id
      WHERE cm.class_id = $1
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

    return NextResponse.json({
      class: classInfo[0],
      members: members || []
    });
  } catch (error) {
    console.error('Get class detail error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// PUT /api/admin/classes/[id] - 更新班级信息
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
      "SELECT 1 FROM privilege WHERE user_id=$1 AND (rightstr='administrator' OR rightstr='class_manager')",
      [userId]
    );
    if (!privs || privs.length === 0) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const classId = parseInt(id);
    if (isNaN(classId)) {
      return NextResponse.json({ error: '无效的班级ID' }, { status: 400 });
    }

    // 检查班级是否存在
    const classExists = await query<any[]>(
      "SELECT class_id FROM class WHERE class_id = $1",
      [classId]
    );
    if (!classExists || classExists.length === 0) {
      return NextResponse.json({ error: '班级不存在' }, { status: 404 });
    }

    const body = await request.json();
    const {
      class_name,
      class_code,
      head_teacher,
      description,
      grade,
      department,
      max_members,
      defunct
    } = body;

    // 检查班级名称是否与其他班级重复
    if (class_name) {
      const nameExists = await query<any[]>(
        "SELECT class_id FROM class WHERE class_name = $1 AND class_id != $2",
        [class_name, classId]
      );
      if (nameExists && nameExists.length > 0) {
        return NextResponse.json({ error: '班级名称已存在' }, { status: 409 });
      }
    }

    // 检查班级代码是否与其他班级重复
    if (class_code) {
      const codeExists = await query<any[]>(
        "SELECT class_id FROM class WHERE class_code = $1 AND class_id != $2",
        [class_code, classId]
      );
      if (codeExists && codeExists.length > 0) {
        return NextResponse.json({ error: '班级代码已存在' }, { status: 409 });
      }
    }

    // 验证班主任是否存在（如果提供了）
    if (head_teacher) {
      const teacherExists = await query<any[]>(
        "SELECT user_id FROM users WHERE user_id = $1",
        [head_teacher]
      );
      if (!teacherExists || teacherExists.length === 0) {
        return NextResponse.json({ error: '班主任用户不存在' }, { status: 400 });
      }
    }

    // 构建更新语句
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (class_name !== undefined) {
      updateFields.push(`class_name = $${paramIndex}`);
      updateValues.push(class_name);
      paramIndex++;
    }

    if (class_code !== undefined) {
      updateFields.push(`class_code = $${paramIndex}`);
      updateValues.push(class_code || null);
      paramIndex++;
    }

    if (head_teacher !== undefined) {
      updateFields.push(`head_teacher = $${paramIndex}`);
      updateValues.push(head_teacher || null);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }

    if (grade !== undefined) {
      updateFields.push(`grade = $${paramIndex}`);
      updateValues.push(grade);
      paramIndex++;
    }

    if (department !== undefined) {
      updateFields.push(`department = $${paramIndex}`);
      updateValues.push(department);
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

    updateValues.push(classId);

    await query(
      `UPDATE class SET ${updateFields.join(', ')} WHERE class_id = $${paramIndex}`,
      updateValues
    );

    // 如果更新了班主任，更新班级成员关系
    if (head_teacher !== undefined) {
      // 先移除旧的班主任成员角色
      await query(
        "UPDATE class_member SET role = 'student' WHERE class_id = $1 AND role = 'teacher'",
        [classId]
      );

      // 添加新班主任
      if (head_teacher) {
        await query(
          `INSERT INTO class_member(class_id, user_id, role, status)
          VALUES($1, $2, 'teacher', 'Y')
          ON CONFLICT (class_id, user_id) DO UPDATE SET role = 'teacher', status = 'Y'`,
          [classId, head_teacher]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: '班级信息更新成功'
    });
  } catch (error) {
    console.error('Update class error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// DELETE /api/admin/classes/[id] - 删除班级
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
      return NextResponse.json({ error: '无权限，仅管理员可以删除班级' }, { status: 403 });
    }

    const { id } = await params;
    const classId = parseInt(id);
    if (isNaN(classId)) {
      return NextResponse.json({ error: '无效的班级ID' }, { status: 400 });
    }

    // 检查班级是否存在
    const classInfo = await query<any[]>(
      "SELECT class_id, class_name FROM class WHERE class_id = $1",
      [classId]
    );
    if (!classInfo || classInfo.length === 0) {
      return NextResponse.json({ error: '班级不存在' }, { status: 404 });
    }

    // 检查班级是否还有成员
    const memberCount = await query<any[]>(
      "SELECT COUNT(*) AS cnt FROM class_member WHERE class_id = $1 AND status = 'Y'",
      [classId]
    );
    if (parseInt(memberCount[0]?.cnt || '0') > 0) {
      return NextResponse.json({
        error: '班级还有成员，请先移除所有成员或使用停用功能'
      }, { status: 400 });
    }

    // 删除班级（级联删除成员记录）
    await query("DELETE FROM class WHERE class_id = $1", [classId]);

    return NextResponse.json({
      success: true,
      message: '班级删除成功'
    });
  } catch (error) {
    console.error('Delete class error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}