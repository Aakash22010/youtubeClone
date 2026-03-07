import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Comment } from '../types';
import { getAvatarUrl } from '../utils/avatar';
import { translateText } from '../utils/translate';
import { languages } from '../utils/languages';
import axios from 'axios';

// ─── Location Utilities ───────────────────────────────────────────────────────

function getBrowserCoords(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

async function getCityFromBrowser(): Promise<string | null> {
  try {
    const coords = await getBrowserCoords();
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return null;
    const data = await res.json();
    return (
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.hamlet ||
      data.address?.county ||
      null
    );
  } catch {
    return null;
  }
}

async function getCityFromIP(): Promise<string | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.city ?? null;
  } catch {
    return null;
  }
}

async function getUserCity(): Promise<string> {
  const fromBrowser = await getCityFromBrowser();
  if (fromBrowser) return fromBrowser;
  const fromIP = await getCityFromIP();
  if (fromIP) return fromIP;
  return 'Unknown';
}

// ─── CommentSection ───────────────────────────────────────────────────────────

interface CommentSectionProps {
  videoId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ videoId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [userCity, setUserCity] = useState<string>('');
  const [cityStatus, setCityStatus] = useState<'idle' | 'loading' | 'resolved' | 'failed'>('idle');

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      const { data } = await api.get<Comment[]>(`/comments/video/${videoId}`);
      setComments(data);
    };
    fetchComments();
  }, [videoId]);

  // Resolve location once user is available
  useEffect(() => {
    if (!user || cityStatus !== 'idle') return;
    setCityStatus('loading');
    getUserCity()
      .then((city) => {
        setUserCity(city === 'Unknown' ? '' : city);
        setCityStatus(city === 'Unknown' ? 'failed' : 'resolved');
      })
      .catch(() => setCityStatus('failed'));
  }, [user, cityStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const payload = {
        content: newComment,
        videoId,
        parentComment: replyingTo?._id || null,
        city: userCity || 'Unknown',
      };
      const { data } = await api.post<Comment>('/comments', payload);

      if (replyingTo) {
        setComments(prev =>
          prev.map(c =>
            c._id === replyingTo._id
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

  // Recursively remove a comment or reply by id
  const removeComment = (id: string) => {
    setComments(prev => {
      const removeFromTree = (list: Comment[]): Comment[] =>
        list
          .filter(c => c._id !== id)
          .map(c => ({ ...c, replies: c.replies ? removeFromTree(c.replies) : [] }));
      return removeFromTree(prev);
    });
  };

  const cityLabel = (() => {
    if (cityStatus === 'loading') return { text: 'Detecting your location…', color: 'text-gray-400' };
    if (cityStatus === 'resolved') return { text: `📍 Posting from ${userCity}`, color: 'text-green-600 dark:text-green-400' };
    if (cityStatus === 'failed') return { text: '📍 Location unavailable — allow browser access for accurate city', color: 'text-yellow-500' };
    return null;
  })();

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Comments</h3>

      {user && (
        <form onSubmit={handleSubmit} className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyingTo ? `Reply to ${replyingTo.userId.displayName}` : 'Add a comment…'}
            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            rows={3}
          />

          {/* Location status */}
          {cityLabel && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${cityLabel.color}`}>
              {cityStatus === 'loading' && (
                <svg className="animate-spin h-3 w-3 inline-block" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                </svg>
              )}
              {cityLabel.text}
              {cityStatus === 'failed' && (
                <button
                  type="button"
                  onClick={() => setCityStatus('idle')}
                  className="ml-1 underline text-blue-500 hover:text-blue-400"
                >
                  Retry
                </button>
              )}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2">
            {replyingTo && (
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-sm text-blue-500"
              >
                Cancel reply
              </button>
            )}
            <button
              type="submit"
              disabled={!newComment.trim() || cityStatus === 'loading'}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
            >
              {cityStatus === 'loading' ? 'Locating…' : 'Submit'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {comments.map(comment => (
          <CommentItem
            key={comment._id}
            comment={comment}
            setReplyingTo={setReplyingTo}
            onDelete={removeComment}
          />
        ))}
      </div>
    </div>
  );
};

// ─── CommentItem ──────────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: Comment;
  setReplyingTo: (comment: Comment) => void;
  onDelete?: (id: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, setReplyingTo, onDelete }) => {
  const { user } = useAuth();

  // Like / dislike
  const [likes, setLikes] = useState(comment.likes.length);
  const [dislikes, setDislikes] = useState(comment.dislikes.length);
  const [userLiked, setUserLiked] = useState(user ? comment.likes.includes(user._id) : false);
  const [userDisliked, setUserDisliked] = useState(user ? comment.dislikes.includes(user._id) : false);

  // Translation
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');
  const translationCache = useRef<Record<string, string>>({});

  // Custom dropdown
  const [langOpen, setLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    // Toggle off
    if (translated) {
      setTranslated(null);
      return;
    }
    // Serve from cache
    if (translationCache.current[selectedLang]) {
      setTranslated(translationCache.current[selectedLang]);
      return;
    }
    setTranslating(true);
    const result = await translateText(comment.content, selectedLang);
    translationCache.current[selectedLang] = result;
    setTranslated(result);
    setTranslating(false);
  };

  // When lang changes while a translation is showing, auto-translate to the new lang
  const handleLangSelect = async (code: string) => {
    setSelectedLang(code);
    setLangOpen(false);

    if (!translated) return; // not showing a translation — nothing to update

    if (translationCache.current[code]) {
      setTranslated(translationCache.current[code]);
      return;
    }
    setTranslating(true);
    const result = await translateText(comment.content, code);
    translationCache.current[code] = result;
    setTranslated(result);
    setTranslating(false);
  };

  const currentLang = languages.find(l => l.code === selectedLang);

  return (
    <div className="flex space-x-3">
      <img
        src={getAvatarUrl(comment.userId.photoURL, comment.userId.displayName)}
        alt={comment.userId.displayName}
        className="w-8 h-8 rounded-full flex-shrink-0"
      />
      <div className="flex-1 min-w-0">

        {/* Author + city */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm">{comment.userId.displayName}</p>
          {comment.city && comment.city !== 'Unknown' ? (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              📍 {comment.city}
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-600">📍 Location unavailable</span>
          )}
        </div>

        {/* Comment body */}
        <p className="mt-1 text-sm leading-relaxed">
          {translating
            ? <span className="text-gray-400 italic animate-pulse">Translating…</span>
            : (translated || comment.content)
          }
        </p>

        {/* Show original text when translated */}
        {translated && !translating && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
            Original: {comment.content}
          </p>
        )}

        {/* Action bar */}
        <div className="flex items-center flex-wrap gap-3 mt-2 text-sm">

          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 transition-colors ${userLiked
                ? 'text-blue-600 font-semibold'
                : 'text-gray-500 hover:text-blue-600'
              }`}
          >
            <span>👍</span>
            <span>{likes}</span>
          </button>

          {/* Dislike */}
          <button
            onClick={handleDislike}
            className={`flex items-center gap-1 transition-colors ${userDisliked
                ? 'text-red-600 font-semibold'
                : 'text-gray-500 hover:text-red-600'
              }`}
          >
            <span>👎</span>
            <span>{dislikes}</span>
          </button>

          {/* Reply */}
          <button
            onClick={() => setReplyingTo(comment)}
            className="text-blue-500 hover:text-blue-700 transition-colors"
          >
            Reply
          </button>

          {/* Translate controls */}
          <div className="flex items-center gap-1.5 ml-auto" ref={dropdownRef}>

            {/* Custom language dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen(prev => !prev)}
                className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-1 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <span>🌐</span>
                <span>{currentLang?.name ?? 'Language'}</span>
                <svg
                  className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${langOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {langOpen && (
                <div className="absolute bottom-full mb-1.5 left-0 z-50 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                  <div className="max-h-52 overflow-y-auto py-1">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLangSelect(lang.code)}
                        className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${selectedLang === lang.code
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                      >
                        {lang.name}
                        {selectedLang === lang.code && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {user && comment.userId._id === user._id && (
              <button
                onClick={async () => {
                  if (!confirm('Delete this comment?')) return;
                  try {
                    await api.delete(`/comments/${comment._id}`);
                    onDelete?.(comment._id);
                  } catch (error) {
                    console.error('Failed to delete comment', error);
                  }
                }}
                className="text-red-500 hover:text-red-700 transition-colors text-sm"
                title="Delete your comment"
              >
                🗑️
              </button>
            )}

            {/* Translate / Original button */}
            <button
              onClick={handleTranslate}
              disabled={translating}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-all duration-150 ${translating
                  ? 'text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                  : translated
                    ? 'text-orange-500 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950'
                    : 'text-blue-500 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950'
                }`}
            >
              {translating ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                  </svg>
                  Translating
                </span>
              ) : translated ? '↩ Original' : '⇄ Translate'}
            </button>

          </div>
        </div>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-8 mt-3 space-y-3 border-l-2 border-gray-100 dark:border-gray-800 pl-4">
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