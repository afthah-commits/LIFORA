import React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '../common/Button';

export interface DynamicFilterOption {
  label: string;
  value: string;
}

export interface DynamicFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  sortBy?: string;
  onSortChange?: (sort: string) => void;
  sortOptions?: DynamicFilterOption[];
  filterValue?: string;
  onFilterChange?: (val: string) => void;
  filterOptions?: DynamicFilterOption[];
  filterLabel?: string;
  onReset?: () => void;
  className?: string;
}

export const DynamicFilter: React.FC<DynamicFilterProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  sortBy,
  onSortChange,
  sortOptions = [
    { label: 'Newest First', value: 'desc' },
    { label: 'Oldest First', value: 'asc' },
  ],
  filterValue,
  onFilterChange,
  filterOptions,
  filterLabel = 'Filter',
  onReset,
  className = '',
}) => {
  const hasActiveFilters = !!searchQuery || (filterValue && filterValue !== 'all');

  return (
    <div
      className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 ${className}`}
    >
      {/* Search Bar */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-8 py-1.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-200"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter and Sort controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterOptions && onFilterChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-400 hidden md:inline">{filterLabel}:</span>
            <select
              value={filterValue || 'all'}
              onChange={(e) => onFilterChange(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All</option>
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {onSortChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-400 hidden md:inline">Sort:</span>
            <select
              value={sortBy || 'desc'}
              onChange={(e) => onSortChange(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {hasActiveFilters && onReset && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-zinc-400 hover:text-zinc-200 text-xs px-2 py-1 h-auto"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};
export default DynamicFilter;
