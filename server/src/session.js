import jwt from 'jsonwebtoken';
import { config } from './config.js';

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export function createSessionToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: SESSION_DURATION_SECONDS });
}

export function verifySessionToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (!decoded || typeof decoded !== 'object') return null;
    if (typeof decoded.userId !== 'string' || typeof decoded.email !== 'string') return null;
    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProduction,
  path: '/',
  maxAge: SESSION_DURATION_SECONDS * 1000,
};
