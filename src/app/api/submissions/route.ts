import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { checkVcode, VCODE_COOKIE } from '@/lib/vcode';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const problemId = searchParams.get('problem_id');
  const userId = searchParams.get('user_id');
  const result = searchParams.get('result');
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  try {
    let sql = "SELECT s.solution_id, s.problem_id, p.title, s.user_id, s.result, s.time, s.memory, s.in_date, s.language, s.code_length FROM solution s LEFT JOIN problem p ON s.problem_id=p.problem_id WHERE s.problem_id>0";
    const params: any[] = [];
    let paramIndex = 1;

    if (problemId) {
      sql += ` AND s.problem_id=$${paramIndex}`;
      params.push(parseInt(problemId));
      paramIndex++;
    }
    if (userId) {
      sql += ` AND s.user_id=$${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }
    if (result !== null && result !== undefined && result !== '') {
      sql += ` AND s.result=$${paramIndex}`;
      params.push(parseInt(result));
      paramIndex++;
    }

    sql += ` ORDER BY s.solution_id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, offset);

    const submissions = await query<any[]>(sql, params);

    const countSql = sql.replace(/SELECT .* FROM/, "SELECT COUNT(*) AS cnt FROM").replace(/ ORDER BY .* LIMIT \$\d+ OFFSET \$\d+$/, '');
    const countParams = params.slice(0, -2);
    const countResult = await query<any[]>(countSql, countParams);
    const total = parseInt(countResult[0]?.cnt || '0');

    return NextResponse.json({ submissions, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    console.error('Submission list error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: '登录已过期' }, { status: 401 });
  }

  try {
    const { problem_id, language, source, vcode } = await request.json();

    if (!problem_id || language === undefined || language === null || !source) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    // 验证码检查（服务端校验签名 cookie）
    if (!checkVcode(vcode, request.cookies.get(VCODE_COOKIE)?.value)) {
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 });
    }

    // 题目存在性检查
    const problems = await query<any[]>(
      "SELECT problem_id FROM problem WHERE problem_id=$1 AND defunct='N'",
      [problem_id]
    );
    if (!problems || problems.length === 0) {
      return NextResponse.json({ error: '题目不存在' }, { status: 404 });
    }

    const codeLength = Buffer.byteLength(source, 'utf8');

    const result = await query<any>(
      "INSERT INTO solution(problem_id, user_id, in_date, language, code_length, ip, result) VALUES($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, 0) RETURNING solution_id",
      [problem_id, payload.userId, language, codeLength, request.headers.get('x-forwarded-for') || '']
    );

    const solutionId = result[0].solution_id;

    await query(
      "INSERT INTO source_code(solution_id, source) VALUES($1, $2)",
      [solutionId, source]
    );

    // 加入判题队列（比赛题优先）
    const contest = await query<any[]>(
      "SELECT contest_id FROM contest_problem WHERE problem_id=$1 ORDER BY contest_id DESC LIMIT 1",
      [problem_id]
    );
    const priority = contest.length > 0 ? 10 : 0;
    await query(
      "INSERT INTO judge_queue(solution_id, priority, estimated_time, language, create_time) VALUES($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      [solutionId, priority, 30, language]
    );

    // 更新题目与用户提交计数
    await query("UPDATE problem SET submit=submit+1 WHERE problem_id=$1", [problem_id]);
    await query("UPDATE users SET submit=COALESCE(submit,0)+1 WHERE user_id=$1", [payload.userId]);

    // 验证码一次性使用
    const response = NextResponse.json({ solution_id: solutionId }, { status: 201 });
    response.cookies.delete(VCODE_COOKIE);
    return response;
  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  }
}
