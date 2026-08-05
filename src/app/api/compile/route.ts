import { NextRequest, NextResponse } from 'next/server';
import { getUserFromCookies } from '@/lib/auth';
import { compileCheck } from '@/lib/judgeExecutor';

// 真实编译检查：调用评测机编译器编译源码（不运行），返回真实的编译器报错信息
export async function POST(request: NextRequest) {
  try {
    const userId = getUserFromCookies(request)?.userId;
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { source, language } = await request.json();

    if (!source || !String(source).trim()) {
      return NextResponse.json({ error: '请输入代码' }, { status: 400 });
    }
    if (String(source).length > 100 * 1024) {
      return NextResponse.json({ error: '代码过长（超过 100KB）' }, { status: 400 });
    }

    const result = await compileCheck(parseInt(language), String(source));

    return NextResponse.json({
      ok: result.ok,
      available: result.available,
      message: result.message,
    });
  } catch (error) {
    console.error('Compile check error:', error);
    return NextResponse.json({ error: '编译检查失败' }, { status: 500 });
  }
}