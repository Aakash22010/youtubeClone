import { Request, Response, NextFunction } from 'express';
import admin from '../utils/firebaseAdmin';
import User, { IUser } from '../models/User';

export interface OptionalAuthRequest extends Request {
  user?: IUser;
  firebaseUid?: string;
  anonymousId?: string;
}

const optionalAuth = async (req: OptionalAuthRequest, res: Response, next: NextFunction) => {
  // 1. Check Firebase token (authenticated user)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      req.firebaseUid = decoded.uid;
      let user = await User.findOne({ firebaseUid: decoded.uid });
      if (!user) {
        user = await User.create({
          firebaseUid: decoded.uid,
          email: decoded.email,
          displayName: decoded.name || 'User',
          photoURL: decoded.picture || '',
        });
      }
      req.user = user;
    } catch (error) {
      // Invalid token – continue as anonymous
    }
  }

  // 2. Capture anonymous ID from header (if any)
  const anonymousId = req.headers['x-anonymous-id'] as string;
  if (anonymousId) {
    req.anonymousId = anonymousId;
  }

  next();
};

export default optionalAuth;