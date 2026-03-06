import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

interface SubscribeButtonProps {
  channelId: string;
  initialSubscribersCount?: number;
  className?: string;
}

const SubscribeButton: React.FC<SubscribeButtonProps> = ({
  channelId,
  initialSubscribersCount = 0,
  className = '',
}) => {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [subscribersCount, setSubscribersCount] = useState(initialSubscribersCount);
  const [loading, setLoading] = useState(false);

  // Check if this is the user's own channel
  const isOwnChannel = user?._id === channelId;

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await api.get(`/subscriptions/status/${channelId}`);
        setSubscribed(data.subscribed);
        setSubscribersCount(data.subscribersCount);
      } catch (error) {
        console.error('Failed to fetch subscription status', error);
      }
    };
    fetchStatus();
  }, [channelId]);

  const handleSubscribe = async () => {
    if (!user) {
      // Redirect to login or show modal
      return;
    }
    if (isOwnChannel) return;

    setLoading(true);
    try {
      const { data } = await api.post(`/subscriptions/${channelId}`);
      setSubscribed(data.subscribed);
      setSubscribersCount(data.subscribersCount);
    } catch (error) {
      console.error('Subscription toggle failed', error);
    } finally {
      setLoading(false);
    }
  };

  if (isOwnChannel) {
    return null; // Don't show subscribe button on own channel
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading || !user}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        subscribed
          ? 'bg-gray-200 dark:bg-[#272727] text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-[#3f3f3f]'
          : 'bg-red-600 hover:bg-red-700 text-white'
      } ${className}`}
    >
      {loading ? '...' : subscribed ? 'Subscribed' : 'Subscribe'}
      {subscribersCount > 0 && (
        <span className="ml-1 text-xs opacity-80">{subscribersCount}</span>
      )}
    </button>
  );
};

export default SubscribeButton;