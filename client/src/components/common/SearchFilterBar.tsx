import React from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  categories?: FilterOption[];
  sortBy?: string;
  onSortChange?: (sort: string) => void;
  sortOptions?: FilterOption[];
  totalCount?: number;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  selectedCategory,
  onCategoryChange,
  categories,
  sortBy,
  onSortChange,
  sortOptions,
  totalCount
}) => {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 p-2 sm:p-2.5 bg-surface/60 border border-glass rounded-xl backdrop-blur-md">
      {/* Search Input — Minimal size */}
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textMuted" size={14} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-background/50 border border-glass rounded-lg pl-8 pr-3 py-1.5 text-xs text-textMain placeholder:text-textMuted focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Category Filter */}
        {categories && onCategoryChange && (
          <div className="flex items-center gap-1.5 bg-background/50 border border-glass px-2.5 py-1 rounded-lg">
            <Filter size={13} className="text-textMuted shrink-0" />
            <select
              value={selectedCategory || 'All'}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="bg-transparent text-xs text-textMain focus:outline-none cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value} className="bg-surface text-textMain">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sort Dropdown */}
        {sortOptions && onSortChange && (
          <div className="flex items-center gap-1.5 bg-background/50 border border-glass px-2.5 py-1 rounded-lg">
            <ArrowUpDown size={13} className="text-textMuted shrink-0" />
            <select
              value={sortBy || sortOptions[0]?.value}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent text-xs text-textMain focus:outline-none cursor-pointer"
            >
              {sortOptions.map((s) => (
                <option key={s.value} value={s.value} className="bg-surface text-textMain">
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Total Count Badge */}
        {totalCount !== undefined && (
          <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-surface text-textMuted border border-glass whitespace-nowrap">
            {totalCount} {totalCount === 1 ? 'record' : 'records'}
          </span>
        )}
      </div>
    </div>
  );
};
