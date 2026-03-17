import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Playlist } from '../types';
import { FiPlus, FiCheck, FiBookmark } from 'react-icons/fi';

interface SaveToPlaylistButtonProps {
  videoId: string;
}

const SaveToPlaylistButton: React.FC<SaveToPlaylistButtonProps> = ({ videoId }) => {
  const { user }        = useAuth();
  const [isOpen,        setIsOpen]     = useState(false);
  const [playlists,     setPlaylists]  = useState<Playlist[]>([]);
  const [loading,       setLoading]    = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && user) fetchPlaylists();
  }, [isOpen, user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/playlists');
      setPlaylists(data);
    } catch (err) {
      console.error('Failed to fetch playlists', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleVideoInPlaylist = async (playlist: Playlist) => {
    const isInPlaylist = playlist.videos.some(v => v._id === videoId);
    try {
      if (isInPlaylist) {
        await api.delete(`/playlists/${playlist._id}/videos/${videoId}`);
        setPlaylists(prev => prev.map(p =>
          p._id === playlist._id
            ? { ...p, videos: p.videos.filter(v => v._id !== videoId) }
            : p
        ));
      } else {
        await api.post(`/playlists/${playlist._id}/videos`, { videoId });
        setPlaylists(prev => prev.map(p =>
          p._id === playlist._id
            ? { ...p, videos: [...p.videos, videoId as any] }
            : p
        ));
      }
    } catch (err) {
      console.error('Failed to update playlist', err);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 sm:gap-1.5 bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm transition-colors whitespace-nowrap flex-shrink-0"
      >
        <FiBookmark size={16}/>
        <span className="hidden xs:inline">Save</span>
      </button>

      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setIsOpen(false)}/>

          {/* Dropdown — bottom sheet on mobile, popover on desktop */}
          <div className="
            fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl
            sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:rounded-lg sm:w-56
            bg-white dark:bg-[#272727] border border-gray-200 dark:border-[#3f3f3f] shadow-xl
            max-h-72 overflow-y-auto
          ">
            <div className="px-4 py-3 text-sm font-semibold border-b border-gray-100 dark:border-[#3f3f3f] text-gray-900 dark:text-white">
              Save to playlist
            </div>

            {loading ? (
              <div className="px-4 py-3 text-sm text-gray-400">Loading...</div>
            ) : playlists.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">No playlists yet</div>
            ) : (
              playlists.map(playlist => {
                const isSaved = playlist.videos.some(v => v._id === videoId);
                return (
                  <button
                    key={playlist._id}
                    onClick={() => toggleVideoInPlaylist(playlist)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-[#3f3f3f] flex items-center justify-between gap-2 transition-colors"
                  >
                    <span className="truncate flex-1 text-gray-800 dark:text-gray-200">{playlist.name}</span>
                    {isSaved && <FiCheck className="text-green-500 flex-shrink-0" size={16}/>}
                  </button>
                );
              })
            )}

            <div className="border-t border-gray-100 dark:border-[#3f3f3f]">
              <button
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/playlists?create=true';
                }}
                className="w-full text-left px-4 py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#3f3f3f] flex items-center gap-2 transition-colors"
              >
                <FiPlus size={16}/>
                Create new playlist
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SaveToPlaylistButton;