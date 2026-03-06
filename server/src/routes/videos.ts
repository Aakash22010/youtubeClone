import express from 'express';
import {
  getVideos,
  getVideo,
  createVideo,
  likeVideo,
  dislikeVideo,
  getLikedVideos,
  getSubscribedVideos,
  getTrendingVideos,
} from '../controllers/videoController';
import authMiddleware from '../middleware/auth';
import optionalAuth from '../middleware/optionalAuth';

const router = express.Router();

router.get('/', getVideos);
router.get('/trending', getTrendingVideos);
router.get('/liked', authMiddleware, getLikedVideos);
router.get('/subscriptions', authMiddleware, getSubscribedVideos);
router.post('/', authMiddleware, createVideo);
router.post('/:id/like', authMiddleware, likeVideo);
router.post('/:id/dislike', authMiddleware, dislikeVideo);
router.get('/:id', optionalAuth, getVideo);

export default router;