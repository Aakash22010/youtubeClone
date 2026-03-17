import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../lib/api';
import VideoCard from '../../components/VideoCard';
import { Video, User } from '../../types';
import { getAvatarUrl } from '../../utils/avatar';

export default function Subscriptions() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [videos,   setVideos]   = useState<Video[]>([]);
  const [channels, setChannels] = useState<User[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) {
      Promise.all([
        api.get('/videos/subscriptions').then(({ data }) => setVideos(data)).catch(console.error),
        api.get('/users/subscriptions').then(({ data }) => setChannels(data)).catch(console.error),
      ]).finally(() => setFetching(false));
    }
  }, [user, loading]);

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
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">Subscriptions</h1>

      {/* Subscribed channels row */}
      {channels.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <h2 className="text-sm sm:text-base font-semibold mb-3 text-gray-700 dark:text-gray-300">
            Channels you follow
          </h2>
          <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-2 scrollbar-hide">
            {channels.map(channel => (
              <Link
                key={channel._id}
                href={`/channel/${channel._id}`}
                className="flex flex-col items-center min-w-[60px] sm:min-w-[72px] group"
              >
                <img
                  src={getAvatarUrl(channel.photoURL, channel.displayName)}
                  alt={channel.displayName}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover group-hover:ring-2 ring-blue-500 transition-all"
                />
                <span className="text-xs mt-1 text-center line-clamp-2 text-gray-700 dark:text-gray-300 max-w-[60px] sm:max-w-[72px]">
                  {channel.displayName}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {videos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📡</div>
          <p className="text-gray-500 dark:text-gray-400">No videos from your subscriptions yet.</p>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Subscribe to channels to see their latest videos here.</p>
        </div>
      ) : (
        <>
          <h2 className="text-sm sm:text-base font-semibold mb-3 text-gray-700 dark:text-gray-300">Latest videos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
            {videos.map(video => <VideoCard key={video._id} video={video}/>)}
          </div>
        </>
      )}
    </div>
  );
}