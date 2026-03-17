import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import VideoCard from '../../components/VideoCard';
import { Playlist } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { FiTrash2, FiEdit2, FiX } from 'react-icons/fi';

export default function PlaylistPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [playlist,    setPlaylist]   = useState<Playlist | null>(null);
  const [loading,     setLoading]    = useState(true);
  const [editMode,    setEditMode]   = useState(false);
  const [name,        setName]       = useState('');
  const [description, setDescription] = useState('');
  const [isPublic,    setIsPublic]   = useState(false);
  const [saving,      setSaving]     = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    api.get(`/playlists/${id}`)
      .then(({ data }) => { setPlaylist(data); setName(data.name); setDescription(data.description || ''); setIsPublic(data.isPublic); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router.isReady]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put(`/playlists/${id}`, { name, description, isPublic });
      setPlaylist(data);
      setEditMode(false);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this playlist?')) return;
    try { await api.delete(`/playlists/${id}`); router.push('/playlists'); }
    catch (err) { console.error(err); }
  };

  const handleRemoveVideo = async (videoId: string) => {
    try {
      await api.delete(`/playlists/${id}/videos/${videoId}`);
      setPlaylist(prev => prev ? { ...prev, videos: prev.videos.filter(v => v._id !== videoId) } : prev);
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
      </svg>
    </div>
  );
  if (!playlist) return <div className="p-8 text-center text-gray-500">Playlist not found</div>;

  const ownerId = typeof playlist.userId === 'object' ? playlist.userId._id : playlist.userId;
  const isOwner = user && ownerId === user._id;
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3f3f3f] rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-[#2a2a2a] dark:text-white';

  return (
    <div className="max-w-6xl mx-auto">

      {/* ── Edit form ────────────────────────────────────────────────────── */}
      {editMode ? (
        <div className="mb-5 sm:mb-6 p-4 sm:p-5 border border-gray-200 dark:border-[#272727] rounded-xl bg-gray-50 dark:bg-[#1a1a1a]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Edit playlist</h2>
            <button onClick={() => setEditMode(false)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#272727]">
              <FiX size={18} className="text-gray-500"/>
            </button>
          </div>
          <form onSubmit={handleUpdate} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} required/>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={`${inputCls} resize-none`}/>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="h-4 w-4 rounded border-gray-300"/>
              <span className="text-sm text-gray-700 dark:text-gray-300">Public</span>
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditMode(false)} className="px-4 py-2 border border-gray-300 dark:border-[#3f3f3f] text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-[#272727] transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="mb-5 sm:mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{playlist.name}</h1>
              {playlist.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{playlist.description}</p>
              )}
              <p className="text-xs sm:text-sm text-gray-400 mt-1.5">
                {playlist.videos.length} video{playlist.videos.length !== 1 ? 's' : ''} · {playlist.isPublic ? 'Public' : 'Private'}
              </p>
            </div>
            {isOwner && (
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setEditMode(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#272727] rounded-lg transition-colors" title="Edit">
                  <FiEdit2 size={16} className="text-gray-600 dark:text-gray-300"/>
                </button>
                <button onClick={handleDelete} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                  <FiTrash2 size={16} className="text-red-500"/>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Videos grid ──────────────────────────────────────────────────── */}
      {playlist.videos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500 dark:text-gray-400">No videos in this playlist yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {playlist.videos.map(video => (
            <div key={video._id} className="relative group">
              <VideoCard video={video}/>
              {isOwner && (
                <button
                  onClick={() => handleRemoveVideo(video._id)}
                  className="absolute top-2 right-2 bg-black/70 text-white p-1.5 sm:p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="Remove from playlist"
                >
                  <FiTrash2 size={13}/>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}