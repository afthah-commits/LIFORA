import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { OfflineBanner } from '../common/OfflineBanner';
import { PwaInstallModal } from '../common/PwaInstallModal';

export const AppLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
      {/* Offline Connectivity Banner */}
      <OfflineBanner />

      <div className="flex-1 flex">
        {/* Desktop Sidebar & Mobile Drawer */}
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />

        {/* Main Content Area */}
        <div
          className={clsx(
            'flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out',
            isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
          )}
        >
          <Header
            onOpenMobile={() => setIsMobileOpen(true)}
            onOpenInstallModal={() => setIsInstallModalOpen(true)}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Responsive Mobile Bottom Navigation */}
      <MobileBottomNav onOpenDrawer={() => setIsMobileOpen(true)} />

      {/* PWA Install Modal */}
      <PwaInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
};
