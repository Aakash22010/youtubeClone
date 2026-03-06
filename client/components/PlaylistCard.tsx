import Link from 'next/link';
import { Playlist } from '../types';

interface PlaylistCardProps {
  playlist: Playlist;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist }) => {
  const videoCount = playlist.videos.length;
  return (
    <Link href={`/playlist/${playlist._id}`} className="block group">
      <div className="relative">
        <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
          {videoCount > 0 ? (
            <img
              src={playlist.videos[0]?.thumbnailUrl || '/placeholder.png'}
              alt={playlist.name}
              className="w-full h-full object-cover group-hover:scale-105 transition"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              No videos
            </div>
          )}
        </div>
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          {videoCount} {videoCount === 1 ? 'video' : 'videos'}
        </div>
      </div>
      <h3 className="font-semibold mt-2 line-clamp-1">{playlist.name}</h3>
      {playlist.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{playlist.description}</p>
      )}
    </Link>
  );
};

export default PlaylistCard;