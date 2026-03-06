import { Request, Response } from 'express';
import Comment from '../models/Comment';
import { AuthRequest } from '../middleware/auth';

// @desc    Get comments for a video
// @route   GET /api/comments/video/:videoId
export const getComments = async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const comments = await Comment.find({ videoId, parentComment: null })
      .populate('userId', 'displayName photoURL')
      .sort('-createdAt');
    // For each comment, fetch replies (simplified: client can fetch separately or we populate)
    // We'll just return top-level, client can fetch replies per comment.
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Add a comment or reply
// @route   POST /api/comments
export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { content, videoId, parentComment } = req.body;
    const comment = await Comment.create({
      content,
      userId: req.user!._id,
      videoId,
      parentComment: parentComment || null,
    });
    await comment.populate('userId', 'displayName photoURL');
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Like a comment
// @route   POST /api/comments/:id/like
export const likeComment = async (req: AuthRequest, res: Response) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const userId = req.user!._id;
    if (comment.likes.some(id => id.toString() === userId.toString())) {
      comment.likes = comment.likes.filter(
        id => id.toString() !== userId.toString()
      );
    } else {
      comment.likes.push(userId);
      comment.dislikes = comment.dislikes.filter(
        id => id.toString() !== userId.toString()
      );
    }
    await comment.save();
    res.json({ likes: comment.likes.length, dislikes: comment.dislikes.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Dislike a comment
// @route   POST /api/comments/:id/dislike
export const dislikeComment = async (req: AuthRequest, res: Response) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const userId = req.user!._id;
    if (comment.dislikes.some(id => id.toString() === userId.toString())) {
      comment.dislikes = comment.dislikes.filter(
        id => id.toString() !== userId.toString()
      );
    } else {
      comment.dislikes.push(userId);
      comment.likes = comment.likes.filter(
        id => id.toString() !== userId.toString()
      );
    }
    await comment.save();
    res.json({ likes: comment.likes.length, dislikes: comment.dislikes.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};