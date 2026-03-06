import { useEffect, useState } from 'react';
import api from '../lib/api';
import VideoCard from '../components/VideoCard';
import { Video } from '../types';

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await api.get<Video[]>('/videos');
      setVideos(data);
    };
    fetchVideos();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
      {videos.map(video => (
        <VideoCard key={video._id} video={video} />
      ))}
    </div>
  );
}