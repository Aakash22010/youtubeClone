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
  const [videos,   setVideos]   = useState<Video[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) api.get('/videos/liked').then(({ data }) => setVideos(data)).catch(console.error).finally(() => setFetching(false));
  }, [user, loading]);

  const handleUnlike = async (videoId: string) => {
    try {
      await api.post(`/videos/${videoId}/like`);
      setVideos(prev => prev.filter(v => v._id !== videoId));
    } catch (err) { console.error(err); }
  };

  if (loading || fetching) return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
      </svg>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <FiHeart className="text-xl sm:text-2xl text-red-600 flex-shrink-0"/>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Liked videos</h1>
        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {videos.length} {videos.length === 1 ? 'video' : 'videos'}
        </span>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-16">
          <FiHeart className="mx-auto text-4xl text-gray-300 dark:text-gray-600 mb-3"/>
          <p className="text-gray-500 dark:text-gray-400">No liked videos yet.</p>
          <p className="text-sm text-gray-400 mt-1">Videos you like will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {videos.map(video => (
            <div key={video._id} className="relative group">
              <VideoCard video={video}/>
              <button
                onClick={() => handleUnlike(video._id)}
                className="absolute top-2 right-2 bg-black/70 text-white p-1.5 sm:p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Unlike"
              >
                <FiHeart className="fill-white" size={14}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}