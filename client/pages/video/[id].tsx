import { useRouter } from "next/router";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "../../lib/api";
import VideoPlayer from "../../components/VideoPlayer";
import CommentSection from "../../components/CommentSection";
import SubscribeButton from "../../components/SubscribeButton";
import DownloadButton from "../../components/DownloadButton";
import PremiumModal from "../../components/PremiumModal";
import { useAuth } from "../../contexts/AuthContext";
import { getAvatarUrl } from "../../utils/avatar";
import { Video, DlMeta } from "../../types";
import SaveToPlaylistButton from "@/components/SaveToPlaylistButton";

export default function VideoPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [video,        setVideo]        = useState<Video | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [likes,        setLikes]        = useState(0);
  const [dislikes,     setDislikes]     = useState(0);
  const [userLiked,    setUserLiked]    = useState(false);
  const [userDisliked, setUserDisliked] = useState(false);
  const [showDesc,     setShowDesc]     = useState(false);
  const [showPremium,  setShowPremium]  = useState(false);
  const [dlMeta,       setDlMeta]       = useState<DlMeta>({
    isPremium:          false,
    dailyDownloadCount: 0,
    dailyLimit:         1,
  });

  // ── Fetch video ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const fetchVideo = async () => {
      try {
        const { data } = await api.get<Video>(`/videos/${id}`);
        setVideo(data);
        setLikes(data.likes?.length || 0);
        setDislikes(data.dislikes?.length || 0);
        if (user) {
          setUserLiked(data.likes?.includes(user._id) || false);
          setUserDisliked(data.dislikes?.includes(user._id) || false);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [id, user]);

  // ── Fetch download quota (only if logged in) ───────────────────────────────
  const fetchDlMeta = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get("/downloads");
      setDlMeta({
        isPremium:          data.isPremium,
        dailyDownloadCount: data.dailyDownloadCount,
        dailyLimit:         data.dailyLimit,
      });
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => { fetchDlMeta(); }, [fetchDlMeta]);

  // ── Like / Dislike ─────────────────────────────────────────────────────────
  const handleLike = async () => {
    if (!user) { router.push("/login"); return; }
    try {
      const { data } = await api.post(`/videos/${video!._id}/like`);
      setLikes(data.likes);
      setDislikes(data.dislikes);
      if (userLiked) { setUserLiked(false); }
      else { setUserLiked(true); setUserDisliked(false); }
    } catch (error) { console.error("Like failed", error); }
  };

  const handleDislike = async () => {
    if (!user) { router.push("/login"); return; }
    try {
      const { data } = await api.post(`/videos/${video!._id}/dislike`);
      setLikes(data.likes);
      setDislikes(data.dislikes);
      if (userDisliked) { setUserDisliked(false); }
      else { setUserDisliked(true); setUserLiked(false); }
    } catch (error) { console.error("Dislike failed", error); }
  };

  // ── Loading / not found ────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
      </svg>
    </div>
  );

  if (!video) return (
    <div className="p-8 text-center text-gray-500">Video not found</div>
  );

  const videoUser        = typeof video.userId === "object" ? video.userId : null;
  const subscribersCount = videoUser?.subscribers?.length || 0;

  const formatViews = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f]">
      <div className="flex">
        <main className="flex-1 p-2 sm:p-4">
          <div className="max-w-full lg:max-w-5xl mx-auto">

            {/* ── Player ──────────────────────────────────────────────────── */}
            <VideoPlayer video={video} />

            <div className="mt-3 sm:mt-4">

              {/* Title */}
              <h1 className="text-base sm:text-xl md:text-2xl font-bold leading-snug text-gray-900 dark:text-white">
                {video.title}
              </h1>

              {/* ── Channel + Actions row ──────────────────────────────────── */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-3">

                {/* Channel info */}
                <div className="flex items-center gap-3">
                  {videoUser && (
                    <>
                      <Link href={`/channel/${videoUser._id}`} className="flex items-center gap-3 group">
                        <img
                          src={getAvatarUrl(videoUser.photoURL, videoUser.displayName)}
                          alt={videoUser.displayName}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-transparent group-hover:ring-gray-300 dark:group-hover:ring-[#3f3f3f] transition-all"
                        />
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {videoUser.displayName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatViews(subscribersCount)} subscriber{subscribersCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </Link>

                      <SubscribeButton channelId={videoUser._id} />
                    </>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center flex-wrap gap-2">

                  {/* Like */}
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      userLiked
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    <svg className="w-4 h-4" fill={userLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21H5a2 2 0 01-2-2v-7a2 2 0 012-2h2.924l2.21-4.42A1 1 0 0111 5h1a2 2 0 012 2v3z"/>
                    </svg>
                    <span>{likes}</span>
                  </button>

                  {/* Dislike */}
                  <button
                    onClick={handleDislike}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      userDisliked
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    <svg className="w-4 h-4" fill={userDisliked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3H19a2 2 0 012 2v7a2 2 0 01-2 2h-2.924l-2.21 4.42A1 1 0 0113 19h-1a2 2 0 01-2-2v-3z"/>
                    </svg>
                    <span>{dislikes}</span>
                  </button>

                  <SaveToPlaylistButton videoId={video._id} />

                  {/* Share */}
                  <button
                    onClick={() => navigator.clipboard?.writeText(window.location.href)}
                    className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full text-sm font-medium transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                    </svg>
                    Share
                  </button>

                  {/* Download — only for logged-in users */}
                  {user && (
                    <DownloadButton
                      video={video}
                      {...dlMeta}
                      onLimitReached={() => setShowPremium(true)}
                      onDownloaded={() => {
                        setDlMeta(prev => ({ ...prev, dailyDownloadCount: prev.dailyDownloadCount + 1 }));
                      }}
                    />
                  )}

                </div>
              </div>

              {/* ── Description ─────────────────────────────────────────────── */}
              <div className="mt-4 bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] transition-colors p-4 rounded-xl text-sm cursor-pointer select-none"
                onClick={() => setShowDesc(prev => !prev)}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatViews(video.views)} views
                    <span className="mx-2 text-gray-400">·</span>
                    {new Date(video.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    {video.category && (
                      <>
                        <span className="mx-2 text-gray-400">·</span>
                        <span className="text-blue-600 dark:text-blue-400">{video.category}</span>
                      </>
                    )}
                  </p>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${showDesc ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>

                {video.description && (
                  <p className={`mt-2 whitespace-pre-line text-gray-700 dark:text-gray-300 leading-relaxed ${showDesc ? '' : 'line-clamp-2'}`}>
                    {video.description}
                  </p>
                )}

                {!showDesc && video.description && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                    Click to expand
                  </span>
                )}
              </div>
            </div>

            {/* ── Comments ──────────────────────────────────────────────────── */}
            <div className="mt-6">
              <CommentSection videoId={video._id} />
            </div>

          </div>
        </main>
      </div>

      {/* Premium modal */}
      {showPremium && (
        <PremiumModal
          onClose={() => setShowPremium(false)}
          onSuccess={() => setDlMeta(prev => ({ ...prev, isPremium: true }))}
        />
      )}
    </div>
  );
}