import { Request, Response, NextFunction } from 'express';
import admin from '../utils/firebaseAdmin';
import User, { IUser } from '../models/User';
import Playlist from '../models/Playlist';

export interface AuthRequest extends Request {
  user?: IUser;
  firebaseUid?: string;
}

const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUid = decoded.uid;

    // Find existing user
    let user = await User.findOne({ firebaseUid: decoded.uid });

    // If user doesn't exist, create one
    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email,
        displayName: decoded.name || 'User',
        photoURL: decoded.picture || '',
      });

      // Create default Watch Later playlist
      await Playlist.create({
        name: 'Watch Later',
        userId: user._id,
        videos: [],
        isPublic: false,
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error('🔥 Firebase token verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export default authMiddleware;