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

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ parentComment: comment._id })
          .populate('userId', 'displayName photoURL')
          .sort('createdAt');
        return {
          ...comment.toObject(),
          replies,
        };
      })
    );

    res.json(commentsWithReplies);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Add a comment or reply
// @route   POST /api/comments
export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { content, videoId, parentComment, city } = req.body;

    // Block comments with special characters (allow only letters, numbers, spaces, and common punctuation)
    const allowedRegex = /^[a-zA-Z0-9\s.,!?;:\-_\'\"()\[\]{}@#$%^&*+=<>]+$/u;
    if (!allowedRegex.test(content)) {
      return res.status(400).json({ error: 'Comment contains disallowed special characters.' });
    }

    const comment = await Comment.create({
      content,
      userId: req.user!._id,
      videoId,
      parentComment: parentComment || null,
      city: city || 'Unknown',
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

    // Toggle dislike
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

    // Auto‑delete if dislike count reaches 2
    if (comment.dislikes.length >= 2) {
      await Comment.findByIdAndDelete(comment._id);
      return res.json({ message: 'Comment removed due to low rating', deleted: true });
    }

    res.json({ likes: comment.likes.length, dislikes: comment.dislikes.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};