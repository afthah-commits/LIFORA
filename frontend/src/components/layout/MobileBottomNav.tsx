import React from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Flame,
  Droplets,
  IndianRupee,
  Menu,
} from 'lucide-react';
import { useCustomizationStore } from '../../stores/customizationStore';
import { getIconComponent } from '../../utils/iconMap';

export interface MobileBottomNavProps {
  onOpenDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenDrawer }) => {
  const { config } = useCustomizationStore();
  const sidebarItems = config?.navigation?.sidebar_items || [];
  const bottomTabs = config?.navigation?.bottom_nav_tabs || ['dashboard', 'fitness', 'water', 'finance'];

  const tabs = bottomTabs.map((id) => {
    const item = sidebarItems.find((i) => i.id === id);
    const rawLabel = item?.label || id;
    let label = rawLabel;
    if (id === 'dashboard' && (rawLabel === 'Dashboard' || rawLabel === 'Home')) label = 'Home';
    else if (id === 'fitness' && (rawLabel === 'Fitness & Health' || rawLabel === 'Fitness')) label = 'Fitness';
    else if (id === 'water' && (rawLabel === 'Water Tracker' || rawLabel === 'Water')) label = 'Water';
    else if (id === 'finance' && (rawLabel === 'Money & Salary' || rawLabel === 'Money')) label = 'Money';

    if (item) {
      return {
        id: item.id,
        label,
        icon: getIconComponent(item.icon),
        path: item.path,
      };
    }
    if (id === 'dashboard') return { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/' };
    if (id === 'fitness') return { id: 'fitness', label: 'Fitness', icon: Flame, path: '/fitness' };
    if (id === 'water') return { id: 'water', label: 'Water', icon: Droplets, path: '/water' };
    if (id === 'finance') return { id: 'finance', label: 'Money', icon: IndianRupee, path: '/finance' };
    return { id, label, icon: LayoutDashboard, path: `/${id}` };
  });

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-[#0e0e11]/95 backdrop-blur-xl border-t border-zinc-800/80 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.id}
              to={tab.path}
              end={tab.path === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors relative',
                  isActive ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-5 h-5 mb-0.5" />
                  <span className="truncate">{tab.label}</span>
                  {isActive && (
                    <span className="absolute top-0 w-8 h-0.5 bg-emerald-500 rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {/* More Tab / Drawer Toggle */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Open More Drawer"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="truncate">More</span>
        </button>
      </div>
    </nav>
  );
};
