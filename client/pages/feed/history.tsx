import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import api from '../../lib/api';
import VideoCard from '../../components/VideoCard';
import { FiTrash2 } from 'react-icons/fi';

interface HistoryItem {
  _id: string;
  videoId: any; // populated video
  watchedAt: string;
}

export default function History() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      fetchHistory();
    }
  }, [user, loading]);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/history');
      setHistory(data);
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setFetching(false);
    }
  };

  const handleRemove = async (videoId: string) => {
    try {
      await api.delete(`/history/${videoId}`);
      setHistory(prev => prev.filter(item => item.videoId._id !== videoId));
    } catch (error) {
      console.error('Failed to remove', error);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear all watch history?')) return;
    setClearing(true);
    try {
      await api.delete('/history');
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear', error);
    } finally {
      setClearing(false);
    }
  };

  if (loading || fetching) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Watch History</h1>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="flex items-center text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            <FiTrash2 className="mr-1" /> Clear all
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No watch history yet.</p>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div key={item._id} className="flex items-start space-x-4 border-b border-gray-200 dark:border-[#272727] pb-4">
              <div className="flex-1">
                <VideoCard video={item.videoId} />
              </div>
              <div className="flex flex-col items-end space-y-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(item.watchedAt).toLocaleString()}
                </span>
                <button
                  onClick={() => handleRemove(item.videoId._id)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}