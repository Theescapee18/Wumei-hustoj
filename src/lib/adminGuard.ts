// 管理端统一权限守卫
import { NextRequest, NextResponse } from 'next/server';
import { query } from './db';
import { getUserFromCookies } from './auth';

type GuardResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * 校验当前请求是否具备指定管理权限之一
 * @param rights 允许的权限串（默认仅 administrator）
 *
 * 用法：
 *   const guard = await requireRight(request, ['administrator', 'problem_editor']);
 *   if (!guard.ok) return guard.response;
 */
export async function requireRight(
  request: NextRequest,
  rights: string[] = ['administrator']
): Promise<GuardResult> {
  const userId = getUserFromCookies(request)?.userId;
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: '未登录' }, { status: 401 }) };
  }

  // administrator 始终视为拥有全部权限
  const allowed = rights.includes('administrator') ? rights : ['administrator', ...rights];

  try {
    const privs = await query<any[]>(
      "SELECT 1 FROM privilege WHERE user_id=$1 AND rightstr = ANY($2::text[]) LIMIT 1",
      [userId, allowed]
    );
    if (!privs || privs.length === 0) {
      return { ok: false, response: NextResponse.json({ error: '无权限' }, { status: 403 }) };
    }
  } catch (error) {
    console.error('权限校验失败:', error);
    return { ok: false, response: NextResponse.json({ error: '服务器错误' }, { status: 500 }) };
  }

  return { ok: true, userId };
}
