import express from 'express';
import authMiddleware from '../middleware/auth';
import {
  addToHistory,
  getHistory,
  removeFromHistory,
  clearHistory,
} from '../controllers/historyController';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.post('/:videoId', addToHistory);
router.get('/', getHistory);
router.delete('/:videoId', removeFromHistory);
router.delete('/', clearHistory);

export default router;