import { Request, Response, NextFunction } from 'express';
import { loadUser, PublicUser } from '../db/users';
import { verifyToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: PublicUser;
}

/** Pulls "Authorization: Bearer <jwt>" off a request, or null. */
export function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  let userId: string;
  try {
    userId = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // The token can outlive the account, so the user is loaded, not trusted from
  // the payload — a deleted user must stop being able to act immediately.
  const user = await loadUser(userId);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  req.user = user;
  next();
};

export default authMiddleware;
