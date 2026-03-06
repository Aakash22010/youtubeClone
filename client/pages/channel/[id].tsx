import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import VideoCard from '../../components/VideoCard';
import { User, Video } from '../../types';
import { getAvatarUrl } from '../../utils/avatar';
import SubscribeButton from '../../components/SubscribeButton';

export default function ChannelPage() {
  const router = useRouter();
  const { id } = router.query;
  const [channel, setChannel] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeTab, setActiveTab] = useState<'videos' | 'playlists' | 'about'>('videos');
  const [subscribersCount, setSubscribersCount] = useState(0);

  useEffect(() => {
    if (id) {
      const fetchChannel = async () => {
        const { data } = await api.get<User>(`/users/${id}`);
        setChannel(data);
        setSubscribersCount(data.subscribers?.length || 0);
      };
      const fetchVideos = async () => {
        const { data } = await api.get<Video[]>(`/videos?userId=${id}`);
        setVideos(data);
      };
      fetchChannel();
      fetchVideos();
    }
  }, [id]);

  if (!channel) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f]">
      <div className="flex">
        <main className="flex-1 p-4">
          <div className="max-w-full lg:max-w-5xl mx-auto">
            {/* Banner */}
            <div
              className="h-32 sm:h-48 bg-gray-300 rounded-t-lg"
              style={{
                backgroundImage: `url(${channel.banner})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="flex flex-col sm:flex-row items-start sm:items-center p-4">
  <img
    src={getAvatarUrl(channel.photoURL, channel.displayName)}
    alt={channel.displayName}
    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full -mt-8 sm:-mt-10 border-4 border-white dark:border-[#0f0f0f]"
  />
  <div className="mt-2 sm:mt-0 sm:ml-4 flex-1">
    <h1 className="text-xl sm:text-2xl font-bold">{channel.displayName}</h1>
    <p className="text-sm text-gray-600 dark:text-gray-400">
      {subscribersCount} subscribers
    </p>
  </div>
  <SubscribeButton channelId={channel._id} className="mt-4 sm:mt-0" />
</div>
            {/* Tabs */}
            <div className="flex overflow-x-auto border-b scrollbar-hide">
              <button className={`px-4 py-2 whitespace-nowrap ${activeTab === 'videos' ? 'border-b-2 border-blue-600 font-medium' : ''}`} onClick={() => setActiveTab('videos')}>Videos</button>
              <button className={`px-4 py-2 whitespace-nowrap ${activeTab === 'playlists' ? 'border-b-2 border-blue-600 font-medium' : ''}`} onClick={() => setActiveTab('playlists')}>Playlists</button>
              <button className={`px-4 py-2 whitespace-nowrap ${activeTab === 'about' ? 'border-b-2 border-blue-600 font-medium' : ''}`} onClick={() => setActiveTab('about')}>About</button>
            </div>
            {/* Content */}
            {activeTab === 'videos' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {videos.map(video => <VideoCard key={video._id} video={video} />)}
              </div>
            )}
            {activeTab === 'about' && (
              <div className="mt-4 p-4">
                <p>{channel.description || 'No description yet.'}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}