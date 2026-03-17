import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import VideoCard from '../../components/VideoCard';
import { Video } from '../../types';

export default function CategoryPage() {
  const router        = useRouter();
  const { name }      = router.query;
  const [videos,   setVideos]  = useState<Video[]>([]);
  const [loading,  setLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    api.get(`/videos?category=${name}`)
      .then(({ data }) => setVideos(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [name]);

  const categoryName = typeof name === 'string'
    ? name.charAt(0).toUpperCase() + name.slice(1)
    : '';

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
      </svg>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{categoryName}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {videos.length} {videos.length === 1 ? 'video' : 'videos'}
        </p>
      </div>
      {videos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-gray-500 dark:text-gray-400">No videos in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {videos.map(video => <VideoCard key={video._id} video={video}/>)}
        </div>
      )}
    </div>
  );
}