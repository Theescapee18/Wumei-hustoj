import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

// GET /api/admin/contests - list (same as public but with defunct)
export async function GET(request: NextRequest) {
  const userId = getUserFromCookies(request)?.userId;
  if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const privs = await query<any[]>(
    "SELECT 1 FROM privilege WHERE user_id=$1 AND (rightstr='administrator' OR rightstr='contest_creator')",
    [userId]
  );
  if (!privs || privs.length === 0)
    return NextResponse.json({ error: '无权限' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const contests = await query<any[]>(
    "SELECT contest_id, title, start_time, end_time, contest_type, private, defunct, langmask, password, subnet, user_id FROM contest ORDER BY contest_id DESC LIMIT $1 OFFSET $2",
    [pageSize, offset]
  );
  const countResult = await query<any[]>("SELECT COUNT(*) AS cnt FROM contest");
  const total = parseInt(countResult[0]?.cnt || '0');
  return NextResponse.json({ contests, total, page, pageSize });
}

// POST /api/admin/contests - create new contest
export async function POST(request: NextRequest) {
  const userId = getUserFromCookies(request)?.userId;
  if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const privs = await query<any[]>(
    "SELECT 1 FROM privilege WHERE user_id=$1 AND (rightstr='administrator' OR rightstr='contest_creator')",
    [userId]
  );
  if (!privs || privs.length === 0)
    return NextResponse.json({ error: '无权限' }, { status: 403 });

  const body = await request.json();
  const { title, start_time, end_time, private: p, password, description, langmask, contest_type, subnet, problems, userList } = body;

  if (!title || !start_time || !end_time) {
    return NextResponse.json({ error: '标题、开始时间、结束时间为必填' }, { status: 400 });
  }

  const insertResult = await query<any>(
    `INSERT INTO contest(title, start_time, end_time, private, langmask, description, password, subnet, contest_type, user_id)
     VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING contest_id`,
    [title, start_time, end_time, p ?? 0, langmask ?? 0, description ?? '', password ?? '', subnet ?? '', contest_type ?? 0, userId]
  );
  const cid = insertResult[0].contest_id;

  // Insert problems
  if (problems && Array.isArray(problems)) {
    for (let i = 0; i < problems.length; i++) {
      const pid = parseInt(problems[i]);
      if (isNaN(pid)) continue;
      const exists = await query<any[]>("SELECT 1 FROM problem WHERE problem_id=$1", [pid]);
      if (exists && exists.length > 0) {
        await query(
          "INSERT INTO contest_problem(contest_id, problem_id, num) VALUES($1, $2, $3)",
          [cid, pid, i]
        );
      }
    }
  }

  // Grant contest manager privilege
  await query(
    "INSERT INTO privilege(user_id, rightstr) VALUES($1, $2) ON CONFLICT DO NOTHING",
    [userId, 'm' + cid]
  );

  // Add user list for private contest
  if (userList && Array.isArray(userList) && userList.length > 0) {
    for (const uid of userList) {
      if (uid.trim()) {
        await query(
          "INSERT INTO privilege(user_id, rightstr) VALUES($1, $2) ON CONFLICT DO NOTHING",
          [uid.trim(), 'c' + cid]
        );
      }
    }
  }

  return NextResponse.json({ contest_id: cid }, { status: 201 });
}
