import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Next.js 16 起 middleware 更名为 proxy
// 注意：此处仅做粗粒度的登录态拦截（页面跳转），真正的权限校验在各 API 内部完成
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静态资源放行
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/images')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  // 管理端页面：无登录态直接跳登录页
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // 需登录的用户页面
  const authPages = ['/submit', '/profile', '/exams'];
  if (authPages.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
