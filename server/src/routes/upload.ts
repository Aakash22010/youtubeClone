import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/auth';
import { uploadVideo, uploadThumbnail } from '../controllers/videoController';
import { uploadAvatar, uploadBanner } from '../controllers/userController';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } 
});

router.post('/video', authMiddleware, upload.single('file'), uploadVideo);
router.post('/thumbnail', authMiddleware, upload.single('file'), uploadThumbnail);
router.post('/avatar', authMiddleware, upload.single('file'), uploadAvatar);
router.post('/banner', authMiddleware, upload.single('file'), uploadBanner);

export default router;