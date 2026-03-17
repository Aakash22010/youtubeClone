import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { FiX, FiUploadCloud } from 'react-icons/fi';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [step,            setStep]           = useState(1);
  const [videoFile,       setVideoFile]      = useState<File | null>(null);
  const [thumbnailFile,   setThumbnailFile]  = useState<File | null>(null);
  const [title,           setTitle]          = useState('');
  const [description,     setDescription]    = useState('');
  const [category,        setCategory]       = useState('');
  const [uploading,       setUploading]      = useState(false);
  const [uploadProgress,  setUploadProgress] = useState(0);
  const [error,           setError]          = useState('');

  const onDropVideo = useCallback((acceptedFiles: File[]) => {
    setVideoFile(acceptedFiles[0]);
    setStep(2);
    setError('');
  }, []);

  const onDropThumbnail = useCallback((acceptedFiles: File[]) => {
    setThumbnailFile(acceptedFiles[0]);
    setError('');
  }, []);

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps, isDragActive } = useDropzone({
    onDrop: onDropVideo,
    accept: { 'video/*': [] },
    maxFiles: 1,
  });

  const { getRootProps: getThumbnailRootProps, getInputProps: getThumbnailInputProps } = useDropzone({
    onDrop: onDropThumbnail,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!videoFile || !title || !category) {
      setError('Please fill in all required fields');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const videoFormData = new FormData();
      videoFormData.append('file', videoFile);
      const videoRes = await api.post<{ url: string; duration: number }>('/upload/video', videoFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
        },
      });

      let thumbnailUrl = '';
      if (thumbnailFile) {
        const thumbFormData = new FormData();
        thumbFormData.append('file', thumbnailFile);
        const thumbRes = await api.post<{ url: string }>('/upload/thumbnail', thumbFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        thumbnailUrl = thumbRes.data.url;
      }

      await api.post('/videos', {
        title,
        description,
        thumbnailUrl,
        videoUrl:  videoRes.data.url,
        duration:  videoRes.data.duration,
        category,
      });

      setVideoFile(null); setThumbnailFile(null);
      setTitle(''); setDescription(''); setCategory('');
      setStep(1);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3f3f3f] rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-[#2a2a2a] dark:text-white';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-[#1f1f1f] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-[#3f3f3f] sticky top-0 bg-white dark:bg-[#1f1f1f] z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Upload Video</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#3f3f3f] transition-colors">
            <FiX size={20} className="text-gray-600 dark:text-gray-300"/>
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Step 1 — Drop zone */}
          {step === 1 && (
            <div
              {...getVideoRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                  : 'border-gray-300 dark:border-[#3f3f3f] hover:border-blue-400'
              }`}
            >
              <input {...getVideoInputProps()} />
              <FiUploadCloud size={40} className="mx-auto mb-3 text-gray-400"/>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">
                {isDragActive ? 'Drop it here!' : 'Drag & drop a video, or tap to select'}
              </p>
              <p className="text-xs text-gray-400 mt-1">MP4, MOV, AVI supported</p>
            </div>
          )}

          {/* Step 2 — Details */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Video file indicator */}
              {videoFile && (
                <div className="flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <span className="text-green-600 dark:text-green-400 text-sm font-medium truncate flex-1">
                    ✓ {videoFile.name}
                  </span>
                  <button onClick={() => { setVideoFile(null); setStep(1); }} className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0">
                    Change
                  </button>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Enter video title"
                  className={inputCls}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe your video..."
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select a category</option>
                  {['Music','Gaming','Sports','Education','Movies','Entertainment'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Thumbnail <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div
                  {...getThumbnailRootProps()}
                  className="border-2 border-dashed border-gray-300 dark:border-[#3f3f3f] rounded-lg p-3 sm:p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <input {...getThumbnailInputProps()} />
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {thumbnailFile ? `✓ ${thumbnailFile.name}` : 'Tap to select thumbnail image'}
                  </p>
                </div>
              </div>

              {/* Progress */}
              {uploading && (
                <div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}/>
                  </div>
                  <p className="text-xs text-center mt-1 text-gray-500 dark:text-gray-400">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1 pb-2">
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 dark:border-[#3f3f3f] rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !title || !category}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadModal;