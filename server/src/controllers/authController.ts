import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';

export const login = async (req: AuthRequest, res: Response) => {
  // req.user is already attached by auth middleware
  res.json({ user: req.user });
};