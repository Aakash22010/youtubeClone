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

  const [displayName,    setDisplayName]    = useState('');
  const [description,    setDescription]    = useState('');
  const [avatarFile,     setAvatarFile]     = useState<File | null>(null);
  const [bannerFile,     setBannerFile]     = useState<File | null>(null);
  const [avatarPreview,  setAvatarPreview]  = useState<string | null>(null);
  const [bannerPreview,  setBannerPreview]  = useState<string | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');
  const [success,        setSuccess]        = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) { setDisplayName(user.displayName || ''); setDescription(user.description || ''); }
  }, [user, loading, router]);

  const onDropAvatar = useCallback((files: File[]) => {
    const file = files[0];
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }, []);

  const onDropBanner = useCallback((files: File[]) => {
    const file = files[0];
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  }, []);

  const { getRootProps: getAvatarRoot, getInputProps: getAvatarInput } = useDropzone({ onDrop: onDropAvatar, accept: { 'image/*': [] }, maxFiles: 1 });
  const { getRootProps: getBannerRoot, getInputProps: getBannerInput } = useDropzone({ onDrop: onDropBanner, accept: { 'image/*': [] }, maxFiles: 1 });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      let avatarUrl = user.photoURL;
      let bannerUrl = user.banner;

      if (avatarFile) {
        const fd = new FormData(); fd.append('file', avatarFile);
        const { data } = await api.post<{ url: string }>('/upload/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        avatarUrl = data.url;
      }
      if (bannerFile) {
        const fd = new FormData(); fd.append('file', bannerFile);
        const { data } = await api.post<{ url: string }>('/upload/banner', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        bannerUrl = data.url;
      }

      await api.put(`/users/${user._id}`, { displayName, description, avatarUrl, bannerUrl });
      setSuccess('Channel updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update channel');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
      </svg>
    </div>
  );
  if (!user) return null;

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3f3f3f] rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-[#2a2a2a] dark:text-white';

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">Channel Settings</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">{success}</div>
      )}

      {/* ── Banner ────────────────────────────────────────────────────────── */}
      <div className="mb-5 sm:mb-6">
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Channel Banner</label>
        <div
          {...getBannerRoot()}
          className="relative h-24 sm:h-32 bg-gray-200 dark:bg-[#2a2a2a] rounded-xl overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 dark:border-[#3f3f3f] hover:border-blue-500 transition-colors"
        >
          <input {...getBannerInput()}/>
          {(bannerPreview || user.banner) ? (
            <>
              <img src={bannerPreview || user.banner} alt="Banner" className="w-full h-full object-cover"/>
              <button
                onClick={e => { e.stopPropagation(); setBannerFile(null); setBannerPreview(null); }}
                className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-colors"
              >
                <FiX size={16}/>
              </button>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-1.5">
              <FiUpload size={20}/>
              <span className="text-xs sm:text-sm">Upload banner (2048×1152)</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Avatar ────────────────────────────────────────────────────────── */}
      <div className="mb-5 sm:mb-6">
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Avatar</label>
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            {...getAvatarRoot()}
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 dark:border-[#3f3f3f] hover:border-blue-500 transition-colors flex-shrink-0"
          >
            <input {...getAvatarInput()}/>
            <img
              src={avatarPreview || getAvatarUrl(user.photoURL, user.displayName)}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity text-white">
              <FiUpload size={18}/>
            </div>
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Profile photo</p>
            <p className="text-xs text-gray-400 mt-0.5">Click to upload a new photo</p>
            {avatarPreview && (
              <button onClick={() => { setAvatarFile(null); setAvatarPreview(null); }} className="text-xs text-red-500 hover:text-red-600 mt-1">
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Display Name ──────────────────────────────────────────────────── */}
      <div className="mb-4">
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
        <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className={inputCls}/>
      </div>

      {/* ── About ─────────────────────────────────────────────────────────── */}
      <div className="mb-5 sm:mb-6">
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">About</label>
        <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} className={`${inputCls} resize-none`}/>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex gap-2 sm:gap-3 justify-end">
        <button
          onClick={() => router.back()}
          className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-[#3f3f3f] rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 sm:px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : <><FiSave size={14}/> Save Changes</>}
        </button>
      </div>
    </div>
  );
}