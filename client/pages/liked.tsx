import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import api from '../lib/api';
import VideoCard from '../components/VideoCard';
import { Video } from '../types';
import { FiHeart } from 'react-icons/fi';

export default function LikedVideos() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      fetchLikedVideos();
    }
  }, [user, loading]);

  const fetchLikedVideos = async () => {
    try {
      const { data } = await api.get('/videos/liked');
      setVideos(data);
    } catch (error) {
      console.error('Failed to fetch liked videos', error);
    } finally {
      setFetching(false);
    }
  };

  const handleUnlike = async (videoId: string) => {
    try {
      await api.post(`/videos/${videoId}/like`); // toggles like off
      setVideos(prev => prev.filter(v => v._id !== videoId));
    } catch (error) {
      console.error('Failed to unlike', error);
    }
  };

  if (loading || fetching) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex items-center space-x-3 mb-6">
        <FiHeart className="text-2xl text-red-600" />
        <h1 className="text-2xl font-bold">Liked videos</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {videos.length} {videos.length === 1 ? 'video' : 'videos'}
        </span>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-12">
          <FiHeart className="mx-auto text-4xl text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No liked videos yet.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Videos you like will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
          {videos.map((video) => (
            <div key={video._id} className="relative group">
              <VideoCard video={video} />
              <button
                onClick={() => handleUnlike(video._id)}
                className="absolute top-2 right-2 bg-black bg-opacity-70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Remove from liked videos"
              >
                <FiHeart className="fill-white" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}