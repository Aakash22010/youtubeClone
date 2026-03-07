import express from 'express';
import { downloadVideo, getDownloads } from '../controllers/downloadController';
import authMiddleware from '../middleware/auth';

const router = express.Router();

router.get('/',              authMiddleware, getDownloads);
router.post('/:videoId',     authMiddleware, downloadVideo);

export default router;