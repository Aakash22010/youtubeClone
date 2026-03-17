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
  video:             Video;
  onNextVideo?:      () => void;   // triple-tap center → next video
  onOpenComments?:   () => void;   // triple-tap left   → open comments
}

const HEARTBEAT_INTERVAL_MS = 5000;
const HEARTBEAT_SECONDS     = 5;
const TAP_TIMEOUT_MS        = 350;  // window to accumulate taps

// ── Gesture feedback types ────────────────────────────────────────────────────
type GestureHint =
  | 'seek-forward'   // double-tap right  → +10s
  | 'seek-backward'  // double-tap left   → -10s
  | 'play-pause'     // single-tap center → play/pause
  | 'next-video'     // triple-tap center → next video
  | 'close-site'     // triple-tap right  → close tab
  | 'open-comments'  // triple-tap left   → comments
  | null;

export default function VideoPlayer({ video, onNextVideo, onOpenComments }: VideoPlayerProps) {
  const videoRef          = useRef<HTMLVideoElement>(null);
  const containerRef      = useRef<HTMLDivElement>(null);
  const controlsTimeout   = useRef<NodeJS.Timeout | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // tap tracking
  const tapCount      = useRef(0);
  const tapZone       = useRef<'left' | 'center' | 'right' | null>(null);
  const tapTimer      = useRef<NodeJS.Timeout | null>(null);

  const [playing,         setPlaying]        = useState(false);
  const [currentTime,     setCurrentTime]    = useState(0);
  const [duration,        setDuration]       = useState(0);
  const [volume,          setVolume]         = useState(1);
  const [muted,           setMuted]          = useState(false);
  const [playbackRate,    setPlaybackRate]   = useState(1);
  const [fullscreen,      setFullscreen]     = useState(false);
  const [showControls,    setShowControls]   = useState(true);
  const [hasRecordedView, setHasRecordedView] = useState(false);
  const [gestureHint,     setGestureHint]    = useState<GestureHint>(null);

  // Watch time state
  const [totalWatchSeconds, setTotalWatchSeconds] = useState(0);
  const [planLimit,         setPlanLimit]          = useState<number>(CUMULATIVE_PLAN_LIMITS['free']);
  const [userPlan,          setUserPlan]           = useState<Plan>('free');
  const [planExpiresAt,     setPlanExpiresAt]      = useState<string | null>(null);
  const [limitReached,      setLimitReached]       = useState(false);
  const [showPlanModal,     setShowPlanModal]      = useState(false);

  const { user } = useAuth();

  // ── Fetch daily watch state on mount ─────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    api.get<WatchTimeResponse>('/watch-time/me')
      .then(({ data }) => {
        setTotalWatchSeconds(data.totalWatchSeconds);
        setUserPlan(data.plan as Plan);
        setPlanLimit(data.planLimit === -1 ? Infinity : data.planLimit);
        if (data.limitReached) setLimitReached(true);
      })
      .catch(console.error);
  }, [user]);

  useEffect(() => {
    setHasRecordedView(false);
    setCurrentTime(0);
  }, [video._id]);

  // ── Record view ──────────────────────────────────────────────────────────
  const recordView = useCallback(async () => {
    if (!user || hasRecordedView) return;
    try {
      await api.post(`/history/${video._id}`);
      setHasRecordedView(true);
    } catch (err) { console.error('Failed to record view', err); }
  }, [user, video._id, hasRecordedView]);

  // ── Heartbeat ────────────────────────────────────────────────────────────
  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  }, []);

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
    } catch (err) { console.error('Heartbeat failed:', err); }
  }, [user, limitReached, stopHeartbeat]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) return;
    heartbeatInterval.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }, [sendHeartbeat]);

  useEffect(() => () => stopHeartbeat(), [stopHeartbeat]);

  // ── Playback handlers ─────────────────────────────────────────────────────
  const handleTimeUpdate    = () => {
    const t = videoRef.current?.currentTime || 0;
    setCurrentTime(t);
    if (!hasRecordedView && t >= 30) recordView();
  };
  const handleEnded         = () => { stopHeartbeat(); setPlaying(false); if (!hasRecordedView) recordView(); };
  const handleLoadedMetadata = () => setDuration(videoRef.current?.duration || 0);
  const handlePlay          = () => { startHeartbeat(); setPlaying(true); };
  const handlePause         = () => { stopHeartbeat();  setPlaying(false); };

  const togglePlay = useCallback(() => {
    if (limitReached) { setShowPlanModal(true); return; }
    if (playing) videoRef.current?.pause();
    else         videoRef.current?.play();
  }, [playing, limitReached]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.volume = val;
    setVolume(val); setMuted(val === 0);
  };

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    if (muted) { videoRef.current.volume = volume || 1; setMuted(false); }
    else        { videoRef.current.volume = 0;           setMuted(true); }
  }, [muted, volume]);

  const handlePlaybackRate = (rate: number) => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const toggleFullscreen = useCallback(() => {
    if (!fullscreen) containerRef.current?.requestFullscreen();
    else             document.exitFullscreen();
    setFullscreen(f => !f);
  }, [fullscreen]);

  // ── Show gesture hint briefly ─────────────────────────────────────────────
  const showHint = (hint: GestureHint) => {
    setGestureHint(hint);
    setTimeout(() => setGestureHint(null), 700);
  };

  // ── Gesture: fire action after tap timer expires ──────────────────────────
  const fireGesture = useCallback((count: number, zone: 'left' | 'center' | 'right') => {
    if (zone === 'right') {
      if (count === 1) {
        // single right tap — show controls (handled by mousemove already)
      } else if (count === 2) {
        // double-tap right → seek +10s
        if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
        showHint('seek-forward');
      } else if (count >= 3) {
        // triple-tap right → close website
        showHint('close-site');
        setTimeout(() => window.close(), 600);
      }
    } else if (zone === 'left') {
      if (count === 1) {
        // single left tap — show controls
      } else if (count === 2) {
        // double-tap left → seek -10s
        if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        showHint('seek-backward');
      } else if (count >= 3) {
        // triple-tap left → open comments
        showHint('open-comments');
        onOpenComments?.();
      }
    } else {
      // center
      if (count === 1) {
        // single center tap → play/pause
        togglePlay();
        showHint('play-pause');
      } else if (count >= 3) {
        // triple-tap center → next video
        showHint('next-video');
        setTimeout(() => onNextVideo?.(), 400);
      }
    }
  }, [duration, togglePlay, onNextVideo, onOpenComments]);

  // ── Tap handler ───────────────────────────────────────────────────────────
  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    // Ignore clicks on controls bar
    const target = e.target as HTMLElement;
    if (target.closest('input') || target.closest('button') || target.closest('select')) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    let clientX: number;
    if ('touches' in e) {
      clientX = e.changedTouches[0]?.clientX ?? 0;
    } else {
      clientX = e.clientX;
    }

    const relX = (clientX - rect.left) / rect.width;
    const zone: 'left' | 'center' | 'right' =
      relX < 0.33 ? 'left' : relX > 0.67 ? 'right' : 'center';

    // Reset if zone changed mid-sequence
    if (tapZone.current !== null && tapZone.current !== zone) {
      tapCount.current = 0;
      if (tapTimer.current) clearTimeout(tapTimer.current);
    }

    tapZone.current = zone;
    tapCount.current += 1;

    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      fireGesture(tapCount.current, zone);
      tapCount.current = 0;
      tapZone.current  = null;
    }, TAP_TIMEOUT_MS);
  }, [fireGesture]);

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
      case 'm': case 'M': toggleMute(); break;
    }
  }, [togglePlay, toggleFullscreen, toggleMute]);

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

  const formatTime = (t: number) => {
    const s = isFinite(t) ? t : 0;
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const remainingSeconds = planLimit !== Infinity ? Math.max(0, planLimit - totalWatchSeconds) : Infinity;
  const progressPct      = planLimit !== Infinity ? Math.min((totalWatchSeconds / planLimit) * 100, 100) : 0;

  // ── Plan upgrade success ──────────────────────────────────────────────────
  const handlePlanSuccess = async (plan: Plan, expiresAt: string) => {
    setUserPlan(plan);
    setPlanExpiresAt(expiresAt);
    try { await api.post('/watch-time/reset'); setTotalWatchSeconds(0); }
    catch (err) { console.error(err); }
    setPlanLimit(CUMULATIVE_PLAN_LIMITS[plan]);
    setLimitReached(false);
    setTimeout(() => { videoRef.current?.play(); setPlaying(true); startHeartbeat(); }, 300);
  };

  // ── Gesture hint config ───────────────────────────────────────────────────
  const hintConfig: Record<NonNullable<GestureHint>, { icon: string; label: string; side: 'left' | 'center' | 'right' }> = {
    'seek-forward':  { icon: '⏩', label: '+10s',          side: 'right'  },
    'seek-backward': { icon: '⏪', label: '-10s',          side: 'left'   },
    'play-pause':    { icon: playing ? '⏸' : '▶️', label: playing ? 'Pause' : 'Play', side: 'center' },
    'next-video':    { icon: '⏭',  label: 'Next Video',   side: 'center' },
    'close-site':    { icon: '✖️', label: 'Closing...',    side: 'right'  },
    'open-comments': { icon: '💬', label: 'Comments',      side: 'left'   },
  };

  return (
    <>
      <div
        ref={containerRef}
        className="relative bg-black rounded-lg overflow-hidden group select-none"
        style={{ aspectRatio: '16/9' }}
        onClick={handleTap}
        onTouchEnd={handleTap}
      >
        <video
          ref={videoRef}
          src={video.videoUrl}
          poster={video.thumbnailUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onPlay={handlePlay}
          onPause={handlePause}
          className="w-full h-full"
        />

        {/* ── Gesture zones (visual guide, invisible) ──────────────────────── */}
        <div className="absolute inset-0 grid grid-cols-3 pointer-events-none z-10">
          <div className="border-r border-white/0" />
          <div />
          <div className="border-l border-white/0" />
        </div>

        {/* ── Gesture hint overlay ─────────────────────────────────────────── */}
        {gestureHint && (
          <div className={`absolute inset-0 flex items-center pointer-events-none z-30 ${
            hintConfig[gestureHint].side === 'left'   ? 'justify-start pl-10' :
            hintConfig[gestureHint].side === 'right'  ? 'justify-end  pr-10'  :
            'justify-center'
          }`}>
            <div className="flex flex-col items-center gap-1 bg-black/60 backdrop-blur-sm rounded-2xl px-6 py-4 animate-pulse">
              <span className="text-4xl">{hintConfig[gestureHint].icon}</span>
              <span className="text-white text-sm font-semibold">{hintConfig[gestureHint].label}</span>
            </div>
          </div>
        )}

        {/* ── Daily quota progress bar (top) ──────────────────────────────── */}
        {user && planLimit !== Infinity && !limitReached && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-10">
            <div className="h-full bg-yellow-400 transition-all duration-1000" style={{ width: `${progressPct}%` }} />
          </div>
        )}

        {/* ── Plan badge ───────────────────────────────────────────────────── */}
        {user && userPlan !== 'free' && (
          <div className="absolute top-3 left-3 z-10">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white">
              {PLAN_CONFIGS[userPlan].badge} {PLAN_CONFIGS[userPlan].name}
            </span>
          </div>
        )}

        {/* ── Limit reached overlay ────────────────────────────────────────── */}
        {limitReached && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm z-20">
            <div className="text-center px-6 max-w-sm">
              <div className="text-5xl mb-3">⏱️</div>
              <h3 className="text-white text-xl font-bold mb-2">Daily Watch Limit Reached</h3>
              <p className="text-gray-300 text-sm mb-1">
                You've used your{' '}
                <span className="font-semibold text-white capitalize">{userPlan}</span> plan's{' '}
                <span className="font-semibold text-white">{PLAN_CONFIGS[userPlan].watchMinutes} min/day</span> allowance.
              </p>
              <p className="text-gray-400 text-xs mb-1">Your quota resets tomorrow at midnight (UTC).</p>
              <p className="text-gray-400 text-xs mb-5">Or upgrade now for a higher daily limit.</p>
              <div className="flex justify-center gap-2 flex-wrap mb-4">
                {(['bronze', 'silver', 'gold'] as Plan[]).map(p => {
                  const c = PLAN_CONFIGS[p];
                  return (
                    <span key={p} className="text-xs bg-white/10 text-white border border-white/20 px-2.5 py-1 rounded-full">
                      {c.name} — {c.watchMinutes === Infinity ? 'Unlimited' : `${c.watchMinutes} min`}/day · Rs.{c.price}
                    </span>
                  );
                })}
              </div>
              <button onClick={() => setShowPlanModal(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition">
                Upgrade Plan
              </button>
            </div>
          </div>
        )}

        {/* ── Controls bar ─────────────────────────────────────────────────── */}
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent px-4 pb-2 pt-8 transition-opacity z-20 ${showControls && !limitReached ? 'opacity-100' : 'opacity-0'}`}>
          <input
            type="range" min="0" max={duration} value={currentTime}
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
                {playing ? <FaPause size={20}/> : <FaPlay size={20}/>}
              </button>
              <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }} className="hover:text-gray-300">
                <BsFillSkipStartFill size={22} className="rotate-180"/>
              </button>
              <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }} className="hover:text-gray-300">
                <BsFillSkipEndFill size={22}/>
              </button>
              <div className="flex items-center space-x-2">
                <button onClick={toggleMute} className="hover:text-gray-300">
                  {muted || volume === 0 ? <FaVolumeMute size={18}/> : <FaVolumeUp size={18}/>}
                </button>
                <input
                  type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer"
                />
              </div>
              <span className="text-sm">{formatTime(currentTime)} / {formatTime(duration)}</span>
              {user && planLimit !== Infinity && !limitReached && (
                <span className={`text-xs font-medium ${remainingSeconds < 60 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {remainingSeconds < 60
                    ? `${Math.ceil(remainingSeconds)}s left overall`
                    : `${Math.ceil(remainingSeconds / 60)}m left overall`}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={playbackRate}
                onChange={e => handlePlaybackRate(parseFloat(e.target.value))}
                className="bg-transparent border border-white/30 rounded text-sm px-1 py-0.5 focus:outline-none"
              >
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                  <option key={rate} value={rate} className="bg-black">{rate}x</option>
                ))}
              </select>
              <button onClick={() => videoRef.current?.requestPictureInPicture()} className="hover:text-gray-300">
                <FaClosedCaptioning size={20}/>
              </button>
              <button onClick={toggleFullscreen} className="hover:text-gray-300">
                {fullscreen ? <FaCompress size={18}/> : <FaExpand size={18}/>}
              </button>
            </div>
          </div>
        </div>

        {/* ── Gesture guide tooltip (bottom-center, shows on hover) ─────────── */}
        <div className={`absolute bottom-14 left-1/2 -translate-x-1/2 pointer-events-none z-10 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex gap-4 text-xs text-white/50 whitespace-nowrap">
            <span>2× left = -10s</span>
            <span>·</span>
            <span>1× center = play/pause</span>
            <span>·</span>
            <span>2× right = +10s</span>
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