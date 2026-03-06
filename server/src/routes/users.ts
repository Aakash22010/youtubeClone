import express from 'express';
import { getSubscribedChannels, getUserById, getUserVideos, updateUser } from '../controllers/userController';
import authMiddleware from '../middleware/auth';

const router = express.Router();

router.get('/subscriptions', authMiddleware, getSubscribedChannels);
router.get('/:id', getUserById);
router.get('/:id/videos', getUserVideos);
router.put('/:id', authMiddleware, updateUser); 

export default router;