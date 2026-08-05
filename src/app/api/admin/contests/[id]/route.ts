import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

async function checkAdmin(userId: string, cid: number): Promise<boolean> {
  const privs = await query<any[]>(
    "SELECT 1 FROM privilege WHERE user_id=$1 AND (rightstr='administrator' OR rightstr='contest_creator' OR rightstr=$2)",
    [userId, 'm' + cid]
  );
  return privs && privs.length > 0;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cid = parseInt(id);
  const userId = getUserFromCookies(request)?.userId;
  if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (!await checkAdmin(userId, cid)) return NextResponse.json({ error: '无权限' }, { status: 403 });

  const body = await request.json();
  const { action } = body;

  if (action === 'toggle_defunct') {
    const contest = await query<any[]>("SELECT defunct FROM contest WHERE contest_id=$1", [cid]);
    if (!contest || contest.length === 0) return NextResponse.json({ error: '不存在' }, { status: 404 });
    const newVal = contest[0].defunct === 'Y' ? 'N' : 'Y';
    await query("UPDATE contest SET defunct=$1 WHERE contest_id=$2", [newVal, cid]);
    return NextResponse.json({ defunct: newVal });
  }

  if (action === 'update') {
    const { title, start_time, end_time, private: p, password, description, langmask, contest_type, subnet, problems, userList } = body;
    await query(
      "UPDATE contest SET title=$1, description=$2, start_time=$3, end_time=$4, private=$5, langmask=$6, password=$7, subnet=$8, contest_type=$9 WHERE contest_id=$10",
      [title, description ?? '', start_time, end_time, p ?? 0, langmask ?? 0, password ?? '', subnet ?? '', contest_type ?? 0, cid]
    );

    // Rebuild contest_problem
    await query("DELETE FROM contest_problem WHERE contest_id=$1", [cid]);
    await query("UPDATE solution SET num=-1 WHERE contest_id=$1", [cid]);

    if (problems && Array.isArray(problems)) {
      for (let i = 0; i < problems.length; i++) {
        const pid = parseInt(problems[i]);
        if (isNaN(pid)) continue;
        const exists = await query<any[]>("SELECT 1 FROM problem WHERE problem_id=$1", [pid]);
        if (exists && exists.length > 0) {
          await query("INSERT INTO contest_problem(contest_id, problem_id, num) VALUES($1, $2, $3)", [cid, pid, i]);
          await query("UPDATE solution SET num=$1 WHERE contest_id=$2 AND problem_id=$3", [i, cid, pid]);
          // Update solved/submit counts
          await query(
            "UPDATE contest_problem SET c_accepted=(SELECT COUNT(1) FROM solution WHERE problem_id=$1 AND contest_id=$2 AND result=4) WHERE contest_id=$3 AND problem_id=$4",
            [pid, cid, cid, pid]
          );
          await query(
            "UPDATE contest_problem SET c_submit=(SELECT COUNT(1) FROM solution WHERE problem_id=$1 AND contest_id=$2) WHERE contest_id=$3 AND problem_id=$4",
            [pid, cid, cid, pid]
          );
        }
      }
    }

    // Rebuild user list for private contest
    await query("DELETE FROM privilege WHERE rightstr=$1", ['c' + cid]);
    if (userList && Array.isArray(userList)) {
      for (const uid of userList) {
        if (uid.trim()) {
          await query(
            "INSERT INTO privilege(user_id, rightstr) VALUES($1, $2) ON CONFLICT DO NOTHING",
            [uid.trim(), 'c' + cid]
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: '未知操作' }, { status: 400 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cid = parseInt(id);
  const userId = getUserFromCookies(request)?.userId;
  if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (!await checkAdmin(userId, cid)) return NextResponse.json({ error: '无权限' }, { status: 403 });

  await query("DELETE FROM contest_problem WHERE contest_id=$1", [cid]);
  await query("DELETE FROM privilege WHERE rightstr IN ($1, $2)", ['c' + cid, 'm' + cid]);
  await query("DELETE FROM contest WHERE contest_id=$1", [cid]);

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cid = parseInt(id);
  const userId = getUserFromCookies(request)?.userId;
  if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (!await checkAdmin(userId, cid)) return NextResponse.json({ error: '无权限' }, { status: 403 });

  const contests = await query<any[]>("SELECT * FROM contest WHERE contest_id=$1", [cid]);
  if (!contests || contests.length === 0) return NextResponse.json({ error: '不存在' }, { status: 404 });

  const problems = await query<any[]>(
    "SELECT cp.num, cp.problem_id, p.title FROM contest_problem cp LEFT JOIN problem p ON cp.problem_id=p.problem_id WHERE cp.contest_id=$1 ORDER BY cp.num",
    [cid]
  );

  const users = await query<any[]>(
    "SELECT user_id FROM privilege WHERE rightstr=$1 ORDER BY user_id",
    ['c' + cid]
  );

  return NextResponse.json({
    contest: contests[0],
    problems: problems || [],
    users: users?.map((u: any) => u.user_id) || [],
  });
}
