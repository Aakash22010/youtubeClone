import { useEffect, useState } from 'react';
import api from '../lib/api';
import VideoCard from '../components/VideoCard';
import { Video } from '../types';

export default function Explore() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const { data } = await api.get('/videos/trending');
        setVideos(data);
      } catch (error) {
        console.error('Failed to fetch trending videos', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Explore</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">Trending videos</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
        {videos.map((video) => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>
    </div>
  );
}