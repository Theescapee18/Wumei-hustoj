import { NextResponse } from 'next/server';
import { genVcode, makeVcodeCookieValue, renderVcodeSvg, VCODE_COOKIE } from '@/lib/vcode';

// 验证码生成API：返回 SVG 图片（不含明文），同时把 HMAC 签名写入 httpOnly cookie，
// 提交时由服务端校验，防止绕过。仅开发模式额外返回明文供自动化测试使用。
export async function GET() {
  const vcode = genVcode();

  const response = NextResponse.json({
    image: renderVcodeSvg(vcode),
    timestamp: Date.now(),
    ...(process.env.NODE_ENV !== 'production' ? { vcode } : {}),
  });

  response.cookies.set(VCODE_COOKIE, makeVcodeCookieValue(vcode), {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 10 * 60,
    path: '/',
  });

  return response;
}
