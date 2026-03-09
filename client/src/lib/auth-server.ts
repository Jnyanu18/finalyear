import jwt from 'jsonwebtoken';

export const SESSION_COOKIE_NAME = 'agrivision_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  userId: string;
  email: string;
};

function getJwtSecret(): string {
  return process.env.AUTH_JWT_SECRET || 'dev-only-change-me';
}

export function createSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: SESSION_DURATION_SECONDS });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (!decoded || typeof decoded !== 'object') return null;
    const userId = typeof decoded.userId === 'string' ? decoded.userId : null;
    const email = typeof decoded.email === 'string' ? decoded.email : null;
    if (!userId || !email) return null;
    return { userId, email };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  };
}

import { cookies } from 'next/headers';

export function getUserSession(): SessionPayload | null {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
