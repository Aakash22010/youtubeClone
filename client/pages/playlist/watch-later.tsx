import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import api from '../../lib/api';
import VideoCard from '../../components/VideoCard';
import { Playlist } from '../../types';
import { FiClock } from 'react-icons/fi';

export default function WatchLater() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) fetchWatchLater();
  }, [user, loading]);

  const fetchWatchLater = async () => {
    try {
      const { data } = await api.get('/playlists/watch-later');
      setPlaylist(data);
    } catch (error) {
      console.error('Failed to fetch watch later', error);
    } finally {
      setFetching(false);
    }
  };

  const handleRemove = async (videoId: string) => {
    try {
      await api.delete(`/playlists/${playlist!._id}/videos/${videoId}`);
      setPlaylist(prev => prev ? { ...prev, videos: prev.videos.filter(v => v._id !== videoId) } : null);
    } catch (error) {
      console.error('Failed to remove', error);
    }
  };

  if (loading || fetching) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex items-center space-x-3 mb-6">
        <FiClock className="text-2xl text-blue-600" />
        <h1 className="text-2xl font-bold">Watch Later</h1>
        <span className="text-sm text-gray-500">
          {playlist?.videos.length || 0} videos
        </span>
      </div>

      {!playlist || playlist.videos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No videos saved for later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {playlist.videos.map((video) => (
            <div key={video._id} className="relative group">
              <VideoCard video={video} />
              <button
                onClick={() => handleRemove(video._id)}
                className="absolute top-2 right-2 bg-black bg-opacity-70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                title="Remove from Watch Later"
              >
                <FiClock size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}