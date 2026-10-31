import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Folder,
  CalendarCheck2,
  IndianRupee,
  Flame,
  Droplets,
  Sliders,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { useCustomizationStore } from '../../stores/customizationStore';
import { getIconComponent } from '../../utils/iconMap';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Modules' | 'Records' | 'Planner' | 'Finance' | 'Pages';
  path: string;
  icon?: string;
}

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { config } = useCustomizationStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search logic across static pages, custom modules, and recent records
  useEffect(() => {
    if (!isOpen) return;

    const runSearch = async () => {
      setIsLoading(true);
      const cleanQ = query.toLowerCase().trim();

      const items: SearchResultItem[] = [];

      // 1. Navigation Pages
      const pages = [
        { title: 'Home Dashboard', subtitle: 'Personal lifestyle dashboard', path: '/', icon: 'LayoutDashboard', cat: 'Pages' as const },
        { title: 'Fitness & Health', subtitle: 'Workouts, nutrition, exercises, logs', path: '/fitness', icon: 'Flame', cat: 'Pages' as const },
        { title: 'Water Tracker', subtitle: 'Hydration logs, goals, history', path: '/water', icon: 'Droplets', cat: 'Pages' as const },
        { title: 'Money & Salary', subtitle: 'Expenses, income, budgets, savings', path: '/finance', icon: 'IndianRupee', cat: 'Pages' as const },
        { title: 'Screen Time', subtitle: 'Digital wellbeing, app usage, limits', path: '/screentime', icon: 'Smartphone', cat: 'Pages' as const },
        { title: 'Weekly Planner', subtitle: 'Focus items, weekly schedule', path: '/planner', icon: 'CalendarCheck2', cat: 'Planner' as const },
        { title: 'Analytics & Reports', subtitle: 'Progress trends and summaries', path: '/reports', icon: 'FileSpreadsheet', cat: 'Pages' as const },
        { title: 'AI Assistant', subtitle: 'Conversational assistant', path: '/ai-assistant', icon: 'BotMessageSquare', cat: 'Pages' as const },
        { title: 'Customize App', subtitle: 'Dashboard editor, modules, themes', path: '/customization', icon: 'Sliders', cat: 'Modules' as const },
        { title: 'Settings & Backup', subtitle: 'Profile, preferences, JSON backup', path: '/settings', icon: 'Settings', cat: 'Pages' as const },
      ];

      for (const p of pages) {
        if (!cleanQ || p.title.toLowerCase().includes(cleanQ) || p.subtitle.toLowerCase().includes(cleanQ)) {
          items.push({
            id: `page-${p.path}`,
            title: p.title,
            subtitle: p.subtitle,
            category: p.cat,
            path: p.path,
            icon: p.icon,
          });
        }
      }

      // 2. Custom Modules
      try {
        const modResp = await api.get('/custom-modules');
        const modules = modResp.data || [];
        for (const m of modules) {
          if (!cleanQ || m.name.toLowerCase().includes(cleanQ) || (m.description && m.description.toLowerCase().includes(cleanQ))) {
            items.push({
              id: `module-${m.id}`,
              title: m.name,
              subtitle: m.description || `Custom Module (${m.category || 'General'})`,
              category: 'Modules',
              path: `/custom-modules/${m.id}`,
              icon: m.icon || 'Folder',
            });
          }
        }
      } catch (err) {
        // Continue if offline or unauthenticated
      }

      // Filter by category
      let filtered = items;
      if (selectedCategory !== 'All') {
        filtered = items.filter((i) => i.category === selectedCategory);
      }

      setResults(filtered);
      setSelectedIndex(0);
      setIsLoading(false);
    };

    const timer = setTimeout(runSearch, 100);
    return () => clearTimeout(timer);
  }, [query, selectedCategory, isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        navigate(results[selectedIndex].path);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  const categories = ['All', 'Pages', 'Modules', 'Planner'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Universal Search"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl bg-[#031d1a] border border-emerald-900/60 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-emerald-900/50 gap-3 bg-[#021816]">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search LIFORA modules, pages, targets (Ctrl+K)..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded">
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-emerald-950 bg-[#021614] overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-emerald-950/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-emerald-950/40">
          {results.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No results found for "{query}". Try a different term.
            </div>
          ) : (
            results.map((res, idx) => {
              const Icon = res.icon ? getIconComponent(res.icon) : ChevronRight;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={res.id}
                  onClick={() => {
                    navigate(res.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'text-zinc-300 hover:bg-emerald-950/30 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-emerald-500 text-zinc-950'
                          : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-zinc-100 truncate">{res.title}</p>
                      <p className="text-[11px] text-zinc-400 truncate">{res.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900/60 border border-zinc-800 text-zinc-400">
                      {res.category}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-emerald-950 bg-[#021412] text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-emerald-500 font-medium">LIFORA Universal Search</span>
        </div>
      </div>
    </div>
  );
};
export default GlobalSearchModal;
