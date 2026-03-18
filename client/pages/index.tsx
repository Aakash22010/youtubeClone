import { useEffect, useState } from 'react';
import api from '../lib/api';
import VideoCard from '../components/VideoCard';
import { Video } from '../types';
import Head from 'next/head';
import { generateNextSeo } from 'next-seo/pages';

export default function Home() {
  const [videos,  setVideos]  = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Video[]>('/videos')
      .then(({ data }) => setVideos(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
      </svg>
    </div>
  );

  if (videos.length === 0) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🎬</div>
      <p className="text-gray-500 dark:text-gray-400 font-medium">No videos yet</p>
      <p className="text-sm text-gray-400 mt-1">Be the first to upload!</p>
    </div>
  );

  return (
    <>
      <Head>
        {generateNextSeo({
          title: 'Home',
          description: 'Watch the best videos, music, and streams on YouTube Clone.',
        })}
      </Head>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        {videos.map(video => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>
    </>
  );
}