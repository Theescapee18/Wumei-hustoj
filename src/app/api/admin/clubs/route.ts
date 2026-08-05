import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

// GET /api/admin/clubs - 获取社团列表
export async function GET(request: NextRequest) {
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

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const offset = (page - 1) * pageSize;

    // 构建查询条件
    let whereConditions = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions += ` AND (cl.club_name ILIKE $${paramIndex} OR cl.club_code ILIKE $${paramIndex} OR cl.description ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      whereConditions += ` AND cl.category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    // 查询社团列表（使用视图获取成员数量）
    const clubs = await query<any[]>(
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
        COALESCE(COUNT(DISTINCT CASE WHEN cm.status = 'Y' THEN cm.user_id END), 0) AS member_count
      FROM club cl
      LEFT JOIN users u ON cl.president = u.user_id
      LEFT JOIN users u2 ON cl.vice_president = u2.user_id
      LEFT JOIN club_member cm ON cl.club_id = cm.club_id
      ${whereConditions}
      GROUP BY cl.club_id, cl.club_name, cl.club_code, cl.president, u.nick, cl.vice_president, u2.nick, cl.category, cl.description, cl.max_members, cl.defunct, cl.created_at, cl.updated_at
      ORDER BY cl.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, pageSize, offset]
    );

    // 查询总数
    const countResult = await query<any[]>(
      `SELECT COUNT(DISTINCT cl.club_id) AS cnt
      FROM club cl
      ${whereConditions}`,
      queryParams
    );
    const total = parseInt(countResult[0]?.cnt || '0');

    return NextResponse.json({
      clubs: clubs || [],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Get clubs error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// POST /api/admin/clubs - 创建社团
export async function POST(request: NextRequest) {
  try {
    // 权限检查
    const userId = getUserFromCookies(request)?.userId;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const privs = await query<any[]>(
      "SELECT 1 FROM privilege WHERE user_id=$1 AND (rightstr='administrator' OR rightstr='club_manager' OR rightstr='club_creator')",
      [userId]
    );
    if (!privs || privs.length === 0) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const {
      club_name,
      club_code,
      president,
      vice_president,
      description,
      category,
      max_members
    } = body;

    // 验证必填字段
    if (!club_name) {
      return NextResponse.json({ error: '社团名称不能为空' }, { status: 400 });
    }

    // 检查社团名称是否已存在
    const exists = await query<any[]>(
      "SELECT club_id FROM club WHERE club_name = $1",
      [club_name]
    );
    if (exists && exists.length > 0) {
      return NextResponse.json({ error: '社团名称已存在' }, { status: 409 });
    }

    // 检查社团代码是否已存在（如果提供了）
    if (club_code) {
      const codeExists = await query<any[]>(
        "SELECT club_id FROM club WHERE club_code = $1",
        [club_code]
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

    // 创建社团
    const result = await query<any>(
      `INSERT INTO club(
        club_name,
        club_code,
        president,
        vice_president,
        description,
        category,
        max_members,
        created_by
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING club_id`,
      [
        club_name,
        club_code || null,
        president || null,
        vice_president || null,
        description || '',
        category || '',
        max_members || 200,
        userId
      ]
    );

    const clubId = result[0].club_id;

    // 如果有社长，自动将社长加入社团
    if (president) {
      await query(
        `INSERT INTO club_member(club_id, user_id, role, status)
        VALUES($1, $2, 'president', 'Y')
        ON CONFLICT (club_id, user_id) DO UPDATE SET role = 'president', status = 'Y'`,
        [clubId, president]
      );
    }

    // 如果有副社长，自动将副社长加入社团
    if (vice_president) {
      await query(
        `INSERT INTO club_member(club_id, user_id, role, status)
        VALUES($1, $2, 'vice_president', 'Y')
        ON CONFLICT (club_id, user_id) DO UPDATE SET role = 'vice_president', status = 'Y'`,
        [clubId, vice_president]
      );
    }

    return NextResponse.json({
      success: true,
      club_id: clubId,
      message: '社团创建成功'
    }, { status: 201 });
  } catch (error) {
    console.error('Create club error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}