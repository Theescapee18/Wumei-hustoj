import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { signToken, pwCheck } from '@/lib/auth';
import { checkVcode, VCODE_COOKIE } from '@/lib/vcode';

export async function POST(request: NextRequest) {
  try {
    const { user_id, password, vcode } = await request.json();

    if (!user_id || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }
    
    // 验证码检查（服务端校验签名 cookie）
    if (!checkVcode(vcode, request.cookies.get(VCODE_COOKIE)?.value)) {
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 });
    }

    // 查询用户
    const users = await query<any[]>(
      "SELECT user_id, password, nick, email FROM users WHERE user_id=$1 AND defunct='N' AND expiry_date >= CURRENT_DATE",
      [user_id]
    );

    if (!users || users.length === 0) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const user = users[0];

    // 验证密码
    if (!pwCheck(password, user.password)) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    // 查询角色
    const privileges = await query<any[]>(
      "SELECT rightstr FROM privilege WHERE user_id=$1",
      [user_id]
    );

    let role = '';
    if (privileges && privileges.length > 0) {
      const admin = privileges.find((p: any) => p.rightstr === 'administrator');
      if (admin) role = 'administrator';
      else role = privileges[0].rightstr;
    }

    // 签发 JWT
    const token = signToken({ userId: user.user_id, role });

    // 更新登录时间
    await query("UPDATE users SET accesstime=NOW(), ip=$1 WHERE user_id=$2", [
      request.headers.get('x-forwarded-for') || 'unknown',
      user_id,
    ]);

    const response = NextResponse.json({
      user: { userId: user.user_id, nick: user.nick, email: user.email, role },
      token,
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    // 验证码一次性使用，登录成功后失效
    response.cookies.delete(VCODE_COOKIE);

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
