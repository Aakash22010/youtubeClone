declare module 'express';
declare module 'multer';
declare module 'cors';
import { Request } from 'express';
import { IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      firebaseUid?: string;
      anonymousId?: string;
      file?: Multer.File;
    }
  }
}