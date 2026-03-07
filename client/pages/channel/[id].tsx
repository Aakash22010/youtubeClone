import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import VideoCard from '../../components/VideoCard';
import { User, Video } from '../../types';
import { getAvatarUrl } from '../../utils/avatar';
import SubscribeButton from '../../components/SubscribeButton';

type Tab = 'videos' | 'playlists' | 'about';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function ChannelPage() {
  const router = useRouter();
  const { id } = router.query;

  const [channel,          setChannel]          = useState<User | null>(null);
  const [videos,           setVideos]           = useState<Video[]>([]);
  const [activeTab,        setActiveTab]        = useState<Tab>('videos');
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [loading,          setLoading]          = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get<User>(`/users/${id}`),
      api.get<Video[]>(`/videos?userId=${id}`),
    ])
      .then(([userRes, videosRes]) => {
        setChannel(userRes.data);
        setSubscribersCount(userRes.data.subscribers?.length || 0);
        setVideos(videosRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
        </svg>
      </div>
    );
  }

  if (!channel) {
    return <div className="text-center mt-20 text-gray-500">Channel not found.</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'videos',    label: `Videos (${videos.length})` },
    { key: 'playlists', label: 'Playlists' },
    { key: 'about',     label: 'About' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-white">
      <main className="flex-1">
        <div className="max-w-full lg:max-w-5xl mx-auto">

          {/* ── Banner ──────────────────────────────────────────────────────── */}
          <div
            className="w-full h-36 sm:h-52 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-[#1a1a1a] dark:to-[#272727] bg-cover bg-center"
            style={channel.banner ? { backgroundImage: `url(${channel.banner})` } : {}}
          />

          {/* ── Profile header ───────────────────────────────────────────────── */}
          <div className="px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12 mb-4">

              {/* Avatar */}
              <img
                src={getAvatarUrl(channel.photoURL, channel.displayName)}
                alt={channel.displayName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white dark:border-[#0f0f0f] object-cover shadow-md flex-shrink-0"
              />

              {/* Name + stats */}
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold">{channel.displayName}</h1>
                  {(channel as any).isPremium && (
                    <span className="text-xs bg-yellow-400 text-yellow-900 font-semibold px-2 py-0.5 rounded-full">
                      ⭐ Premium
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatCount(subscribersCount)} subscriber{subscribersCount !== 1 ? 's' : ''}
                  <span className="mx-1.5">·</span>
                  {videos.length} video{videos.length !== 1 ? 's' : ''}
                </p>
                {channel.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 max-w-xl">
                    {channel.description}
                  </p>
                )}
              </div>

              {/* Subscribe */}
              <div className="pb-1">
                <SubscribeButton channelId={channel._id} />
              </div>
            </div>

            {/* ── Tabs ─────────────────────────────────────────────────────── */}
            <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-200 dark:border-[#272727]">
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                    activeTab === key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab content ──────────────────────────────────────────────────── */}
          <div className="px-4 sm:px-6 mt-5 pb-12">

            {/* Videos */}
            {activeTab === 'videos' && (
              <>
                {videos.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-5xl mb-4">🎬</div>
                    <p className="text-gray-400 font-medium">No videos yet</p>
                    <p className="text-gray-500 text-sm mt-1">This channel hasn't uploaded anything.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                    {videos.map(video => (
                      <VideoCard key={video._id} video={video} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Playlists */}
            {activeTab === 'playlists' && (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-gray-400 font-medium">No playlists yet</p>
                <p className="text-gray-500 text-sm mt-1">This channel hasn't created any public playlists.</p>
              </div>
            )}

            {/* About */}
            {activeTab === 'about' && (
              <div className="max-w-2xl space-y-6 mt-2">

                {/* Description */}
                <div>
                  <h2 className="text-base font-semibold mb-2 text-gray-900 dark:text-white">Description</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                    {channel.description || 'This channel has no description yet.'}
                  </p>
                </div>

                <hr className="border-gray-200 dark:border-[#272727]" />

                {/* Stats */}
                <div>
                  <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Stats</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Subscribers', value: formatCount(subscribersCount) },
                      { label: 'Videos',       value: String(videos.length) },
                      {
                        label: 'Joined',
                        value: new Date(channel.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long',
                        }),
                      },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="bg-gray-50 dark:bg-[#1a1a1a] rounded-xl px-4 py-3 border border-gray-100 dark:border-[#272727]"
                      >
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}