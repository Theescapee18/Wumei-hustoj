import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_EXPIRES = '7d';

export interface JWTPayload {
  userId: string;
  role: string;
}

// 签发 JWT
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// 验证 JWT
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// 从请求中获取用户信息
export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

// 获取 cookie 中的 token
export function getUserFromCookies(request: NextRequest): JWTPayload | null {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

// 检查密码（兼容 HUSTOJ 新旧两种密码格式）
export function pwCheck(password: string, saved: string): boolean {
  // 旧格式：32位 md5 十六进制
  if (isOldPW(saved)) {
    const mpw = crypto.createHash('md5').update(password).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(mpw), Buffer.from(saved));
  }

  // 新格式：base64(sha1(md5(password) + salt) + salt)
  try {
    const svd = Buffer.from(saved, 'base64');
    const salt = svd.subarray(20);
    const md5Pw = crypto.createHash('md5').update(password).digest('hex');
    const hash = crypto.createHash('sha1').update(md5Pw).update(salt).digest();
    const expected = Buffer.concat([hash, salt]).toString('base64');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(saved));
  } catch {
    return false;
  }
}

// 生成密码（用于注册/重置）
export function pwGen(password: string): string {
  const md5Pw = crypto.createHash('md5').update(password).digest('hex');
  const salt = crypto.randomBytes(2).toString('hex');
  const hash = crypto.createHash('sha1').update(md5Pw).update(salt, 'hex').digest();
  return Buffer.concat([hash, Buffer.from(salt, 'hex')]).toString('base64');
}

function isOldPW(password: string): boolean {
  if (password.length !== 32) return false;
  return /^[0-9a-fA-F]{32}$/.test(password);
}
