import { useRef, useState, useEffect, useCallback } from 'react';
import {
  FaPlay, FaPause, FaVolumeUp, FaVolumeMute,
  FaExpand, FaCompress, FaClosedCaptioning
} from 'react-icons/fa';
import { BsFillSkipStartFill, BsFillSkipEndFill } from 'react-icons/bs';
import { Video } from '../types';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

interface VideoPlayerProps {
  video: Video;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const [hasRecordedView, setHasRecordedView] = useState(false);

  const togglePlay = () => {
    if (playing) {
      videoRef.current?.pause();
    } else {
      videoRef.current?.play();
    }
    setPlaying(!playing);
  };

  const recordView = useCallback(async () => {
    if (!user || hasRecordedView) return;
    try {
      await api.post(`/history/${video._id}`);
      setHasRecordedView(true);
    } catch (error) {
      console.error('Failed to record view', error);
    }
  }, [user, video._id, hasRecordedView]);

  // Reset recorded flag when video changes
  useEffect(() => {
    setHasRecordedView(false);
  }, [video._id]);

  const handleTimeUpdate = () => {
    const current = videoRef.current?.currentTime || 0;
    setCurrentTime(current);
    if (!hasRecordedView && current >= 30) {
      recordView();
    }
  };

  const handleEnded = () => {
    if (!hasRecordedView) {
      recordView();
    }
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current?.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.volume = val;
    setVolume(val);
    setMuted(val === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (muted) {
        videoRef.current.volume = volume || 1;
        setMuted(false);
      } else {
        videoRef.current.volume = 0;
        setMuted(true);
      }
    }
  };

  const handlePlaybackRate = (rate: number) => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const toggleFullscreen = () => {
    if (!fullscreen) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setFullscreen(!fullscreen);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    switch (e.key) {
      case ' ':
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
        if (videoRef.current) videoRef.current.currentTime += 10;
        break;
      case 'ArrowLeft':
        if (videoRef.current) videoRef.current.currentTime -= 10;
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (videoRef.current) {
          const newVol = Math.min(1, videoRef.current.volume + 0.1);
          videoRef.current.volume = newVol;
          setVolume(newVol);
          setMuted(newVol === 0);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (videoRef.current) {
          const newVol = Math.max(0, videoRef.current.volume - 0.1);
          videoRef.current.volume = newVol;
          setVolume(newVol);
          setMuted(newVol === 0);
        }
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      case 'm':
      case 'M':
        toggleMute();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playing, fullscreen]);

  // Auto-hide controls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    };
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', () => setShowControls(true));
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', () => setShowControls(true));
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, []);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className="relative bg-black rounded-lg overflow-hidden group" style={{ aspectRatio: '16/9' }}>
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

      {/* Custom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent px-4 pb-2 pt-8 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'
          }`}
      >
        {/* Progress bar */}
        <input
          type="range"
          min="0"
          max={duration}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:mt-[-4px] [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-red-600 [&::-moz-range-thumb]:border-0"
        />

        <div className="flex items-center justify-between text-white mt-1">
          <div className="flex items-center space-x-4">
            <button onClick={togglePlay} className="hover:text-gray-300">
              {playing ? <FaPause size={20} /> : <FaPlay size={20} />}
            </button>
            <button onClick={() => videoRef.current!.currentTime -= 10} className="hover:text-gray-300">
              <BsFillSkipStartFill size={22} className="rotate-180" />
            </button>
            <button onClick={() => videoRef.current!.currentTime += 10} className="hover:text-gray-300">
              <BsFillSkipEndFill size={22} />
            </button>
            <div className="flex items-center space-x-2">
              <button onClick={toggleMute} className="hover:text-gray-300">
                {muted || volume === 0 ? <FaVolumeMute size={18} /> : <FaVolumeUp size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer"
              />
            </div>
            <span className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={playbackRate}
              onChange={(e) => handlePlaybackRate(parseFloat(e.target.value))}
              className="bg-transparent border border-white/30 rounded text-sm px-1 py-0.5 focus:outline-none"
            >
              {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                <option key={rate} value={rate} className="bg-black">
                  {rate}x
                </option>
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
  );
};

export default VideoPlayer;