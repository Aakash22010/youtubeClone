import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiHome, FiCompass, FiFilm, FiMusic, FiAward, FiBookOpen, FiMenu, FiX } from 'react-icons/fi';
import { MdSubscriptions, MdHistory, MdWatchLater, MdThumbUp } from 'react-icons/md';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const categories = [
  { name: 'Movies', icon: FiFilm },
  { name: 'Gaming', icon: FiAward },
  { name: 'Music', icon: FiMusic },
  { name: 'Sports', icon: FiCompass },
  { name: 'Education', icon: FiBookOpen },
  { name: 'Entertainment', icon: FiFilm },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const router = useRouter();

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (isMobile && onClose) onClose();
  }, [router.asPath, isMobile, onClose]);

  // For desktop, we keep the sidebar always visible with collapse toggle
  if (!isMobile) {
    return (
      <aside
        className={`bg-white dark:bg-[#0f0f0f] ${
          collapsed ? 'w-[72px]' : 'w-60'
        } transition-all duration-300 h-screen sticky top-0 overflow-y-auto border-r border-gray-200 dark:border-[#272727]`}
      >
        <div className="py-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex justify-center mb-4 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <FiMenu size={24} />
          </button>
          <nav className="space-y-1">
            <SidebarItem
              href="/"
              icon={FiHome}
              label="Home"
              collapsed={collapsed}
              active={router.pathname === '/'}
            />
            <SidebarItem
              href="/explore"
              icon={FiCompass}
              label="Explore"
              collapsed={collapsed}
            />
            <SidebarItem
              href="/feed/subscriptions"
              icon={MdSubscriptions}
              label="Subscriptions"
              collapsed={collapsed}
            />
            <hr className="my-3 border-gray-200 dark:border-[#272727]" />
            <SidebarItem
              href="/feed/history"
              icon={MdHistory}
              label="History"
              collapsed={collapsed}
            />
            <SidebarItem
              href="/playlists"
              icon={MdWatchLater}
              label="Playlists"
              collapsed={collapsed}
            />
            <SidebarItem
              href="/liked"
              icon={MdThumbUp}
              label="Liked videos"
              collapsed={collapsed}
            />
            <hr className="my-3 border-gray-200 dark:border-[#272727]" />
            {!collapsed && (
              <p className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Categories
              </p>
            )}
            {categories.map((cat) => (
              <SidebarItem
                key={cat.name}
                href={`/category/${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}`}
                icon={cat.icon}
                label={cat.name}
                collapsed={collapsed}
              />
            ))}
          </nav>
        </div>
      </aside>
    );
  }

  // Mobile drawer
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      {/* Drawer */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-[#0f0f0f] z-50 overflow-y-auto border-r border-gray-200 dark:border-[#272727] shadow-xl">
        <div className="py-4">
          <div className="flex justify-between items-center px-4 mb-4">
            <Link href="/" className="text-xl font-bold text-red-600">
              YouTube
            </Link>
            <button onClick={onClose} className="p-2">
              <FiX size={24} />
            </button>
          </div>
          <nav className="space-y-1">
            <SidebarItem
              href="/"
              icon={FiHome}
              label="Home"
              collapsed={false}
              active={router.pathname === '/'}
            />
            <SidebarItem
              href="/explore"
              icon={FiCompass}
              label="Explore"
              collapsed={false}
            />
            <SidebarItem
              href="/feed/subscriptions"
              icon={MdSubscriptions}
              label="Subscriptions"
              collapsed={false}
            />
            <hr className="my-3 border-gray-200 dark:border-[#272727]" />
           
            <SidebarItem
              href="/feed/history"
              icon={MdHistory}
              label="History"
              collapsed={false}
            />
            <SidebarItem
              href="/playlists"
              icon={MdWatchLater}
              label="Playlists"
              collapsed={false}
            />
            <SidebarItem
              href="/liked"
              icon={MdThumbUp}
              label="Liked videos"
              collapsed={false}
            />
            <hr className="my-3 border-gray-200 dark:border-[#272727]" />
            <p className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Categories
            </p>
            {categories.map((cat) => (
              <SidebarItem
                key={cat.name}
                href={`/category/${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}`}
                icon={cat.icon}
                label={cat.name}
                collapsed={false}
              />
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

interface SidebarItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  active?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  href,
  icon: Icon,
  label,
  collapsed,
  active,
}) => (
  <Link
    href={href}
    className={`flex items-center px-4 py-2 mx-2 rounded-lg transition-colors ${
      active
        ? 'bg-gray-100 dark:bg-[#272727] font-medium'
        : 'hover:bg-gray-100 dark:hover:bg-[#272727]'
    } ${collapsed ? 'justify-center' : ''}`}
  >
    <Icon
      size={24}
      className={`text-gray-700 dark:text-gray-300 ${collapsed ? '' : 'mr-5'}`}
    />
    {!collapsed && <span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>}
  </Link>
);

export default Sidebar;