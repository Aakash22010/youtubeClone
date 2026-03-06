import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import VideoCard from '../../components/VideoCard';
import { Video } from '../../types';

export default function CategoryPage() {
  const router = useRouter();
  const { name } = router.query;
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (name) {
      const fetchVideos = async () => {
        try {
          const { data } = await api.get(`/videos?category=${name}`);
          setVideos(data);
        } catch (error) {
          console.error('Failed to fetch category videos', error);
        } finally {
          setLoading(false);
        }
      };
      fetchVideos();
    }
  }, [name]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const categoryName = typeof name === 'string' ? name.charAt(0).toUpperCase() + name.slice(1) : '';

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-2">{categoryName}</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {videos.length} {videos.length === 1 ? 'video' : 'videos'} in this category
      </p>

      {videos.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No videos in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}