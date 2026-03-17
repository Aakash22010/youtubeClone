import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

interface SubscribeButtonProps {
  channelId:               string;
  initialSubscribersCount?: number;
  className?:              string;
}

const SubscribeButton: React.FC<SubscribeButtonProps> = ({
  channelId,
  initialSubscribersCount = 0,
  className = '',
}) => {
  const { user }                            = useAuth();
  const [subscribed,       setSubscribed]   = useState(false);
  const [subscribersCount, setSubscribersCount] = useState(initialSubscribersCount);
  const [loading,          setLoading]      = useState(false);

  const isOwnChannel = user?._id === channelId;

  useEffect(() => {
    api.get(`/subscriptions/status/${channelId}`)
      .then(({ data }) => {
        setSubscribed(data.subscribed);
        setSubscribersCount(data.subscribersCount);
      })
      .catch(console.error);
  }, [channelId]);

  const handleSubscribe = async () => {
    if (!user || isOwnChannel) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/subscriptions/${channelId}`);
      setSubscribed(data.subscribed);
      setSubscribersCount(data.subscribersCount);
    } catch (err) {
      console.error('Subscription toggle failed', err);
    } finally {
      setLoading(false);
    }
  };

  if (isOwnChannel) return null;

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading || !user}
      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
        subscribed
          ? 'bg-gray-200 dark:bg-[#272727] text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-[#3f3f3f]'
          : 'bg-red-600 hover:bg-red-700 text-white'
      } ${className}`}
    >
      {loading ? '...' : subscribed ? 'Subscribed' : 'Subscribe'}
      {subscribersCount > 0 && (
        <span className="ml-1 text-xs opacity-70">{subscribersCount}</span>
      )}
    </button>
  );
};

export default SubscribeButton;