import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import api from '../lib/api';
import PlaylistCard from '../components/PlaylistCard';
import { Playlist } from '../types';
import { FiPlus, FiX } from 'react-icons/fi';

export default function Playlists() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [playlists,       setPlaylists]       = useState<Playlist[]>([]);
  const [fetching,        setFetching]        = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName,         setNewName]         = useState('');
  const [newDescription,  setNewDescription]  = useState('');
  const [newIsPublic,     setNewIsPublic]     = useState(false);
  const [creating,        setCreating]        = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) api.get('/playlists').then(({ data }) => setPlaylists(data)).catch(console.error).finally(() => setFetching(false));
  }, [user, loading]);

  // Auto-open create modal if ?create=true
  useEffect(() => {
    if (router.query.create === 'true') setShowCreateModal(true);
  }, [router.query]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/playlists', { name: newName, description: newDescription, isPublic: newIsPublic });
      setPlaylists(prev => [data, ...prev]);
      setShowCreateModal(false);
      setNewName(''); setNewDescription(''); setNewIsPublic(false);
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  if (loading || fetching) return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
      </svg>
    </div>
  );

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3f3f3f] rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-[#2a2a2a] dark:text-white';

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Your playlists</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 sm:gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors"
        >
          <FiPlus size={16}/>
          <span>New playlist</span>
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 dark:text-gray-400">No playlists yet.</p>
          <button onClick={() => setShowCreateModal(true)} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Create your first playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {playlists.map(playlist => <PlaylistCard key={playlist._id} playlist={playlist}/>)}
        </div>
      )}

      {/* Create modal — bottom sheet on mobile */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-[#1f1f1f] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-[#3f3f3f] sticky top-0 bg-white dark:bg-[#1f1f1f]">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Create playlist</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#3f3f3f] transition-colors">
                <FiX size={18} className="text-gray-500"/>
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-4 sm:px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Playlist name" className={inputCls} required/>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} rows={3} placeholder="What's this playlist about?" className={`${inputCls} resize-none`}/>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={newIsPublic} onChange={e => setNewIsPublic(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600"/>
                <span className="text-sm text-gray-700 dark:text-gray-300">Make public</span>
              </label>
              <div className="flex gap-2 pb-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 dark:border-[#3f3f3f] rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating || !newName.trim()} className="flex-1 sm:flex-none px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}