import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import api from '../lib/api';
import VideoCard from '../components/VideoCard';
import { Video, User } from '../types';
import Link from 'next/link';
import { getAvatarUrl } from '../utils/avatar';

interface SearchResults {
  videos: Video[];
  channels: User[];
}

export default function Search() {
  const router = useRouter();
  const { q } = router.query;
  const [results, setResults] = useState<SearchResults>({ videos: [], channels: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q) {
      const fetchSearch = async () => {
        setLoading(true);
        try {
          const { data } = await api.get<SearchResults>(`/search?q=${encodeURIComponent(q as string)}`);
          setResults(data);
        } catch (error) {
          console.error('Search failed', error);
        } finally {
          setLoading(false);
        }
      };
      fetchSearch();
    }
  }, [q]);

  if (!q) return <div className="p-8 text-center">Enter a search query</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <h2 className="text-xl mb-4">Search results for "{q}"</h2>
      
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {/* Channels */}
          {results.channels.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Channels</h3>
              <div className="space-y-2">
                {results.channels.map(channel => (
                  <Link key={channel._id} href={`/channel/${channel._id}`} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-[#272727] rounded-lg transition">
                    <img src={getAvatarUrl(channel.photoURL, channel.displayName)} alt={channel.displayName} className="w-12 h-12 rounded-full mr-3" />
                    <div>
                      <p className="font-medium">{channel.displayName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{channel.subscribers?.length || 0} subscribers</p>
                      {channel.description && <p className="text-sm text-gray-500 truncate max-w-md">{channel.description}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {results.videos.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold mb-3">Videos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {results.videos.map(video => <VideoCard key={video._id} video={video} />)}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No videos found</p>
          )}
        </>
      )}
    </div>
  );
}