import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Comment } from '../types';
import { getAvatarUrl } from '../utils/avatar';
import { getUserCity } from '../utils/location';
import { translateText } from '../utils/translate';
import { languages } from '../utils/languages';
import axios from 'axios';

interface CommentSectionProps {
  videoId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ videoId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [userCity, setUserCity] = useState<string>('');

  useEffect(() => {
    const fetchComments = async () => {
      const { data } = await api.get<Comment[]>(`/comments/video/${videoId}`);
      setComments(data);
    };
    fetchComments();
    getUserCity().then(setUserCity);
  }, [videoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const payload = {
        content: newComment,
        videoId,
        parentComment: replyingTo?._id || null,
        city: userCity,
      };
      const { data } = await api.post<Comment>('/comments', payload);
      if (replyingTo) {
        // Add reply to parent comment
        setComments(prev =>
          prev.map(c => c._id === replyingTo._id
            ? { ...c, replies: [...(c.replies || []), data] }
            : c
          )
        );
        setReplyingTo(null);
      } else {
        setComments(prev => [data, ...prev]);
      }
      setNewComment('');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        alert(error.response.data.error || 'Comment contains disallowed special characters.');
      } else {
        console.error(error);
      }
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
            <button type="button" onClick={() => setReplyingTo(null)} className="text-sm text-blue-500">
              Cancel reply
            </button>
          )}
          <button type="submit" className="mt-2 bg-blue-600 text-white px-4 py-2 rounded">
            Submit
          </button>
        </form>
      )}
      <div className="space-y-4">
        {comments.map(comment => (
          <CommentItem
            key={comment._id}
            comment={comment}
            setReplyingTo={setReplyingTo}
            onDelete={(deletedId) => setComments(prev => prev.filter(c => c._id !== deletedId))}
          />
        ))}
      </div>
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  setReplyingTo: (comment: Comment) => void;
  onDelete?: (id: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, setReplyingTo, onDelete }) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState(comment.likes.length);
  const [dislikes, setDislikes] = useState(comment.dislikes.length);
  const [userLiked, setUserLiked] = useState(user ? comment.likes.includes(user._id) : false);
  const [userDisliked, setUserDisliked] = useState(user ? comment.dislikes.includes(user._id) : false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');

  const handleLike = async () => {
    if (!user) return;
    try {
      const { data } = await api.post(`/comments/${comment._id}/like`);
      setLikes(data.likes);
      setDislikes(data.dislikes);
      if (userLiked) {
        setUserLiked(false);
      } else {
        setUserLiked(true);
        setUserDisliked(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDislike = async () => {
    if (!user) return;
    try {
      const { data } = await api.post(`/comments/${comment._id}/dislike`);
      if (data.deleted) {
        // Comment was auto‑deleted due to 2 dislikes
        onDelete?.(comment._id);
        return;
      }
      setLikes(data.likes);
      setDislikes(data.dislikes);
      if (userDisliked) {
        setUserDisliked(false);
      } else {
        setUserDisliked(true);
        setUserLiked(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleTranslate = async () => {
    if (translated) {
      setTranslated(null);
      return;
    }
    setTranslating(true);
    const result = await translateText(comment.content, selectedLang);
    setTranslated(result);
    setTranslating(false);
  };

  return (
    <div className="flex space-x-3">
      <img
        src={getAvatarUrl(comment.userId.photoURL, comment.userId.displayName)}
        alt={comment.userId.displayName}
        className="w-8 h-8 rounded-full"
      />
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <p className="font-semibold">{comment.userId.displayName}</p>
          {comment.city ? (
            <span className="text-xs text-gray-500 dark:text-gray-400">📍 {comment.city}</span>
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400">📍 Unknown</span>
          )}
        </div>
        <p>{translated || comment.content}</p>
        {translated && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Original: {comment.content}
          </p>
        )}
        <div className="flex items-center space-x-4 mt-1 text-sm flex-wrap gap-2">
          <button onClick={handleLike} className="flex items-center space-x-1 hover:text-blue-600">
            <span>👍</span> <span>{likes}</span>
          </button>
          <button onClick={handleDislike} className="flex items-center space-x-1 hover:text-red-600">
            <span>👎</span> <span>{dislikes}</span>
          </button>
          <button onClick={() => setReplyingTo(comment)} className="text-blue-500 hover:text-blue-700">
            Reply
          </button>
          <div className="flex items-center gap-1.5 mt-1">
  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-0.5">
    <span className="text-gray-400 text-xs">🌐</span>
    <select
      value={selectedLang}
      onChange={(e) => setSelectedLang(e.target.value)}
      className="text-xs bg-transparent text-gray-600 dark:text-gray-300 outline-none cursor-pointer pr-1"
    >
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>{lang.name}</option>
      ))}
    </select>
  </div>

  <button
    onClick={handleTranslate}
    disabled={translating}
    className={`
      text-xs px-3 py-0.5 rounded-full border font-medium transition-all duration-150
      ${translating
        ? 'text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed'
        : translated
          ? 'text-orange-500 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950'
          : 'text-blue-500 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950'
      }
    `}
  >
    {translating ? (
      <span className="flex items-center gap-1">
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
        </svg>
        Translating
      </span>
    ) : translated ? '↩ Original' : '⇄ Translate'}
  </button>
</div>
        </div>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-8 mt-2 space-y-2">
            {comment.replies.map(reply => (
              <CommentItem
                key={reply._id}
                comment={reply}
                setReplyingTo={setReplyingTo}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;