import express from 'express';
import authMiddleware from '../middleware/auth';
import {
  getUserPlaylists,
  getPlaylist,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  getWatchLater,
} from '../controllers/playlistController';

const router = express.Router();

// All playlist routes require authentication
router.use(authMiddleware);

router.get('/', getUserPlaylists);
// Must precede '/:id', or Express matches the literal path as an id.
router.get('/watch-later', getWatchLater);
router.get('/:id', getPlaylist);
router.post('/', createPlaylist);
router.put('/:id', updatePlaylist);
router.delete('/:id', deletePlaylist);
router.post('/:id/videos', addVideoToPlaylist);
router.delete('/:id/videos/:videoId', removeVideoFromPlaylist);

export default router;