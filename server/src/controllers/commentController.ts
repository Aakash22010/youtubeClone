import { Request, Response } from 'express';
import Comment, { IComment } from '../models/Comment';
import { AuthRequest } from '../middleware/auth';

// @desc    Get comments for a video (with nested replies)
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

    // Block special characters (allow only letters, numbers, spaces, and common punctuation)
    const allowedRegex = /^[a-zA-Z0-9\s.,!?;:\-_'"()\[\]{}@#$%^&*+=<>]+$/u;
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

    const userId = req.user!._id.toString();

    if (comment.likes.some(id => id.toString() === userId)) {
      // User already liked → remove like
      comment.likes = comment.likes.filter(id => id.toString() !== userId);
    } else {
      // Add like and remove dislike if present
      comment.likes.push(req.user!._id);
      comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId);
    }

    await comment.save();
    res.json({ likes: comment.likes.length, dislikes: comment.dislikes.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Dislike a comment (auto‑delete after 2 dislikes)
// @route   POST /api/comments/:id/dislike
export const dislikeComment = async (req: AuthRequest, res: Response) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const userId = req.user!._id.toString();

    if (comment.dislikes.some(id => id.toString() === userId)) {
      // User already disliked → remove dislike
      comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId);
    } else {
      // Add dislike and remove like if present
      comment.dislikes.push(req.user!._id);
      comment.likes = comment.likes.filter(id => id.toString() !== userId);
    }

    await comment.save();

    // Auto‑delete if total dislikes reach 2
    if (comment.dislikes.length >= 2) {
      await Comment.findByIdAndDelete(comment._id);
      return res.json({ deleted: true, message: 'Comment removed due to low rating' });
    }

    res.json({ likes: comment.likes.length, dislikes: comment.dislikes.length, deleted: false });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (comment.userId.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Comment.deleteMany({ parentComment: comment._id });
    await Comment.findByIdAndDelete(comment._id);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};