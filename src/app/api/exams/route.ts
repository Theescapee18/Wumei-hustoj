import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

// 用户端考试列表（按分类分组，需登录）
export async function GET(request: NextRequest) {
  const user = getUserFromCookies(request);
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  try {
    const categories = await query<any[]>(
      "SELECT category_id, name, description FROM exam_category ORDER BY category_id");
    const papers = await query<any[]>(
      `SELECT p.paper_id, p.title, p.category_id, p.description, p.duration_minutes, p.created_at,
              COUNT(q.question_id)::int AS question_count,
              COALESCE(SUM(q.score), 0)::int AS total_score
       FROM exam_paper p
       LEFT JOIN exam_question q ON q.paper_id = p.paper_id
       WHERE p.defunct = 'N'
       GROUP BY p.paper_id
       ORDER BY p.paper_id DESC`
    );
    // 我的最近作答（用于显示"继续作答/已交卷"状态）
    const attempts = await query<any[]>(
      `SELECT DISTINCT ON (paper_id, mode) paper_id, mode, attempt_id, submitted_at, score, total_score
       FROM exam_attempt WHERE user_id=$1
       ORDER BY paper_id, mode, attempt_id DESC`,
      [user.userId]
    );
    return NextResponse.json({
      categories: categories || [],
      papers: papers || [],
      my_attempts: attempts || [],
    });
  } catch (error) {
    console.error('List exams error:', error);
    return NextResponse.json({ error: '获取考试列表失败' }, { status: 500 });
  }
}
