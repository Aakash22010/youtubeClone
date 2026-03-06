// client/components/VideoCard.tsx (improved styling)
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

  return (
    <Link href={`/video/${video._id}`} className="group cursor-pointer block">
      <div className="relative">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-48 object-cover rounded-xl group-hover:rounded-none transition-all duration-200"
        />
        <span className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-1 py-0.5 rounded font-mono">
          {formatDuration(video.duration)}
        </span>
      </div>
      <div className="flex mt-3">
        {user && (
          <img
            src={getAvatarUrl(user.photoURL, user.displayName)}
            alt={user.displayName}
            className="w-9 h-9 rounded-full mr-3"
          />
        )}
        <div>
          <h3 className="font-medium text-sm leading-tight line-clamp-2 text-gray-900 dark:text-white">
            {video.title}
          </h3>
          {user && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 hover:text-gray-900 dark:hover:text-white">
              {user.displayName}
            </p>
          )}
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {video.views} views • {new Date(video.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default VideoCard;