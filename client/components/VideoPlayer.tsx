import { useRef, useState, useEffect, useCallback } from 'react';
import {
  FaPlay, FaPause, FaVolumeUp, FaVolumeMute,
  FaExpand, FaCompress, FaClosedCaptioning
} from 'react-icons/fa';
import { BsFillSkipStartFill, BsFillSkipEndFill } from 'react-icons/bs';
import { Video, Plan, PLAN_CONFIGS, CUMULATIVE_PLAN_LIMITS, WatchTimeResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import PlanUpgradeModal from './PlanUpgradeModal';

interface VideoPlayerProps {
  video: Video;
}

// How often (ms) to send a watch-time heartbeat to the backend while playing
const HEARTBEAT_INTERVAL_MS = 5000; // every 5 seconds
const HEARTBEAT_SECONDS     = 5;    // must match interval / 1000

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeout  = useRef<NodeJS.Timeout | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  const [playing,      setPlaying]      = useState(false);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [volume,       setVolume]       = useState(1);
  const [muted,        setMuted]        = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [fullscreen,   setFullscreen]   = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasRecordedView, setHasRecordedView] = useState(false);

  // ── Cumulative watch time state ───────────────────────────────────────────
  const [totalWatchSeconds, setTotalWatchSeconds] = useState(0);
  const [planLimit,         setPlanLimit]         = useState<number>(CUMULATIVE_PLAN_LIMITS['free']);
  const [userPlan,          setUserPlan]          = useState<Plan>('free');
  const [planExpiresAt,     setPlanExpiresAt]     = useState<string | null>(null);
  const [limitReached,      setLimitReached]      = useState(false);
  const [showPlanModal,     setShowPlanModal]     = useState(false);

  const { user } = useAuth();

  // ── Fetch initial watch-time state ────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    api.get<WatchTimeResponse>('/watch-time/me')
      .then(({ data }) => {
        setTotalWatchSeconds(data.totalWatchSeconds);
        setUserPlan(data.plan as Plan);
        // Backend serialises Infinity as -1
        setPlanLimit(data.planLimit === -1 ? Infinity : data.planLimit);
        if (data.limitReached) {
          setLimitReached(true);
        }
      })
      .catch(console.error);
  }, [user]);

  // ── Reset view flag on video change (keep cumulative total) ──────────────
  useEffect(() => {
    setHasRecordedView(false);
    setCurrentTime(0);
  }, [video._id]);

  // ── View recording ────────────────────────────────────────────────────────
  const recordView = useCallback(async () => {
    if (!user || hasRecordedView) return;
    try {
      await api.post(`/history/${video._id}`);
      setHasRecordedView(true);
    } catch (error) {
      console.error('Failed to record view', error);
    }
  }, [user, video._id, hasRecordedView]);

  // ── Heartbeat: send seconds to backend every 5s while playing ────────────
  const sendHeartbeat = useCallback(async () => {
    if (!user || limitReached) return;
    try {
      const { data } = await api.post<WatchTimeResponse>('/watch-time/increment', {
        seconds: HEARTBEAT_SECONDS,
      });
      setTotalWatchSeconds(data.totalWatchSeconds);
      setPlanLimit(data.planLimit === -1 ? Infinity : data.planLimit);

      if (data.limitReached) {
        videoRef.current?.pause();
        setPlaying(false);
        setLimitReached(true);
        setShowPlanModal(true);
        stopHeartbeat();
      }
    } catch (err) {
      console.error('Watch-time heartbeat failed:', err);
    }
  }, [user, limitReached]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) return; // already running
    heartbeatInterval.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }, [sendHeartbeat]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => () => stopHeartbeat(), [stopHeartbeat]);

  // ── Time update ───────────────────────────────────────────────────────────
  const handleTimeUpdate = () => {
    const current = videoRef.current?.currentTime || 0;
    setCurrentTime(current);
    if (!hasRecordedView && current >= 30) recordView();
  };

  const handleEnded = () => {
    stopHeartbeat();
    setPlaying(false);
    if (!hasRecordedView) recordView();
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current?.duration || 0);
  };

  // ── Play / Pause ──────────────────────────────────────────────────────────
  const togglePlay = () => {
    if (limitReached) { setShowPlanModal(true); return; }
    if (playing) {
      videoRef.current?.pause();
      stopHeartbeat();
      setPlaying(false);
    } else {
      videoRef.current?.play();
      startHeartbeat();
      setPlaying(true);
    }
  };

  // Keep heartbeat in sync with native play/pause events (e.g. system media keys)
  const handlePlay  = () => { startHeartbeat(); setPlaying(true); };
  const handlePause = () => { stopHeartbeat();  setPlaying(false); };

  // ── Seek ──────────────────────────────────────────────────────────────────
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // ── Volume ────────────────────────────────────────────────────────────────
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

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!fullscreen) { containerRef.current?.requestFullscreen(); }
    else             { document.exitFullscreen(); }
    setFullscreen(!fullscreen);
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    switch (e.key) {
      case ' ': case 'Space': e.preventDefault(); togglePlay(); break;
      case 'ArrowRight': if (videoRef.current) videoRef.current.currentTime += 10; break;
      case 'ArrowLeft':  if (videoRef.current) videoRef.current.currentTime -= 10; break;
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
  }, [playing, fullscreen, limitReached]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (time: number) => {
    const t    = isFinite(time) ? time : 0;
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingSeconds = planLimit !== Infinity ? Math.max(0, planLimit - totalWatchSeconds) : Infinity;
  const progressPct      = planLimit !== Infinity ? Math.min((totalWatchSeconds / planLimit) * 100, 100) : 0;

  // ── Plan upgrade success ──────────────────────────────────────────────────
  const handlePlanSuccess = async (plan: Plan, expiresAt: string) => {
    setUserPlan(plan);
    setPlanExpiresAt(expiresAt);
    // Reset cumulative counter so the new plan starts fresh
    try {
      await api.post('/watch-time/reset');
      setTotalWatchSeconds(0);
    } catch (err) {
      console.error(err);
    }
    const newLimit = CUMULATIVE_PLAN_LIMITS[plan];
    setPlanLimit(newLimit);
    setLimitReached(false);
    // Resume
    setTimeout(() => {
      videoRef.current?.play();
      setPlaying(true);
      startHeartbeat();
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
          onPlay={handlePlay}
          onPause={handlePause}
          className="w-full h-full"
        />

        {/* ── Cumulative progress bar (top of player) ───────────────────── */}
        {user && planLimit !== Infinity && !limitReached && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-10">
            <div
              className="h-full bg-yellow-400 transition-all duration-1000"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* ── Plan badge (top-left) ─────────────────────────────────────── */}
        {user && userPlan !== 'free' && (
          <div className="absolute top-3 left-3 z-10">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white">
              {PLAN_CONFIGS[userPlan].badge} {PLAN_CONFIGS[userPlan].name}
            </span>
          </div>
        )}

        {/* ── Watch limit overlay ────────────────────────────────────────── */}
        {limitReached && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm z-20">
            <div className="text-center px-6 max-w-sm">
              <div className="text-5xl mb-3">⏱️</div>
              <h3 className="text-white text-xl font-bold mb-2">Watch Limit Reached</h3>
              <p className="text-gray-300 text-sm mb-1">
                You've used all{' '}
                <span className="font-semibold text-white">
                  {PLAN_CONFIGS[userPlan].watchMinutes} minutes
                </span>{' '}
                of cumulative watch time on your{' '}
                <span className="font-semibold capitalize text-white">{userPlan}</span> plan.
              </p>
              <p className="text-gray-400 text-xs mb-5">
                This counts across all videos you've watched.
              </p>

              {/* Quick plan pills */}
              <div className="flex justify-center gap-2 flex-wrap mb-4">
                {(['bronze', 'silver', 'gold'] as Plan[]).map(p => {
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

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent px-4 pb-2 pt-8 transition-opacity ${
            showControls && !limitReached ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
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
              <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }} className="hover:text-gray-300">
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
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Remaining cumulative time warning */}
              {user && planLimit !== Infinity && !limitReached && (
                <span className={`text-xs font-medium ${remainingSeconds < 60 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {remainingSeconds < 60
                    ? `${Math.ceil(remainingSeconds)}s total left`
                    : `${Math.ceil(remainingSeconds / 60)}m total left`
                  }
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

      {showPlanModal && (
        <PlanUpgradeModal
          currentPlan={userPlan}
          onClose={() => setShowPlanModal(false)}
          onSuccess={handlePlanSuccess}
        />
      )}
    </>
  );
}