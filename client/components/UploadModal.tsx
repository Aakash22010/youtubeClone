import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: select video, 2: details
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const onDropVideo = useCallback((acceptedFiles: File[]) => {
    setVideoFile(acceptedFiles[0]);
    setStep(2);
    setError('');
  }, []);

  const onDropThumbnail = useCallback((acceptedFiles: File[]) => {
    setThumbnailFile(acceptedFiles[0]);
    setError('');
  }, []);

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps } = useDropzone({
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
      // 1. Upload video to Cloudinary
      const videoFormData = new FormData();
      videoFormData.append('file', videoFile);
      const videoRes = await api.post<{ url: string; duration: number }>('/upload/video', videoFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });
      const videoUrl = videoRes.data.url;
      const duration = videoRes.data.duration;

      // 2. Upload thumbnail if provided
      let thumbnailUrl = '';
      if (thumbnailFile) {
        const thumbFormData = new FormData();
        thumbFormData.append('file', thumbnailFile);
        const thumbRes = await api.post<{ url: string }>('/upload/thumbnail', thumbFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        thumbnailUrl = thumbRes.data.url;
      }

      // 3. Save video metadata to MongoDB
      await api.post('/videos', {
        title,
        description,
        thumbnailUrl,
        videoUrl,
        duration,
        category,
      });

      // Reset form and close modal
      setVideoFile(null);
      setThumbnailFile(null);
      setTitle('');
      setDescription('');
      setCategory('');
      setStep(1);
      onClose();
      // Optionally show success toast
    } catch (err: any) {
      console.error('Upload failed', err);
      setError(err.response?.data?.error || err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1f1f1f] rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Upload Video</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {step === 1 && (
          <div
            {...getVideoRootProps()}
            className="border-2 border-dashed border-gray-300 dark:border-[#3f3f3f] rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 transition-colors"
          >
            <input {...getVideoInputProps()} />
            <p className="text-gray-600 dark:text-gray-400">Drag & drop a video file here, or click to select</p>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-[#3f3f3f] rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-[#2a2a2a] dark:text-white"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 dark:border-[#3f3f3f] rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-[#2a2a2a] dark:text-white"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-[#3f3f3f] rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-[#2a2a2a] dark:text-white"
                required
              >
                <option value="">Select a category</option>
                <option value="Music">Music</option>
                <option value="Gaming">Gaming</option>
                <option value="Sports">Sports</option>
                <option value="Education">Education</option>
                <option value="Movies">Movies</option>
                <option value="Entertainment">Entertainment</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Thumbnail (optional)</label>
              <div
                {...getThumbnailRootProps()}
                className="border-2 border-dashed border-gray-300 dark:border-[#3f3f3f] rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
              >
                <input {...getThumbnailInputProps()} />
                {thumbnailFile ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{thumbnailFile.name}</p>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Drag & drop a thumbnail or click to select</p>
                )}
              </div>
            </div>

            {uploading && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <p className="text-sm text-center mt-1 text-gray-600 dark:text-gray-400">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-[#3f3f3f] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !title || !category}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal;