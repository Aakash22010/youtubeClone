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

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f]">
      <Header toggleSidebar={toggleSidebar} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-[#0f0f0f]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;