import { useRef, useState, useEffect, useCallback } from 'react';
import {
  FaPlay, FaPause, FaVolumeUp, FaVolumeMute,
  FaExpand, FaCompress, FaClosedCaptioning
} from 'react-icons/fa';
import { BsFillSkipStartFill, BsFillSkipEndFill } from 'react-icons/bs';
import { Video, Plan, PLAN_WATCH_LIMITS, PLAN_CONFIGS } from '../types';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import PlanUpgradeModal from './PlanUpgradeModal';

interface VideoPlayerProps {
  video: Video;
}

// Derive the user's effective plan — returns 'free' if plan has expired
function getEffectivePlan(user: any): Plan {
  if (!user) return 'free';
  const plan: Plan = user.plan || 'free';
  if (plan === 'free') return 'free';
  if (user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) return 'free';
  return plan;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video }) => {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  const [playing,       setPlaying]      = useState(false);
  const [currentTime,   setCurrentTime]  = useState(0);
  const [duration,      setDuration]     = useState(0);
  const [volume,        setVolume]       = useState(1);
  const [muted,         setMuted]        = useState(false);
  const [playbackRate,  setPlaybackRate] = useState(1);
  const [fullscreen,    setFullscreen]   = useState(false);
  const [showControls,  setShowControls] = useState(true);
  const [hasRecordedView, setHasRecordedView] = useState(false);

  // Plan / watch-limit state
  const [showPlanModal,   setShowPlanModal]   = useState(false);
  const [limitReached,    setLimitReached]    = useState(false);
  const [userPlan,        setUserPlan]        = useState<Plan>('free');
  const [planExpiresAt,   setPlanExpiresAt]   = useState<string | null>(null);

  const { user } = useAuth();

  // ── Derive watch limit ────────────────────────────────────────────────────
  const effectivePlan = getEffectivePlan({ ...user, plan: userPlan, planExpiresAt });
  const watchLimit    = PLAN_WATCH_LIMITS[effectivePlan]; // seconds

  // ── Fetch current plan from backend on mount ──────────────────────────────
  useEffect(() => {
    if (!user) return;
    api.get('/plans/me')
      .then(({ data }) => {
        setUserPlan(data.plan || 'free');
        setPlanExpiresAt(data.planExpiresAt || null);
      })
      .catch(console.error);
  }, [user]);

  // ── Reset on video change ─────────────────────────────────────────────────
  useEffect(() => {
    setHasRecordedView(false);
    setLimitReached(false);
    setCurrentTime(0);
  }, [video._id]);

  // ── Record view ───────────────────────────────────────────────────────────
  const recordView = useCallback(async () => {
    if (!user || hasRecordedView) return;
    try {
      await api.post(`/history/${video._id}`);
      setHasRecordedView(true);
    } catch (error) {
      console.error('Failed to record view', error);
    }
  }, [user, video._id, hasRecordedView]);

  // ── Time update — enforces watch limit ───────────────────────────────────
  const handleTimeUpdate = () => {
    const current = videoRef.current?.currentTime || 0;
    setCurrentTime(current);

    if (!hasRecordedView && current >= 30) recordView();

    // Enforce plan limit
    if (watchLimit !== Infinity && current >= watchLimit && !limitReached) {
      videoRef.current?.pause();
      setPlaying(false);
      setLimitReached(true);
      setShowPlanModal(true);
    }
  };

  // Also block seeking past the limit
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    const capped  = watchLimit !== Infinity ? Math.min(newTime, watchLimit) : newTime;
    if (videoRef.current) videoRef.current.currentTime = capped;
    setCurrentTime(capped);
    if (watchLimit !== Infinity && capped >= watchLimit) {
      videoRef.current?.pause();
      setPlaying(false);
      setLimitReached(true);
      setShowPlanModal(true);
    }
  };

  const handleEnded = () => {
    if (!hasRecordedView) recordView();
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current?.duration || 0);
  };

  // ── Playback controls ─────────────────────────────────────────────────────
  const togglePlay = () => {
    if (limitReached) { setShowPlanModal(true); return; }
    if (playing) { videoRef.current?.pause(); }
    else         { videoRef.current?.play(); }
    setPlaying(!playing);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.volume = val;
    setVolume(val);
    setMuted(val === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (muted) { videoRef.current.volume = volume || 1; setMuted(false); }
    else        { videoRef.current.volume = 0;           setMuted(true); }
  };

  const handlePlaybackRate = (rate: number) => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const toggleFullscreen = () => {
    if (!fullscreen) { containerRef.current?.requestFullscreen(); }
    else             { document.exitFullscreen(); }
    setFullscreen(!fullscreen);
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    switch (e.key) {
      case ' ': case 'Space': e.preventDefault(); togglePlay(); break;
      case 'ArrowRight':
        if (videoRef.current) {
          const next = Math.min(videoRef.current.currentTime + 10, watchLimit !== Infinity ? watchLimit : Infinity);
          videoRef.current.currentTime = next;
        }
        break;
      case 'ArrowLeft':
        if (videoRef.current) videoRef.current.currentTime -= 10;
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (videoRef.current) {
          const v = Math.min(1, videoRef.current.volume + 0.1);
          videoRef.current.volume = v; setVolume(v); setMuted(v === 0);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (videoRef.current) {
          const v = Math.max(0, videoRef.current.volume - 0.1);
          videoRef.current.volume = v; setVolume(v); setMuted(v === 0);
        }
        break;
      case 'f': case 'F': toggleFullscreen(); break;
      case 'm': case 'M': toggleMute();       break;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playing, fullscreen, limitReached]);

  // ── Auto-hide controls ────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const show = () => {
      setShowControls(true);
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    };
    container.addEventListener('mousemove', show);
    container.addEventListener('mouseleave', () => setShowControls(true));
    return () => {
      container.removeEventListener('mousemove', show);
      container.removeEventListener('mouseleave', () => setShowControls(true));
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, []);

  const formatTime = (time: number) => {
    const t    = isFinite(time) ? time : 0;
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ── Progress bar max — capped at watch limit for non-gold users ───────────
  const progressMax = watchLimit !== Infinity ? Math.min(duration, watchLimit) : duration;

  // ── Plan upgrade success ──────────────────────────────────────────────────
  const handlePlanSuccess = (plan: Plan, expiresAt: string) => {
    setUserPlan(plan);
    setPlanExpiresAt(expiresAt);
    setLimitReached(false);
    // Resume playback
    setTimeout(() => {
      videoRef.current?.play();
      setPlaying(true);
    }, 300);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="relative bg-black rounded-lg overflow-hidden group"
        style={{ aspectRatio: '16/9' }}
      >
        <video
          ref={videoRef}
          src={video.videoUrl}
          poster={video.thumbnailUrl}
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          className="w-full h-full"
        />

        {/* ── Watch limit overlay ────────────────────────────────────────── */}
        {limitReached && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10">
            <div className="text-center px-6 max-w-sm">
              <div className="text-5xl mb-3">⏱️</div>
              <h3 className="text-white text-xl font-bold mb-2">Watch Limit Reached</h3>
              <p className="text-gray-300 text-sm mb-1">
                Your <span className="font-semibold capitalize text-white">{effectivePlan}</span> plan allows{' '}
                <span className="font-semibold text-white">
                  {PLAN_CONFIGS[effectivePlan].watchMinutes} minutes
                </span>{' '}
                of watch time.
              </p>
              <p className="text-gray-400 text-xs mb-5">Upgrade to keep watching this video.</p>

              {/* Quick plan pills */}
              <div className="flex justify-center gap-2 flex-wrap mb-4">
                {(['bronze','silver','gold'] as Plan[]).map(p => {
                  const c = PLAN_CONFIGS[p];
                  return (
                    <span key={p} className="text-xs bg-white/10 text-white border border-white/20 px-2.5 py-1 rounded-full">
                      {c.badge} {c.name} — {c.watchMinutes === Infinity ? 'Unlimited' : `${c.watchMinutes} min`} · ₹{c.price}
                    </span>
                  );
                })}
              </div>

              <button
                onClick={() => setShowPlanModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        )}

        {/* ── Plan badge (top-left) ─────────────────────────────────────── */}
        {user && effectivePlan !== 'free' && (
          <div className="absolute top-3 left-3 z-10">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white`}>
              {PLAN_CONFIGS[effectivePlan].badge} {PLAN_CONFIGS[effectivePlan].name}
            </span>
          </div>
        )}

        {/* ── Watch limit warning bar (top) ─────────────────────────────── */}
        {user && watchLimit !== Infinity && !limitReached && currentTime > 0 && (
          <div className="absolute top-0 left-0 right-0 z-10 h-0.5 bg-white/10">
            <div
              className="h-full bg-yellow-400 transition-all"
              style={{ width: `${Math.min((currentTime / watchLimit) * 100, 100)}%` }}
            />
          </div>
        )}

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent px-4 pb-2 pt-8 transition-opacity ${
            showControls && !limitReached ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress bar */}
          <input
            type="range"
            min="0"
            max={progressMax}
            value={Math.min(currentTime, progressMax)}
            onChange={handleSeek}
            className="w-full h-1 bg-gray-600 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-red-600
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:mt-[-4px]
              [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3
              [&::-moz-range-thumb]:bg-red-600 [&::-moz-range-thumb]:border-0"
          />

          <div className="flex items-center justify-between text-white mt-1">
            <div className="flex items-center space-x-4">
              <button onClick={togglePlay} className="hover:text-gray-300">
                {playing ? <FaPause size={20} /> : <FaPlay size={20} />}
              </button>
              <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }} className="hover:text-gray-300">
                <BsFillSkipStartFill size={22} className="rotate-180" />
              </button>
              <button onClick={() => {
                if (videoRef.current) {
                  const next = Math.min(videoRef.current.currentTime + 10, watchLimit !== Infinity ? watchLimit : Infinity);
                  videoRef.current.currentTime = next;
                }
              }} className="hover:text-gray-300">
                <BsFillSkipEndFill size={22} />
              </button>
              <div className="flex items-center space-x-2">
                <button onClick={toggleMute} className="hover:text-gray-300">
                  {muted || volume === 0 ? <FaVolumeMute size={18} /> : <FaVolumeUp size={18} />}
                </button>
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer"
                />
              </div>
              <span className="text-sm">
                {formatTime(currentTime)} / {formatTime(watchLimit !== Infinity ? Math.min(duration, watchLimit) : duration)}
              </span>
              {/* Remaining time warning */}
              {watchLimit !== Infinity && !limitReached && (
                <span className="text-xs text-yellow-400">
                  {Math.max(0, Math.ceil((watchLimit - currentTime) / 60))} min left
                </span>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={playbackRate}
                onChange={(e) => handlePlaybackRate(parseFloat(e.target.value))}
                className="bg-transparent border border-white/30 rounded text-sm px-1 py-0.5 focus:outline-none"
              >
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                  <option key={rate} value={rate} className="bg-black">{rate}x</option>
                ))}
              </select>
              <button onClick={() => videoRef.current?.requestPictureInPicture()} className="hover:text-gray-300">
                <FaClosedCaptioning size={20} />
              </button>
              <button onClick={toggleFullscreen} className="hover:text-gray-300">
                {fullscreen ? <FaCompress size={18} /> : <FaExpand size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Plan upgrade modal */}
      {showPlanModal && (
        <PlanUpgradeModal
          currentPlan={effectivePlan}
          onClose={() => setShowPlanModal(false)}
          onSuccess={handlePlanSuccess}
        />
      )}
    </>
  );
};

export default VideoPlayer;