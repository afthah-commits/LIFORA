import React from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Flame,
  Droplets,
  IndianRupee,
  CalendarCheck2,
  Smartphone,
  FileSpreadsheet,
  BotMessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Sliders,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useCustomizationStore } from '../../stores/customizationStore';
import { getIconComponent } from '../../utils/iconMap';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggle,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { user, logout } = useAuthStore();
  const { config, isFeatureEnabled } = useCustomizationStore();

  const customSidebarItems = config?.navigation?.sidebar_items || [];

  // Group into primary and more
  const primaryItems = customSidebarItems
    .filter((i) => i.group === 'primary' && i.visible)
    .filter((i) => {
      if (i.id === 'fitness' && !isFeatureEnabled('fitness')) return false;
      if (i.id === 'water' && !isFeatureEnabled('water')) return false;
      if (i.id === 'finance' && !isFeatureEnabled('finance')) return false;
      if (i.id === 'planner' && !isFeatureEnabled('planner')) return false;
      return true;
    });

  const moreItems = [
    ...customSidebarItems.filter((i) => i.group === 'more' && i.visible && i.id !== 'customization'),
    {
      id: 'customization',
      label: 'Customize App',
      icon: 'Sliders',
      path: '/customization',
      visible: true,
      group: 'more',
    },
    ...customSidebarItems.filter((i) => i.group === 'custom' && i.visible),
  ].filter((i) => {
    if (i.id === 'screentime' && !isFeatureEnabled('screentime')) return false;
    if (i.id === 'reports' && !isFeatureEnabled('reports')) return false;
    if (i.id === 'ai_assistant' && !isFeatureEnabled('ai_assistant')) return false;
    return true;
  });

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={clsx(
          'fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-[#0e0e11] border-r border-zinc-800/80 transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-20' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand / Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#042420] border border-emerald-500/30 flex items-center justify-center shrink-0 p-1 shadow-sm shadow-emerald-500/20">
              <img src="/logo.png" alt="LIFORA" className="w-full h-full object-contain" />
            </div>
            {!isCollapsed && (
              <div className="leading-tight truncate">
                <span className="font-extrabold text-base tracking-wider text-zinc-100">
                  LIFORA
                </span>
                <p className="text-[10px] text-emerald-400/80 font-medium tracking-wider uppercase">
                  Life OS
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onToggle}
            className="hidden lg:flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Primary Core Pillars */}
          {primaryItems.map((item) => {
            const Icon = getIconComponent(item.icon);
            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === '/'}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shadow-sm shadow-emerald-500/5'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                  )
                }
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}

          {/* More Section (Screen Time, Reports, AI Assistant, Customize App, Settings) */}
          <div className="pt-3 mt-3 border-t border-zinc-800/80">
            {!isCollapsed && (
              <div className="px-3 pb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span>More Features</span>
              </div>
            )}

            {moreItems.map((item) => {
              const Icon = getIconComponent(item.icon);
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all',
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shadow-sm shadow-emerald-500/5'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                    )
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/30">
          {!isCollapsed && (
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-zinc-200 truncate">{user?.email}</p>
                <p className="text-[10px] text-zinc-500 truncate">Personal Assistant</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors',
              isCollapsed && 'justify-center px-0'
            )}
            title="Log out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
