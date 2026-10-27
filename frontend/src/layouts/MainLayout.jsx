import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavbar } from '../components/common/TopNavbar';
import { Sidebar } from '../components/common/Sidebar';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { SyncDrawer } from '../components/common/SyncDrawer';
import { useSync } from '../context/SyncContext';

export function MainLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { isDrawerOpen, closeDrawer } = useSync();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <TopNavbar
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        isMobileSidebarOpen={mobileSidebarOpen}
      />
      <OfflineBanner />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Synchronization Hub Drawer */}
      <SyncDrawer isOpen={isDrawerOpen} onClose={closeDrawer} />
    </div>
  );
}

export const AppLayout = MainLayout;
