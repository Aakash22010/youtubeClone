import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Playlist } from '../types';
import { FiPlus, FiCheck } from 'react-icons/fi';

interface SaveToPlaylistButtonProps {
  videoId: string;
}

const SaveToPlaylistButton: React.FC<SaveToPlaylistButtonProps> = ({ videoId }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchPlaylists();
    }
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
    } catch (error) {
      console.error('Failed to fetch playlists', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVideoInPlaylist = async (playlist: Playlist) => {
    const isInPlaylist = playlist.videos.some((v) => v._id === videoId);
    try {
      if (isInPlaylist) {
        await api.delete(`/playlists/${playlist._id}/videos/${videoId}`);
        setPlaylists(prev =>
          prev.map(p =>
            p._id === playlist._id
              ? { ...p, videos: p.videos.filter((v) => v._id !== videoId) }
              : p
          )
        );
      } else {
        await api.post(`/playlists/${playlist._id}/videos`, { videoId });
        setPlaylists(prev =>
          prev.map(p =>
            p._id === playlist._id
              ? { ...p, videos: [...p.videos, videoId as any] }
              : p
          )
        );
      }
    } catch (error) {
      console.error('Failed to update playlist', error);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] px-4 py-2 rounded-full text-sm flex items-center space-x-1"
      >
        <FiPlus size={18} />
        <span>Save</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#272727] border border-gray-200 dark:border-[#3f3f3f] rounded-lg shadow-lg py-1 z-50 max-h-80 overflow-y-auto">
          <div className="px-4 py-2 text-sm font-semibold border-b">Save to playlist</div>
          {loading ? (
            <div className="px-4 py-2 text-sm">Loading...</div>
          ) : playlists.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">No playlists</div>
          ) : (
            playlists.map((playlist) => {
              const isSaved = playlist.videos.some((v) => v._id === videoId);
              return (
                <button
                  key={playlist._id}
                  onClick={() => toggleVideoInPlaylist(playlist)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#3f3f3f] flex items-center justify-between"
                >
                  <span className="truncate flex-1">{playlist.name}</span>
                  {isSaved && <FiCheck className="text-green-500 ml-2" size={16} />}
                </button>
              );
            })
          )}
          <div className="border-t mt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                // navigate to create playlist page or open modal
                window.location.href = '/playlists?create=true';
              }}
              className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 dark:hover:bg-[#3f3f3f]"
            >
              + Create new playlist
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaveToPlaylistButton;