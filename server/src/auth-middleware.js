import { config } from './config.js';
import { verifySessionToken } from './session.js';

export function readSession(req) {
  const token = req.cookies?.[config.cookieName];
  if (!token) return null;
  return verifySessionToken(token);
}

export function requireAuth(req, res, next) {
  const session = readSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = session;
  next();
}
