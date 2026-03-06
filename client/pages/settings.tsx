import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useDropzone } from 'react-dropzone';
import api from '../lib/api';
import { getAvatarUrl } from '../utils/avatar';
import { FiUpload, FiSave, FiX } from 'react-icons/fi';

export default function Settings() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      setDisplayName(user.displayName || '');
      setDescription(user.description || '');
    }
  }, [user, loading, router]);

  const onDropAvatar = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }, []);

  const onDropBanner = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  }, []);

  const { getRootProps: getAvatarRoot, getInputProps: getAvatarInput } = useDropzone({
    onDrop: onDropAvatar,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const { getRootProps: getBannerRoot, getInputProps: getBannerInput } = useDropzone({
    onDrop: onDropBanner,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let avatarUrl = user.photoURL;
      let bannerUrl = user.banner;

      // Upload new avatar if selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        const { data } = await api.post<{ url: string }>('/upload/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        avatarUrl = data.url;
      }

      // Upload new banner if selected
      if (bannerFile) {
        const formData = new FormData();
        formData.append('file', bannerFile);
        const { data } = await api.post<{ url: string }>('/upload/banner', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        bannerUrl = data.url;
      }

      // Update user profile
      await api.put(`/users/${user._id}`, {
        displayName,
        description,
        avatarUrl,
        bannerUrl,
      });

      setSuccess('Channel updated successfully!');
      // Optionally refresh user context or just show success
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update channel');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Channel Settings</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">{success}</div>
      )}

      {/* Banner upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Channel Banner</label>
        <div
          {...getBannerRoot()}
          className="relative h-32 bg-gray-200 dark:bg-[#2a2a2a] rounded-lg overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 dark:border-[#3f3f3f] hover:border-blue-500 transition-colors"
        >
          <input {...getBannerInput()} />
          {(bannerPreview || user.banner) && (
            <img
              src={bannerPreview || user.banner}
              alt="Banner preview"
              className="w-full h-full object-cover"
            />
          )}
          {!bannerPreview && !user.banner && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <FiUpload size={24} />
              <span className="ml-2">Upload banner (recommended 2048x1152)</span>
            </div>
          )}
          {(bannerPreview || user.banner) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setBannerFile(null);
                setBannerPreview(null);
              }}
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70"
            >
              <FiX size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Avatar upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Avatar</label>
        <div className="flex items-center space-x-4">
          <div
            {...getAvatarRoot()}
            className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 dark:border-[#3f3f3f] hover:border-blue-500 transition-colors bg-gray-100 dark:bg-[#2a2a2a]"
          >
            <input {...getAvatarInput()} />
            <img
              src={avatarPreview || getAvatarUrl(user.photoURL, user.displayName)}
              alt="Avatar preview"
              className="w-full h-full object-cover"
            />
            {!avatarPreview && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity text-white">
                <FiUpload size={24} />
              </div>
            )}
          </div>
          {avatarPreview && (
            <button
              onClick={() => {
                setAvatarFile(null);
                setAvatarPreview(null);
              }}
              className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Display Name */}
      <div className="mb-4">
        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Display Name
        </label>
        <input
          type="text"
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full p-2 border border-gray-300 dark:border-[#3f3f3f] rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-[#2a2a2a] dark:text-white"
        />
      </div>

      {/* Description */}
      <div className="mb-6">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          About
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border border-gray-300 dark:border-[#3f3f3f] rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-[#2a2a2a] dark:text-white"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 dark:border-[#3f3f3f] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : <><FiSave className="mr-2" /> Save Changes</>}
        </button>
      </div>
    </div>
  );
}