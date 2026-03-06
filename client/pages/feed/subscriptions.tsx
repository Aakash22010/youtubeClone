import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import api from '../../lib/api';
import VideoCard from '../../components/VideoCard';
import { Video, User } from '../../types';
import Link from 'next/link';

export default function Subscriptions() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [subscribedChannels, setSubscribedChannels] = useState<User[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      Promise.all([fetchVideos(), fetchSubscribedChannels()]).finally(() =>
        setFetching(false)
      );
    }
  }, [user, loading]);

  const fetchVideos = async () => {
    try {
      const { data } = await api.get('/videos/subscriptions');
      setVideos(data);
    } catch (error) {
      console.error('Failed to fetch subscription videos', error);
    }
  };

  const fetchSubscribedChannels = async () => {
    try {
      const { data } = await api.get('/users/subscriptions');
      setSubscribedChannels(data);
    } catch (error) {
      console.error('Failed to fetch subscribed channels', error);
    }
  };

  if (loading || fetching) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Subscriptions</h1>

      {/* Subscribed channels horizontal list */}
      {subscribedChannels.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Channels you're subscribed to</h2>
          <div className="flex overflow-x-auto space-x-4 pb-2 scrollbar-hide">
            {subscribedChannels.map((channel) => (
              <Link
                key={channel._id}
                href={`/channel/${channel._id}`}
                className="flex flex-col items-center min-w-[80px] group"
              >
                <img
                  src={channel.photoURL || '/default-avatar.png'}
                  alt={channel.displayName}
                  className="w-16 h-16 rounded-full object-cover group-hover:ring-2 ring-blue-500"
                />
                <span className="text-xs mt-1 text-center line-clamp-2">
                  {channel.displayName}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Videos grid */}
      {videos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No videos from your subscriptions yet.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Subscribe to channels to see their latest videos here.
          </p>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold mb-3">Latest videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}