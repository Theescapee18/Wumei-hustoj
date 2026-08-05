import { NextRequest, NextResponse } from 'next/server';

// 注册已关闭，仅管理员可通过后台添加用户
export async function POST() {
  return NextResponse.json(
    { error: '注册功能已关闭，请联系管理员创建账号' },
    { status: 403 }
  );
}
