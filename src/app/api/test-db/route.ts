import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 数据库连接测试API
export async function GET() {
  try {
    // 测试基本查询
    const result = await query<any[]>('SELECT version()');
    
    // 测试用户表
    const users = await query<any[]>('SELECT COUNT(*) as count FROM users');
    
    // 测试题目表（包含JSONB字段）
    const problems = await query<any[]>('SELECT COUNT(*) as count FROM problem');
    
    // 测试JSONB字段查询
    const jsonbTest = await query<any[]>(`
      SELECT 
        problem_id, 
        title, 
        tags::text as tags_text,
        metadata::text as metadata_text
      FROM problem 
      LIMIT 1
    `);

    return NextResponse.json({
      success: true,
      message: '数据库连接成功',
      database: 'PostgreSQL',
      version: result[0]?.version || 'Unknown',
      stats: {
        users: users[0]?.count || 0,
        problems: problems[0]?.count || 0
      },
      jsonb_support: {
        enabled: true,
        sample: jsonbTest[0] || null
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({
      success: false,
      error: '数据库连接失败',
      details: (error as Error).message,
      hint: '请检查.env.local配置是否正确'
    }, { status: 500 });
  }
}