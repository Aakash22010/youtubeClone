import { Request, Response, NextFunction } from 'express';
import { loadUser, PublicUser } from '../db/users';
import { verifyToken } from '../utils/jwt';
import { bearerToken } from './auth';

export interface OptionalAuthRequest extends Request {
  user?: PublicUser;
  anonymousId?: string;
}

/** Attaches req.user when a valid token is present, and never rejects otherwise. */
const optionalAuth = async (req: OptionalAuthRequest, _res: Response, next: NextFunction) => {
  const token = bearerToken(req);
  if (token) {
    try {
      const user = await loadUser(verifyToken(token));
      if (user) req.user = user;
    } catch {
      // Invalid or expired token — carry on as anonymous.
    }
  }

  const anonymousId = req.headers['x-anonymous-id'];
  if (typeof anonymousId === 'string' && anonymousId) req.anonymousId = anonymousId;

  next();
};

export default optionalAuth;
