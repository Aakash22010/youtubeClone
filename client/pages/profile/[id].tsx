import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import type { NextPage } from 'next';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarUrl } from '../../utils/avatar';
import PremiumModal from '../../components/PremiumModal';
import DownloadButton from '../../components/DownloadButton';
import { Video, UserProfile, DownloadEntry, DlMeta } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Tab = 'videos' | 'downloads';

function formatDuration(s: number): string {
  const m   = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ProfilePage: NextPage = () => {
  const router       = useRouter();
  const { id }       = router.query as { id: string };
  const { user: me } = useAuth();

  const [profile,     setProfile]    = useState<UserProfile | null>(null);
  const [videos,      setVideos]     = useState<Video[]>([]);
  const [downloads,   setDownloads]  = useState<DownloadEntry[]>([]);
  const [dlMeta,      setDlMeta]     = useState<DlMeta>({
    isPremium:          false,
    dailyDownloadCount: 0,
    dailyLimit:         1,
  });
  const [tab,         setTab]        = useState<Tab>('videos');
  const [loading,     setLoading]    = useState(true);
  const [showPremium, setShowPremium] = useState(false);

  const isOwnProfile = !!me && me._id === id;

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    const [userRes, videosRes] = await Promise.all([
      api.get<UserProfile>(`/users/${id}`),
      api.get<Video[]>(`/users/${id}/videos`),
    ]);
    setProfile(userRes.data);
    setVideos(videosRes.data);
  }, [id]);

  const fetchDownloads = useCallback(async () => {
    if (!isOwnProfile) return;
    const { data } = await api.get<{
      downloads: DownloadEntry[];
      isPremium: boolean;
      dailyDownloadCount: number;
      dailyLimit: number;
    }>('/downloads');
    setDownloads(data.downloads);
    setDlMeta({
      isPremium:          data.isPremium,
      dailyDownloadCount: data.dailyDownloadCount,
      dailyLimit:         data.dailyLimit,
    });
  }, [isOwnProfile]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchProfile(), fetchDownloads()])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, fetchProfile, fetchDownloads]);

  // ── Callbacks ────────────────────────────────────────────────────────────

  const handlePremiumSuccess = () => {
    setDlMeta(prev  => ({ ...prev, isPremium: true }));
    setProfile(prev => prev ? { ...prev, isPremium: true } : prev);
  };

  const handleDownloaded = () => {
    setDlMeta(prev => ({ ...prev, dailyDownloadCount: prev.dailyDownloadCount + 1 }));
    fetchDownloads();
  };

  // ── Loading / error states ───────────────────────────────────────────────

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

  if (!profile) {
    return (
      <div className="text-center mt-20 text-gray-500">User not found.</div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">

      {/* Banner */}
      <div
        className="w-full h-40 md:h-56 bg-gradient-to-r from-blue-600 to-purple-600 bg-cover bg-center"
        style={profile.banner ? { backgroundImage: `url(${profile.banner})` } : {}}
      />

      <div className="max-w-5xl mx-auto px-4">

        {/* ── Profile header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12 mb-6">
          <img
            src={getAvatarUrl(profile.photoURL, profile.displayName)}
            alt={profile.displayName}
            className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-950 shadow-lg flex-shrink-0 object-cover"
          />

          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{profile.displayName}</h1>
              {profile.isPremium && (
                <span className="text-xs bg-yellow-400 text-yellow-900 font-semibold px-2 py-0.5 rounded-full">
                  ⭐ Premium
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
              {profile.subscribers.length} subscriber{profile.subscribers.length !== 1 ? 's' : ''}
              {' · '}
              {videos.length} video{videos.length !== 1 ? 's' : ''}
            </p>
            {profile.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-xl line-clamp-2">
                {profile.description}
              </p>
            )}
          </div>

          {/* Own-profile actions */}
          {isOwnProfile && (
            <div className="flex items-center gap-2 pb-1 flex-wrap">
              {!profile.isPremium && (
                <button
                  onClick={() => setShowPremium(true)}
                  className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold text-sm px-4 py-2 rounded-full transition"
                >
                  ⭐ Upgrade to Premium
                </button>
              )}
              <Link
                href="/settings"
                className="text-sm px-4 py-2 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Edit profile
              </Link>
            </div>
          )}
        </div>

        {/* ── Daily quota bar — free users, own profile only ─────────────── */}
        {isOwnProfile && !dlMeta.isPremium && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Today's downloads: {dlMeta.dailyDownloadCount} / {dlMeta.dailyLimit}
              </p>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{
                    width: `${Math.min((dlMeta.dailyDownloadCount / dlMeta.dailyLimit) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
            <button
              onClick={() => setShowPremium(true)}
              className="flex-shrink-0 text-sm bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold px-4 py-2 rounded-full transition"
            >
              ⭐ Get unlimited
            </button>
          </div>
        )}

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
          {(['videos', ...(isOwnProfile ? ['downloads'] : [])] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t === 'downloads'
                ? `Downloads (${downloads.length})`
                : `Videos (${videos.length})`}
            </button>
          ))}
        </div>

        {/* ── Videos tab ─────────────────────────────────────────────────── */}
        {tab === 'videos' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
            {videos.length === 0 && (
              <p className="col-span-full text-center text-gray-400 py-16">
                No videos uploaded yet.
              </p>
            )}
            {videos.map(video => (
              <div key={video._id} className="group">
                <Link href={`/video/${video._id}`}>
                  <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-video cursor-pointer">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {video.duration && (
                      <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                        {formatDuration(video.duration)}
                      </span>
                    )}
                  </div>
                </Link>

                <div className="mt-2 px-0.5">
                  <Link
                    href={`/video/${video._id}`}
                    className="font-medium text-sm line-clamp-2 hover:text-blue-600 transition-colors"
                  >
                    {video.title}
                  </Link>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatViews(video.views)} views · {timeAgo(video.createdAt)}
                  </p>

                  {isOwnProfile && (
                    <div className="mt-1.5">
                      <DownloadButton
                        video={video}
                        {...dlMeta}
                        onLimitReached={() => setShowPremium(true)}
                        onDownloaded={handleDownloaded}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Downloads tab ──────────────────────────────────────────────── */}
        {tab === 'downloads' && isOwnProfile && (
          <div className="pb-12">
            {downloads.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📥</div>
                <p className="text-gray-400">No downloads yet.</p>
                <p className="text-gray-500 text-sm mt-1">
                  Download videos to access them here.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {downloads.map((entry, i) => {
                const video = entry.videoId;
                if (!video) return null;
                return (
                  <div
                    key={i}
                    className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                  >
                    {/* Thumbnail */}
                    <Link href={`/video/${video._id}`} className="flex-shrink-0">
                      <div className="relative w-36 aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 cursor-pointer">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        {video.duration && (
                          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                            {formatDuration(video.duration)}
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <Link
                          href={`/video/${video._id}`}
                          className="font-medium text-sm line-clamp-2 hover:text-blue-600 transition-colors"
                        >
                          {video.title}
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {typeof video.userId === 'object' ? video.userId.displayName : ''}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Downloaded {timeAgo(entry.downloadedAt)}
                      </p>
                    </div>

                    {/* Re-download */}
                    <div className="flex-shrink-0 flex items-center">
                      <DownloadButton
                        video={video}
                        {...dlMeta}
                        onLimitReached={() => setShowPremium(true)}
                        onDownloaded={handleDownloaded}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Premium modal */}
      {showPremium && (
        <PremiumModal
          onClose={() => setShowPremium(false)}
          onSuccess={handlePremiumSuccess}
        />
      )}
    </div>
  );
};

export default ProfilePage;