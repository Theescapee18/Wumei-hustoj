// 验证码签名与校验（无状态：HMAC 签名存于 httpOnly cookie）
import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'default-secret';
const VCODE_TTL = 10 * 60 * 1000; // 10 分钟有效

export const VCODE_COOKIE = 'vcode_sig';

// 生成 4 位验证码
export function genVcode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function sign(code: string, expires: number): string {
  return crypto
    .createHmac('sha256', SECRET)
    .update(code.trim().toUpperCase() + ':' + expires)
    .digest('hex');
}

// 生成 cookie 值：过期时间.签名
export function makeVcodeCookieValue(code: string): string {
  const expires = Date.now() + VCODE_TTL;
  return `${expires}.${sign(code, expires)}`;
}

// 将验证码渲染为 SVG 图片（data URI），避免把明文直接暴露给客户端
export function renderVcodeSvg(code: string): string {
  const width = 120;
  const height = 40;
  let chars = '';
  for (let i = 0; i < code.length; i++) {
    const x = 15 + i * 26 + Math.floor(Math.random() * 6 - 3);
    const y = 27 + Math.floor(Math.random() * 8 - 4);
    const rotate = Math.floor(Math.random() * 40 - 20);
    chars += `<text x="${x}" y="${y}" font-size="26" font-family="Georgia, serif" font-weight="bold" fill="hsl(${Math.floor(Math.random() * 360)},60%,35%)" transform="rotate(${rotate} ${x} ${y})">${code[i]}</text>`;
  }
  // 干扰线
  let lines = '';
  for (let i = 0; i < 4; i++) {
    lines += `<line x1="${Math.random() * width}" y1="${Math.random() * height}" x2="${Math.random() * width}" y2="${Math.random() * height}" stroke="hsl(${Math.floor(Math.random() * 360)},50%,60%)" stroke-width="1"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#f4f6f8"/>${lines}${chars}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// 校验用户输入的验证码与 cookie 中的签名是否匹配
export function checkVcode(input: string | undefined, cookieValue: string | undefined): boolean {
  if (!input || !cookieValue) return false;
  const dot = cookieValue.indexOf('.');
  if (dot <= 0) return false;
  const expires = parseInt(cookieValue.slice(0, dot));
  const sig = cookieValue.slice(dot + 1);
  if (!expires || Date.now() > expires) return false;
  const expected = sign(input, expires);
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
