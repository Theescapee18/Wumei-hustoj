import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

// 批量提交答题结果API - 减少数据库访问
export async function POST(request: NextRequest) {
  const user = getUserFromCookies(request);
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const { solutions } = await request.json();

    if (!solutions || solutions.length === 0) {
      return NextResponse.json({ error: '无答题数据' }, { status: 400 });
    }

    // 批量插入答题记录（一次数据库操作）
    // PostgreSQL不支持VALUES (...), (...), (...)的批量插入，需要使用循环
    for (const sol of solutions) {
      await query(
        `INSERT INTO knowledge_solution
         (problem_id, user_id, answer, correct, score, time_spent, submit_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          sol.problem_id,
          user.userId,
          JSON.stringify(sol.answer),
          sol.correct,
          sol.score,
          sol.time_spent || 0,
          new Date(sol.timestamp)
        ]
      );
    }

    // 批量更新题目统计（一次数据库操作）
    for (const sol of solutions) {
      await query(
        `UPDATE knowledge_problem
         SET 
           submit_count = submit_count + 1,
           correct_count = correct_count + CASE WHEN $1 THEN 1 ELSE 0 END
         WHERE problem_id = $2`,
        [sol.correct, sol.problem_id]
      );
    }

    return NextResponse.json({
      success: true,
      savedCount: solutions.length,
      message: '答题结果已保存'
    });
  } catch (error) {
    console.error('Batch submit solutions error:', error);
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  }
}