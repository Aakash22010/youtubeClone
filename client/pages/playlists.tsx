import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import api from '../lib/api';
import PlaylistCard from '../components/PlaylistCard';
import { Playlist } from '../types';
import { FiPlus } from 'react-icons/fi';

export default function Playlists() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) fetchPlaylists();
  }, [user, loading]);

  const fetchPlaylists = async () => {
    try {
      const { data } = await api.get('/playlists');
      setPlaylists(data);
    } catch (error) {
      console.error('Failed to fetch playlists', error);
    } finally {
      setFetching(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/playlists', {
        name: newName,
        description: newDescription,
        isPublic: newIsPublic,
      });
      setPlaylists(prev => [data, ...prev]);
      setShowCreateModal(false);
      setNewName('');
      setNewDescription('');
      setNewIsPublic(false);
    } catch (error) {
      console.error('Failed to create playlist', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading || fetching) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your playlists</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm"
        >
          <FiPlus size={18} />
          <span>New playlist</span>
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No playlists yet.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:underline"
          >
            Create your first playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map(playlist => (
            <PlaylistCard key={playlist._id} playlist={playlist} />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create new playlist</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-[#3f3f3f] rounded-lg dark:bg-[#2a2a2a]"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  className="w-full p-2 border border-gray-300 dark:border-[#3f3f3f] rounded-lg dark:bg-[#2a2a2a]"
                />
              </div>
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newIsPublic}
                  onChange={(e) => setNewIsPublic(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="isPublic">Make public</label>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
                >
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