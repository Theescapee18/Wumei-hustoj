import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';

// 批量获取知识题API - 前端缓存优化
export async function GET(request: NextRequest) {
  const user = getUserFromCookies(request);
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const version = searchParams.get('version');

  try {
    // 检查版本号（如果一致则减少传输）
    const currentVersion = await getVersion();
    if (version === currentVersion) {
      return NextResponse.json({
        version: currentVersion,
        data: null,
        message: '缓存已是最新版本'
      });
    }

    // 批量查询题目（一次性）
    let sql = `
      SELECT 
        problem_id, title, category, subcategory,
        question_type, difficulty, content,
        explanation, knowledge_points
      FROM knowledge_problem
      WHERE defunct = 'N'
    `;
    
    const params: any[] = [];
    if (category) {
      sql += ' AND category = $1';
      params.push(category);
    }
    
    sql += ' ORDER BY category, difficulty';

    const problems = await query<any[]>(sql, params);

    return NextResponse.json({
      version: currentVersion,
      data: problems,
      count: problems.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Get knowledge problems error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 获取版本号
async function getVersion(): Promise<string> {
  try {
    const result = await query<any[]>(
      "SELECT MAX(update_time) as latest FROM knowledge_problem"
    );
    
    if (result && result.length > 0 && result[0].latest) {
      // 使用最新更新时间作为版本号
      return `v${result[0].latest.getTime()}`;
    }
    
    return 'v1'; // 默认版本
  } catch {
    return 'v1';
  }
}