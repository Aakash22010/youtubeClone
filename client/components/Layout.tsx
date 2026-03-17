import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f]">
      <Header toggleSidebar={() => setSidebarOpen(o => !o)} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 min-w-0 p-2 sm:p-4 md:p-6 bg-gray-50 dark:bg-[#0f0f0f]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;