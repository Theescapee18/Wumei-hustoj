import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

// GET /api/admin/classes - 获取班级列表
export async function GET(request: NextRequest) {
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

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const grade = searchParams.get('grade') || '';
    const department = searchParams.get('department') || '';

    const offset = (page - 1) * pageSize;

    // 构建查询条件
    let whereConditions = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions += ` AND (c.class_name ILIKE $${paramIndex} OR c.class_code ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (grade) {
      whereConditions += ` AND c.grade = $${paramIndex}`;
      queryParams.push(grade);
      paramIndex++;
    }

    if (department) {
      whereConditions += ` AND c.department ILIKE $${paramIndex}`;
      queryParams.push(`%${department}%`);
      paramIndex++;
    }

    // 查询班级列表（使用视图获取成员数量）
    const classes = await query<any[]>(
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
        COALESCE(COUNT(DISTINCT CASE WHEN cm.status = 'Y' THEN cm.user_id END), 0) AS member_count
      FROM class c
      LEFT JOIN users u ON c.head_teacher = u.user_id
      LEFT JOIN class_member cm ON c.class_id = cm.class_id
      ${whereConditions}
      GROUP BY c.class_id, c.class_name, c.class_code, c.head_teacher, u.nick, c.grade, c.department, c.description, c.max_members, c.defunct, c.created_at, c.updated_at
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, pageSize, offset]
    );

    // 查询总数
    const countResult = await query<any[]>(
      `SELECT COUNT(DISTINCT c.class_id) AS cnt
      FROM class c
      ${whereConditions}`,
      queryParams
    );
    const total = parseInt(countResult[0]?.cnt || '0');

    return NextResponse.json({
      classes: classes || [],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Get classes error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// POST /api/admin/classes - 创建班级
export async function POST(request: NextRequest) {
  try {
    // 权限检查
    const userId = getUserFromCookies(request)?.userId;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const privs = await query<any[]>(
      "SELECT 1 FROM privilege WHERE user_id=$1 AND (rightstr='administrator' OR rightstr='class_manager' OR rightstr='class_creator')",
      [userId]
    );
    if (!privs || privs.length === 0) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const {
      class_name,
      class_code,
      head_teacher,
      description,
      grade,
      department,
      max_members
    } = body;

    // 验证必填字段
    if (!class_name) {
      return NextResponse.json({ error: '班级名称不能为空' }, { status: 400 });
    }

    // 检查班级名称是否已存在
    const exists = await query<any[]>(
      "SELECT class_id FROM class WHERE class_name = $1",
      [class_name]
    );
    if (exists && exists.length > 0) {
      return NextResponse.json({ error: '班级名称已存在' }, { status: 409 });
    }

    // 检查班级代码是否已存在（如果提供了）
    if (class_code) {
      const codeExists = await query<any[]>(
        "SELECT class_id FROM class WHERE class_code = $1",
        [class_code]
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

    // 创建班级
    const result = await query<any>(
      `INSERT INTO class(
        class_name,
        class_code,
        head_teacher,
        description,
        grade,
        department,
        max_members,
        created_by
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING class_id`,
      [
        class_name,
        class_code || null,
        head_teacher || null,
        description || '',
        grade || '',
        department || '',
        max_members || 100,
        userId
      ]
    );

    const classId = result[0].class_id;

    // 如果有班主任，自动将班主任加入班级
    if (head_teacher) {
      await query(
        `INSERT INTO class_member(class_id, user_id, role, status)
        VALUES($1, $2, 'teacher', 'Y')
        ON CONFLICT (class_id, user_id) DO UPDATE SET status = 'Y'`,
        [classId, head_teacher]
      );
    }

    return NextResponse.json({
      success: true,
      class_id: classId,
      message: '班级创建成功'
    }, { status: 201 });
  } catch (error) {
    console.error('Create class error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}