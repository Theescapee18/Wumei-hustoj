import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取题目版本号API - 用于缓存检查
export async function GET(request: NextRequest) {
  try {
    const result = await query<any[]>(
      "SELECT MAX(update_time) as latest FROM knowledge_problem WHERE defunct = 'N'"
    );
    
    if (result && result.length > 0 && result[0].latest) {
      return NextResponse.json({
        version: `v${result[0].latest.getTime()}`,
        count: await getProblemCount()
      });
    }
    
    return NextResponse.json({
      version: 'v1',
      count: await getProblemCount()
    });
  } catch (error) {
    console.error('Get version error:', error);
    return NextResponse.json({ version: 'v1', count: 0 });
  }
}

async function getProblemCount(): Promise<number> {
  try {
    const result = await query<any[]>(
      "SELECT COUNT(*) as count FROM knowledge_problem WHERE defunct = 'N'"
    );
    return parseInt(result[0]?.count || 0);
  } catch {
    return 0;
  }
}