import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiSearch, FiUpload, FiBell, FiUser, FiMenu, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import UploadModal from './UploadModal';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { getAvatarUrl } from '@/utils/avatar';

interface HeaderProps {
  toggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const isMobile = useMediaQuery('(max-width: 640px)');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      if (isMobile) setShowMobileSearch(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-[#272727] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Hamburger menu for mobile */}
          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#272727] rounded-full transition-colors"
            >
              <FiMenu size={24} className="text-gray-700 dark:text-gray-300" />
            </button>
          )}
          <Link href="/" className="text-xl md:text-2xl font-bold text-red-600 hover:text-red-700 transition-colors whitespace-nowrap">
            YouTube
          </Link>
        </div>

        {/* Search bar - hidden on mobile when not expanded */}
        {(!isMobile || showMobileSearch) && (
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-4">
            <div className="flex">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#3f3f3f] rounded-l-full focus:outline-none focus:border-blue-500 dark:bg-[#121212] dark:text-white dark:focus:border-blue-500 shadow-sm text-sm"
              />
              <button
                type="submit"
                className="px-4 md:px-6 bg-gray-100 dark:bg-[#272727] border border-l-0 border-gray-300 dark:border-[#3f3f3f] rounded-r-full hover:bg-gray-200 dark:hover:bg-[#3f3f3f] transition-colors"
              >
                <FiSearch className="text-gray-600 dark:text-gray-300" size={20} />
              </button>
            </div>
          </form>
        )}

        {/* Mobile search toggle */}
        {isMobile && !showMobileSearch && (
          <button
            onClick={() => setShowMobileSearch(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#272727] rounded-full transition-colors"
          >
            <FiSearch size={22} className="text-gray-700 dark:text-gray-300" />
          </button>
        )}

        {/* Right icons */}
        <div className="flex items-center space-x-1 md:space-x-4">
          {user ? (
            <>
              <button
                onClick={() => setShowUploadModal(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-[#272727] rounded-full transition-colors"
                title="Upload"
              >
                <FiUpload size={22} className="text-gray-700 dark:text-gray-300" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#272727] rounded-full transition-colors" title="Notifications">
                <FiBell size={22} className="text-gray-700 dark:text-gray-300" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 focus:outline-none"
                >
                  <img
                    src={getAvatarUrl(user.photoURL, user.displayName)}
                    alt={user.displayName}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full ring-2 ring-transparent hover:ring-gray-300 dark:hover:ring-[#3f3f3f] transition-all"
                  />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#272727] border border-gray-200 dark:border-[#3f3f3f] rounded-lg shadow-lg py-1 z-50">
                    <Link
                      href={`/channel/${user._id}`}
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3f3f3f] transition-colors"
                    >
                      Your Channel
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3f3f3f] transition-colors"
                    >
                      Channel Settings
                    </Link>
                    <Link
                      href="/playlists"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3f3f3f] transition-colors"
                    >
                      Playlists
                    </Link>
                    <hr className="my-1 border-gray-200 dark:border-[#3f3f3f]" />
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3f3f3f] transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="flex items-center space-x-1 md:space-x-2 border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 px-3 md:px-4 py-1.5 md:py-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm"
            >
              <FiUser size={18} />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile search overlay */}
      {isMobile && showMobileSearch && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#0f0f0f] p-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => setShowMobileSearch(false)} className="p-2">
              <FiArrowLeft size={24} />
            </button>
            <form onSubmit={handleSearch} className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                autoFocus
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#3f3f3f] rounded-full focus:outline-none focus:border-blue-500 dark:bg-[#121212] dark:text-white"
              />
            </form>
          </div>
        </div>
      )}

      <UploadModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} />
    </>
  );
};

export default Header;