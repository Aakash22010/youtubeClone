import express from 'express';
import {
  getComments,
  addComment,
  likeComment,
  dislikeComment,
  deleteComment,
} from '../controllers/commentController';
import authMiddleware from '../middleware/auth';

const router = express.Router();

router.get('/video/:videoId', getComments);
router.post('/', authMiddleware, addComment);
router.post('/:id/like', authMiddleware, likeComment);
router.post('/:id/dislike', authMiddleware, dislikeComment);
router.delete('/:id', authMiddleware, deleteComment);

export default router;