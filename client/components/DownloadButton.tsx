import { useState } from 'react';
import api from '../lib/api';
import { Video, DlMeta } from '../types';

interface DownloadButtonProps extends DlMeta {
  video: Video;
  onLimitReached: () => void;
  onDownloaded: () => void;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({
  video,
  isPremium,
  dailyDownloadCount,
  dailyLimit,
  onLimitReached,
  onDownloaded,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [done,        setDone]        = useState(false);

  const canDownload = isPremium || dailyDownloadCount < dailyLimit;

  const handleDownload = async () => {
    if (!canDownload) { onLimitReached(); return; }
    setDownloading(true);
    try {
      const { data } = await api.post(`/downloads/${video._id}`);
      if (data.limitReached) { onLimitReached(); return; }

      // Trigger native browser download
      const a    = document.createElement('a');
      a.href     = data.videoUrl;
      a.download = `${data.title}.mp4`;
      a.target   = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDone(true);
      onDownloaded();
      setTimeout(() => setDone(false), 3000);
    } catch (err: any) {
      if (err.response?.data?.limitReached) onLimitReached();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      title={canDownload ? 'Download video' : 'Daily limit reached — upgrade to Premium'}
      className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border font-medium transition-all
        ${done
          ? 'text-green-600 border-green-400 bg-green-50 dark:bg-green-900/20'
          : canDownload
            ? 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
            : 'text-orange-500 border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
        } disabled:opacity-60`}
    >
      {downloading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
          </svg>
          Downloading
        </>
      ) : done ? (
        <>✓ Downloaded</>
      ) : canDownload ? (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4"/>
          </svg>
          Download
        </>
      ) : (
        <>⭐ Premium to download more</>
      )}
    </button>
  );
};

export default DownloadButton;