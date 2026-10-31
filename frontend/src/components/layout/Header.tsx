import React, { useState, useEffect } from 'react';
import { Menu, Sparkles, Download, CheckCircle2, Search } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { GlobalSearchModal } from '../search/GlobalSearchModal';

export interface HeaderProps {
  onOpenMobile: () => void;
  onOpenInstallModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobile, onOpenInstallModal }) => {
  const { user } = useAuthStore();
  const { isInstalled, isInstallable, isIOS } = usePwaInstall();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-[#021816]/90 backdrop-blur-md border-b border-emerald-950/80">
        {/* Left: Mobile Toggle & Date */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobile}
            className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-emerald-950/60 transition-colors"
            aria-label="Open menu drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <span className="text-xs sm:text-sm font-medium text-emerald-200/80">{todayStr}</span>
          </div>
        </div>

        {/* Center/Right: Universal Search Trigger & Targets */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Universal Search Quick Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-emerald-950/50 border border-emerald-800/40 text-zinc-300 hover:text-emerald-300 hover:border-emerald-500/50 transition-all shadow-sm active:scale-95"
            title="Universal Search (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline text-zinc-400">Search...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-mono text-emerald-400 bg-black/40 rounded border border-emerald-900/60">
              Ctrl+K
            </kbd>
          </button>

          {user?.goals && (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs bg-[#021d1a] text-zinc-300 px-2.5 py-1 rounded-full border border-emerald-900/60 font-mono">
                Target: <strong className="text-emerald-400 font-semibold">{user.goals.target_weight_kg}kg</strong>
              </span>
              <span className="text-xs bg-[#021d1a] text-zinc-300 px-2.5 py-1 rounded-full border border-emerald-900/60 font-mono">
                Protein: <strong className="text-emerald-400 font-semibold">{user.goals.daily_protein_target_g}g</strong>
              </span>
            </div>
          )}

          {/* PWA Install Trigger Button if not installed */}
          {!isInstalled && (isInstallable || isIOS) && onOpenInstallModal && (
            <button
              onClick={onOpenInstallModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all shadow-sm shadow-emerald-500/10 active:scale-95"
              title="Install LIFORA App"
            >
              <Download className="w-3.5 h-3.5 animate-bounce" />
              <span className="hidden xs:inline">Install App</span>
            </button>
          )}

          {/* Standalone status badge when running installed */}
          {isInstalled ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium text-[11px] hidden sm:inline">Standalone App</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-[11px] tracking-wide">LIFORA</span>
            </div>
          )}
        </div>
      </header>

      {/* Global Search Palette Modal */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
export default Header;
