import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Comment } from '../types';
import { getAvatarUrl } from '../utils/avatar';

interface CommentSectionProps {
  videoId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ videoId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      const { data } = await api.get<Comment[]>(`/comments/video/${videoId}`);
      setComments(data);
    };
    fetchComments();
  }, [videoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const payload = {
        content: newComment,
        videoId,
        parentComment: replyingTo?._id || null,
      };
      const { data } = await api.post<Comment>('/comments', payload);
      if (replyingTo) {
        // Add reply to parent comment (simplified: just append to replies)
        setComments(prev => prev.map(c => c._id === replyingTo._id ? { ...c, replies: [...(c.replies || []), data] } : c));
        setReplyingTo(null);
      } else {
        setComments(prev => [data, ...prev]);
      }
      setNewComment('');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Comments</h3>
      {user && (
        <form onSubmit={handleSubmit} className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyingTo ? `Reply to ${replyingTo.userId.displayName}` : "Add a comment..."}
            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            rows={3}
          />
          {replyingTo && (
            <button type="button" onClick={() => setReplyingTo(null)} className="text-sm text-blue-500">Cancel reply</button>
          )}
          <button type="submit" className="mt-2 bg-blue-600 text-white px-4 py-2 rounded">Submit</button>
        </form>
      )}
      <div className="space-y-4">
        {comments.map(comment => (
          <CommentItem key={comment._id} comment={comment} setReplyingTo={setReplyingTo} />
        ))}
      </div>
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  setReplyingTo: (comment: Comment) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, setReplyingTo }) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState(comment.likes.length);
  const [dislikes, setDislikes] = useState(comment.dislikes.length);
  const [userLiked, setUserLiked] = useState(user ? comment.likes.includes(user._id) : false);
  const [userDisliked, setUserDisliked] = useState(user ? comment.dislikes.includes(user._id) : false);

  const handleLike = async () => {
    if (!user) return;
    try {
      await api.post(`/comments/${comment._id}/like`);
      if (userLiked) {
        setLikes(prev => prev - 1);
        setUserLiked(false);
      } else {
        setLikes(prev => prev + 1);
        if (userDisliked) {
          setDislikes(prev => prev - 1);
          setUserDisliked(false);
        }
        setUserLiked(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDislike = async () => {
    if (!user) return;
    try {
      await api.post(`/comments/${comment._id}/dislike`);
      if (userDisliked) {
        setDislikes(prev => prev - 1);
        setUserDisliked(false);
      } else {
        setDislikes(prev => prev + 1);
        if (userLiked) {
          setLikes(prev => prev - 1);
          setUserLiked(false);
        }
        setUserDisliked(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex space-x-3">
      <img
        src={getAvatarUrl(comment.userId.photoURL, comment.userId.displayName)}
        alt={comment.userId.displayName}
        className="w-8 h-8 rounded-full"
      />
      <div className="flex-1">
        <p className="font-semibold">{comment.userId.displayName}</p>
        <p>{comment.content}</p>
        <div className="flex items-center space-x-4 mt-1 text-sm">
          <button onClick={handleLike} className="flex items-center space-x-1">
            <span>👍</span> <span>{likes}</span>
          </button>
          <button onClick={handleDislike} className="flex items-center space-x-1">
            <span>👎</span> <span>{dislikes}</span>
          </button>
          <button onClick={() => setReplyingTo(comment)} className="text-blue-500">Reply</button>
        </div>
        {/* Replies (if any) - for simplicity we don't fetch nested here, but you could */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-8 mt-2 space-y-2">
            {comment.replies.map(reply => (
              <CommentItem key={reply._id} comment={reply} setReplyingTo={setReplyingTo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;