import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { pwGen } from '@/lib/auth';
import { requireRight } from '@/lib/adminGuard';

const USER_ID_RE = /^[A-Za-z0-9_]{3,20}$/;

// 批量导入用户：每行"用户名,密码,昵称,学校"（密码/昵称/学校可省略，密码默认与用户名相同）
// 也支持 JSON 数组 { users: [{ user_id, password, nick, school }] }
export async function POST(request: NextRequest) {
  const guard = await requireRight(request, ['administrator', 'class_manager', 'club_manager']);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();

    let entries: { user_id: string; password?: string; nick?: string; school?: string }[] = [];
    if (Array.isArray(body?.users)) {
      entries = body.users;
    } else if (typeof body?.text === 'string') {
      // 逐行解析，支持逗号/制表符/空格分隔
      entries = body.text
        .split(/\r?\n/)
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .map((line: string) => {
          const parts = line.split(/[,\t]|\s{2,}| /).map(s => s.trim()).filter(Boolean);
          return { user_id: parts[0], password: parts[1], nick: parts[2], school: parts[3] };
        });
    }

    if (entries.length === 0) {
      return NextResponse.json({ error: '没有可导入的用户' }, { status: 400 });
    }
    if (entries.length > 500) {
      return NextResponse.json({ error: '单次最多导入 500 个用户' }, { status: 400 });
    }

    const results: { user_id: string; status: string; error?: string }[] = [];
    const ip = request.headers.get('x-forwarded-for') || '';

    for (const entry of entries) {
      const uid = String(entry.user_id || '').trim();
      try {
        if (!USER_ID_RE.test(uid)) {
          results.push({ user_id: uid || '(空)', status: 'error', error: '用户名需为 3-20 位字母、数字、下划线' });
          continue;
        }
        const exists = await query<any[]>("SELECT 1 FROM users WHERE user_id=$1", [uid]);
        if (exists && exists.length > 0) {
          results.push({ user_id: uid, status: 'error', error: '用户名已存在' });
          continue;
        }
        const password = entry.password && String(entry.password).trim() ? String(entry.password).trim() : uid;
        await query(
          `INSERT INTO users(user_id, password, nick, school, ip, reg_time, accesstime, defunct, submit, solved)
           VALUES($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'N', 0, 0)`,
          [uid, pwGen(password), entry.nick?.trim() || uid, entry.school?.trim() || null, ip]
        );
        results.push({ user_id: uid, status: 'ok' });
      } catch (e) {
        results.push({ user_id: uid, status: 'error', error: (e as Error).message });
      }
    }

    const ok = results.filter(r => r.status === 'ok').length;
    const failed = results.length - ok;
    return NextResponse.json({
      message: `导入完成：成功 ${ok} 个，失败 ${failed} 个`,
      results,
    });
  } catch (error) {
    console.error('Batch import users error:', error);
    return NextResponse.json({ error: '批量导入失败' }, { status: 500 });
  }
}
