import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import api from '../../lib/api';
import VideoCard from '../../components/VideoCard';
import { FiTrash2 } from 'react-icons/fi';

interface HistoryItem { _id: string; videoId: any; watchedAt: string; }

export default function History() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [history,  setHistory]  = useState<HistoryItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) api.get('/history').then(({ data }) => setHistory(data)).catch(console.error).finally(() => setFetching(false));
  }, [user, loading]);

  const handleRemove = async (videoId: string) => {
    try {
      await api.delete(`/history/${videoId}`);
      setHistory(prev => prev.filter(item => item.videoId._id !== videoId));
    } catch (err) { console.error(err); }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear all watch history?')) return;
    setClearing(true);
    try { await api.delete('/history'); setHistory([]); }
    catch (err) { console.error(err); }
    finally { setClearing(false); }
  };

  if (loading || fetching) return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
      </svg>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Watch History</h1>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="flex items-center gap-1 text-xs sm:text-sm text-red-600 hover:text-red-700 disabled:opacity-50 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <FiTrash2 size={14}/> Clear all
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📺</div>
          <p className="text-gray-500 dark:text-gray-400">No watch history yet.</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {history.map(item => (
            <div key={item._id} className="flex gap-2 sm:gap-4 pb-3 sm:pb-4 border-b border-gray-100 dark:border-[#272727]">
              <div className="flex-1 min-w-0">
                <VideoCard video={item.videoId}/>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0 pt-1">
                <span className="text-xs text-gray-400 whitespace-nowrap hidden xs:block">
                  {new Date(item.watchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
                <button
                  onClick={() => handleRemove(item.videoId._id)}
                  className="text-xs text-red-500 hover:text-red-600 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Remove"
                >
                  <FiTrash2 size={14}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}