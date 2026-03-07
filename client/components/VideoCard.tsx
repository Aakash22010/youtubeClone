import Link from 'next/link';
import { Video } from '../types';
import { getAvatarUrl } from '../utils/avatar';

interface VideoCardProps {
  video: Video;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const user = typeof video.userId === 'object' ? video.userId : null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K views`;
    return `${n} views`;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30)  return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  return (
    <div className="group flex flex-col">

      {/* ── Thumbnail ───────────────────────────────────────────────────── */}
      <Link href={`/video/${video._id}`} className="block relative overflow-hidden rounded-xl bg-gray-100 dark:bg-[#1a1a1a] aspect-video">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Dark gradient at bottom for duration readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Duration badge */}
        {video.duration > 0 && (
          <span className="absolute bottom-2 right-2 bg-black/85 text-white text-xs font-medium px-1.5 py-0.5 rounded-md tracking-wide">
            {formatDuration(video.duration)}
          </span>
        )}

        {/* Hover play indicator */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-white translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </Link>

      {/* ── Meta ────────────────────────────────────────────────────────── */}
      <div className="flex gap-3 mt-3">

        {/* Avatar — links to channel */}
        {user && (
          <Link
            href={`/channel/${user._id}`}
            className="flex-shrink-0 mt-0.5"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={getAvatarUrl(user.photoURL, user.displayName)}
              alt={user.displayName}
              className="w-9 h-9 rounded-full object-cover ring-1 ring-transparent hover:ring-gray-300 dark:hover:ring-[#3f3f3f] transition-all"
            />
          </Link>
        )}

        <div className="flex-1 min-w-0">
          {/* Title */}
          <Link href={`/video/${video._id}`}>
            <h3 className="font-medium text-sm leading-snug line-clamp-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {video.title}
            </h3>
          </Link>

          {/* Channel name */}
          {user && (
            <Link
              href={`/channel/${user._id}`}
              className="block text-xs text-gray-500 dark:text-gray-400 mt-1 hover:text-gray-900 dark:hover:text-white transition-colors truncate"
              onClick={e => e.stopPropagation()}
            >
              {user.displayName}
            </Link>
          )}

          {/* Views + date */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {formatViews(video.views)}
            <span className="mx-1">·</span>
            {timeAgo(video.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;