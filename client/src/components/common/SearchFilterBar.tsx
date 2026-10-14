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
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-surface/60 border border-glass rounded-2xl backdrop-blur-md">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-background/50 border border-glass rounded-xl pl-10 pr-4 py-2 text-sm text-textMain placeholder:text-textMuted focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Category Filter */}
        {categories && onCategoryChange && (
          <div className="flex items-center gap-2 bg-background/50 border border-glass px-3 py-1.5 rounded-xl">
            <Filter size={15} className="text-textMuted shrink-0" />
            <select
              value={selectedCategory || 'All'}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="bg-transparent text-sm text-textMain focus:outline-none cursor-pointer"
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
          <div className="flex items-center gap-2 bg-background/50 border border-glass px-3 py-1.5 rounded-xl">
            <ArrowUpDown size={15} className="text-textMuted shrink-0" />
            <select
              value={sortBy || sortOptions[0]?.value}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent text-sm text-textMain focus:outline-none cursor-pointer"
            >
              {sortOptions.map((s) => (
                <option key={s.value} value={s.value} className="bg-surface text-textMain">
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Count Badge */}
        {totalCount !== undefined && (
          <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-semibold whitespace-nowrap">
            {totalCount} {totalCount === 1 ? 'record' : 'records'}
          </span>
        )}
      </div>
    </div>
  );
};
