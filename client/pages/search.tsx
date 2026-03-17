import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../lib/api';
import VideoCard from '../components/VideoCard';
import { Video, User } from '../types';
import { getAvatarUrl } from '../utils/avatar';

interface SearchResults { videos: Video[]; channels: User[]; }

export default function Search() {
  const router = useRouter();
  const { q }  = router.query;
  const [results, setResults] = useState<SearchResults>({ videos: [], channels: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    api.get<SearchResults>(`/search?q=${encodeURIComponent(q as string)}`)
      .then(({ data }) => setResults(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q]);

  if (!q) return (
    <div className="text-center py-20 text-gray-500">Enter a search query</div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <p className={`text-sm sm:text-base mb-4 sm:mb-6 text-gray-700 dark:text-gray-300`}>
        {loading ? 'Searching...' : `Results for `}
        {!loading && <span className="font-semibold">"{q}"</span>}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
          </svg>
        </div>
      ) : (
        <>
          {/* ── Channels ────────────────────────────────────────────────── */}
          {results.channels.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <h3 className="text-sm sm:text-base font-semibold mb-3 text-gray-900 dark:text-white">
                Channels
              </h3>
              <div className="space-y-2">
                {results.channels.map(channel => (
                  <Link
                    key={channel._id}
                    href={`/channel/${channel._id}`}
                    className="flex items-center gap-3 p-2.5 sm:p-3 hover:bg-gray-100 dark:hover:bg-[#272727] rounded-xl transition-colors"
                  >
                    <img
                      src={getAvatarUrl(channel.photoURL, channel.displayName)}
                      alt={channel.displayName}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">
                        {channel.displayName}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {channel.subscribers?.length || 0} subscribers
                      </p>
                      {channel.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs sm:max-w-md hidden sm:block">
                          {channel.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Videos ──────────────────────────────────────────────────── */}
          {results.videos.length > 0 ? (
            <div>
              <h3 className="text-sm sm:text-base font-semibold mb-3 text-gray-900 dark:text-white">
                Videos
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {results.videos.map(video => <VideoCard key={video._id} video={video}/>)}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-500 dark:text-gray-400">No results found for "{q}"</p>
              <p className="text-sm text-gray-400 mt-1">Try different keywords</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}