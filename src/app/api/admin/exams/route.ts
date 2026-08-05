import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRight } from '@/lib/adminGuard';

// 管理端试卷列表
export async function GET(request: NextRequest) {
  const guard = await requireRight(request, ['administrator']);
  if (!guard.ok) return guard.response;
  try {
    const rows = await query<any[]>(
      `SELECT p.paper_id, p.title, p.category_id, c.name AS category_name,
              p.duration_minutes, p.defunct, p.created_by, p.created_at,
              COUNT(q.question_id)::int AS question_count,
              COALESCE(SUM(q.score), 0)::int AS total_score,
              COUNT(q.question_id) FILTER (WHERE q.answer IS NULL OR q.answer = '')::int AS missing_answers
       FROM exam_paper p
       LEFT JOIN exam_category c ON c.category_id = p.category_id
       LEFT JOIN exam_question q ON q.paper_id = p.paper_id
       GROUP BY p.paper_id, c.name
       ORDER BY p.paper_id DESC`
    );
    return NextResponse.json({ papers: rows || [] });
  } catch (error) {
    console.error('List exam papers error:', error);
    return NextResponse.json({ error: '获取试卷列表失败' }, { status: 500 });
  }
}
