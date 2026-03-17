import Link from 'next/link';
import { Playlist } from '../types';

interface PlaylistCardProps {
  playlist: Playlist;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist }) => {
  const videoCount = playlist.videos.length;

  return (
    <Link href={`/playlist/${playlist._id}`} className="block group">
      {/* Thumbnail stack effect */}
      <div className="relative">
        {/* Stack layers behind */}
        <div className="absolute inset-x-2 -bottom-1 h-full bg-gray-200 dark:bg-gray-700 rounded-lg opacity-60"/>
        <div className="absolute inset-x-1 -bottom-0.5 h-full bg-gray-300 dark:bg-gray-600 rounded-lg opacity-60"/>

        {/* Main thumbnail */}
        <div className="relative aspect-video bg-gray-200 dark:bg-[#272727] rounded-lg overflow-hidden">
          {videoCount > 0 ? (
            <img
              src={playlist.videos[0]?.thumbnailUrl || '/placeholder.png'}
              alt={playlist.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-1">
              <span className="text-2xl">📋</span>
              <span className="text-xs">No videos</span>
            </div>
          )}

          {/* Video count badge */}
          <div className="absolute bottom-0 right-0 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded-tl-lg">
            {videoCount} {videoCount === 1 ? 'video' : 'videos'}
          </div>

          {/* Play all overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex items-center gap-1.5 bg-white/90 text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-full">
              ▶ Play all
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-3">
        <h3 className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {playlist.name}
        </h3>
        {playlist.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">
            {playlist.description}
          </p>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {playlist.isPublic ? 'Public' : 'Private'} playlist
        </p>
      </div>
    </Link>
  );
};

export default PlaylistCard;