import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import type { NextPage } from 'next';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarUrl } from '../../utils/avatar';
import PremiumModal from '../../components/PremiumModal';
import PlanUpgradeModal from '../../components/PlanUpgradeModal';
import DownloadButton from '../../components/DownloadButton';
import { Video, UserProfile, DownloadEntry, DlMeta, Plan, PLAN_CONFIGS } from '../../types';

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

function formatExpiry(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─── Plan info card ───────────────────────────────────────────────────────────

interface PlanCardProps {
  plan:          Plan;
  planExpiresAt: string | null;
  isOwnProfile:  boolean;
  onUpgrade:     () => void;
}

const PLAN_BORDER: Record<string, string> = {
  free:   'border-gray-200 dark:border-gray-700',
  bronze: 'border-amber-400',
  silver: 'border-slate-400',
  gold:   'border-yellow-400',
};

const PLAN_BG: Record<string, string> = {
  free:   'bg-gray-50 dark:bg-gray-900',
  bronze: 'bg-amber-50 dark:bg-amber-900/10',
  silver: 'bg-slate-50 dark:bg-slate-900/20',
  gold:   'bg-yellow-50 dark:bg-yellow-900/10',
};

function PlanCard({ plan, planExpiresAt, isOwnProfile, onUpgrade }: PlanCardProps) {
  const cfg      = PLAN_CONFIGS[plan];
  const isActive = plan !== 'free';
  const expired  = planExpiresAt && new Date(planExpiresAt) < new Date();

  return (
    <div className={`rounded-xl border-2 p-4 ${PLAN_BORDER[plan]} ${PLAN_BG[plan]} transition-all`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {cfg.badge && <span className="text-2xl">{cfg.badge}</span>}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {cfg.name} Plan
              </h3>
              {isActive && !expired && (
                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                  Active
                </span>
              )}
              {expired && (
                <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                  Expired
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {cfg.watchMinutes === Infinity
                ? 'Unlimited watch time'
                : `${cfg.watchMinutes} min cumulative watch time`}
              {isActive && planExpiresAt && !expired && (
                <span className="ml-2 text-xs">· Expires {formatExpiry(planExpiresAt)}</span>
              )}
            </p>
          </div>
        </div>

        {isOwnProfile && (plan === 'free' || !!expired) && (
          <button
            onClick={onUpgrade}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold text-sm px-4 py-2 rounded-full transition shadow-sm"
          >
            ⭐ Upgrade Plan
          </button>
        )}

        {isOwnProfile && isActive && !expired && (
          <button
            onClick={onUpgrade}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Change plan
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ProfilePage: NextPage = () => {
  const router       = useRouter();
  const { id }       = router.query as { id: string };
  const { user: me } = useAuth();

  const [profile,     setProfile]     = useState<UserProfile | null>(null);
  const [videos,      setVideos]      = useState<Video[]>([]);
  const [downloads,   setDownloads]   = useState<DownloadEntry[]>([]);
  const [dlMeta,      setDlMeta]      = useState<DlMeta>({
    isPremium: false, dailyDownloadCount: 0, dailyLimit: 1,
  });
  const [userPlan,      setUserPlan]      = useState<Plan>('free');
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [tab,           setTab]           = useState<Tab>('videos');
  const [loading,       setLoading]       = useState(true);

  // Modal state
  const [showPremiumModal, setShowPremiumModal] = useState(false);  // download premium
  const [showPlanModal,    setShowPlanModal]    = useState(false);  // watch plan

  const isOwnProfile = !!me && me._id === id;

  // ── Fetch data ───────────────────────────────────────────────────────────

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

  const fetchPlan = useCallback(async () => {
    if (!isOwnProfile) return;
    const { data } = await api.get('/plans/me');
    setUserPlan(data.plan || 'free');
    setPlanExpiresAt(data.planExpiresAt || null);
  }, [isOwnProfile]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchProfile(), fetchDownloads(), fetchPlan()])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, fetchProfile, fetchDownloads, fetchPlan]);

  // ── Callbacks ────────────────────────────────────────────────────────────

  const handleDownloadPremiumSuccess = () => {
    setDlMeta(prev  => ({ ...prev, isPremium: true }));
    setProfile(prev => prev ? { ...prev, isPremium: true } : prev);
  };

  const handlePlanSuccess = (plan: Plan, expiresAt: string) => {
    setUserPlan(plan);
    setPlanExpiresAt(expiresAt);
    setProfile(prev => prev ? { ...prev, plan, planExpiresAt: expiresAt } : prev);
  };

  const handleDownloaded = () => {
    setDlMeta(prev => ({ ...prev, dailyDownloadCount: prev.dailyDownloadCount + 1 }));
    fetchDownloads();
  };

  // ── Loading ──────────────────────────────────────────────────────────────

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
    return <div className="text-center mt-20 text-gray-500">User not found.</div>;
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

        {/* ── Profile header ────────────────────────────────────────────── */}
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
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full">
                  ⬇ Download Premium
                </span>
              )}
              {userPlan !== 'free' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                  {PLAN_CONFIGS[userPlan].badge} {PLAN_CONFIGS[userPlan].name}
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

          {isOwnProfile && (
            <div className="flex items-center gap-2 pb-1 flex-wrap">
              <Link
                href="/settings"
                className="text-sm px-4 py-2 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Edit profile
              </Link>
            </div>
          )}
        </div>

        {/* ── Plan & Premium cards — own profile only ────────────────────── */}
        {isOwnProfile && (
          <div className="space-y-3 mb-6">

            {/* Watch plan card */}
            <PlanCard
              plan={userPlan}
              planExpiresAt={planExpiresAt}
              isOwnProfile={isOwnProfile}
              onUpgrade={() => setShowPlanModal(true)}
            />

            {/* Download premium card */}
            <div className={`rounded-xl border-2 p-4 transition-all ${
              dlMeta.isPremium
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Download Premium</h3>
                    {dlMeta.isPremium
                      ? <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">Active</span>
                      : <span className="text-xs bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full">Free tier</span>
                    }
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {dlMeta.isPremium
                      ? 'Unlimited video downloads'
                      : `${dlMeta.dailyDownloadCount} / ${dlMeta.dailyLimit} downloads used today`}
                  </p>
                </div>

                {!dlMeta.isPremium && (
                  <button
                    onClick={() => setShowPremiumModal(true)}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-full transition"
                  >
                    ⬇ Upgrade Downloads — ₹199
                  </button>
                )}
              </div>

              {/* Free user quota bar */}
              {!dlMeta.isPremium && (
                <div className="mt-3">
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min((dlMeta.dailyDownloadCount / dlMeta.dailyLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
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

        {/* ── Videos tab ────────────────────────────────────────────────── */}
        {tab === 'videos' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
            {videos.length === 0 && (
              <p className="col-span-full text-center text-gray-400 py-16">No videos uploaded yet.</p>
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
                        onLimitReached={() => setShowPremiumModal(true)}
                        onDownloaded={handleDownloaded}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Downloads tab ─────────────────────────────────────────────── */}
        {tab === 'downloads' && isOwnProfile && (
          <div className="pb-12">
            {downloads.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📥</div>
                <p className="text-gray-400">No downloads yet.</p>
              </div>
            )}
            <div className="space-y-3">
              {downloads.map((entry, i) => {
                const video = entry.videoId;
                if (!video) return null;
                return (
                  <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                    <Link href={`/video/${video._id}`} className="flex-shrink-0">
                      <div className="relative w-36 aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800">
                        <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover"/>
                        {video.duration && (
                          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                            {formatDuration(video.duration)}
                          </span>
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <Link href={`/video/${video._id}`} className="font-medium text-sm line-clamp-2 hover:text-blue-600 transition-colors">
                          {video.title}
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {typeof video.userId === 'object' ? video.userId.displayName : ''}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Downloaded {timeAgo(entry.downloadedAt)}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center">
                      <DownloadButton
                        video={video}
                        {...dlMeta}
                        onLimitReached={() => setShowPremiumModal(true)}
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

      {/* Download premium modal */}
      {showPremiumModal && (
        <PremiumModal
          onClose={() => setShowPremiumModal(false)}
          onSuccess={handleDownloadPremiumSuccess}
        />
      )}

      {/* Watch plan modal */}
      {showPlanModal && (
        <PlanUpgradeModal
          currentPlan={userPlan}
          onClose={() => setShowPlanModal(false)}
          onSuccess={handlePlanSuccess}
        />
      )}
    </div>
  );
};

export default ProfilePage;