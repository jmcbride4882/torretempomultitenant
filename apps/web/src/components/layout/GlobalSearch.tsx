import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface SearchResult {
  id: string;
  type: 'employee' | 'location' | 'report' | 'timeEntry';
  title: string;
  subtitle?: string;
  path: string;
}

interface SearchCategory {
  name: string;
  results: SearchResult[];
}

/**
 * Global search component with keyboard shortcut (Ctrl+K / Cmd+K).
 * Searches employees, locations, reports, and time entries.
 */
export function GlobalSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<SearchCategory[]>([]);

  // Flatten results for keyboard navigation
  const allResults = categories.flatMap((c) => c.results);

  // Mock search function - replace with actual API call
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setCategories([]);
      return;
    }

    setIsLoading(true);
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Mock results - in production, call GET /api/search?q={query}
    const employeeResults: SearchResult[] = [
      { id: '1', type: 'employee' as const, title: 'John Smith', subtitle: 'john@example.com', path: '/app/users' },
      { id: '2', type: 'employee' as const, title: 'Jane Doe', subtitle: 'jane@example.com', path: '/app/users' },
    ].filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);

    const locationResults: SearchResult[] = [
      { id: '3', type: 'location' as const, title: 'Main Office', subtitle: 'Madrid', path: '/app/locations' },
      { id: '4', type: 'location' as const, title: 'Warehouse', subtitle: 'Barcelona', path: '/app/locations' },
    ].filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);

    const reportResults: SearchResult[] = [
      { id: '5', type: 'report' as const, title: 'Monthly Report - January 2026', path: '/app/reports' },
      { id: '6', type: 'report' as const, title: 'Monthly Report - December 2025', path: '/app/reports' },
    ].filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);

    const mockCategories: SearchCategory[] = [
      { name: 'Employees', results: employeeResults },
      { name: 'Locations', results: locationResults },
      { name: 'Reports', results: reportResults },
    ].filter((c) => c.results.length > 0);

    setCategories(mockCategories);
    setSelectedIndex(0);
    setIsLoading(false);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Ctrl+K or Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }

      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Navigation within results
  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      e.preventDefault();
      navigate(allResults[selectedIndex].path);
      setIsOpen(false);
      setQuery('');
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.path);
    setIsOpen(false);
    setQuery('');
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'employee':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'location':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'report':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'timeEntry':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex items-center gap-2 px-3 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[200px] lg:min-w-[280px]"
        aria-label={t('common.search') || 'Search'}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm truncate">Search...</span>
        <kbd className="hidden sm:inline-flex ml-auto items-center gap-0.5 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-medium text-slate-500 dark:text-slate-400">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Search modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm"
            onClick={() => {
              setIsOpen(false);
              setQuery('');
            }}
          />

          {/* Search panel */}
          <div className="relative min-h-screen flex items-start justify-center p-4 pt-[10vh]">
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 border-b border-slate-200 dark:border-slate-700">
                <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyNavigation}
                  placeholder="Search employees, locations, reports..."
                  className="flex-1 h-14 bg-transparent border-0 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 text-base"
                  autoComplete="off"
                />
                {isLoading && (
                  <svg className="w-5 h-5 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                <kbd className="hidden sm:flex items-center px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-500 dark:text-slate-400">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto">
                {query && categories.length === 0 && !isLoading && (
                  <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">No results found for &quot;{query}&quot;</p>
                  </div>
                )}

                {categories.map((category) => {
                  let currentIndex = 0;
                  categories.slice(0, categories.indexOf(category)).forEach((c) => {
                    currentIndex += c.results.length;
                  });

                  return (
                    <div key={category.name} className="py-2">
                      <div className="px-4 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {category.name}
                      </div>
                      {category.results.map((result, idx) => {
                        const globalIndex = currentIndex + idx;
                        const isSelected = globalIndex === selectedIndex;
                        
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className={`flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`}>
                              {getTypeIcon(result.type)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{result.title}</p>
                              {result.subtitle && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{result.subtitle}</p>
                              )}
                            </div>
                            {isSelected && (
                              <kbd className="hidden sm:flex items-center px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-[10px] text-blue-600 dark:text-blue-300">
                                Enter
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {!query && (
                  <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-sm">Start typing to search...</p>
                    <p className="text-xs mt-1">Find employees, locations, and reports</p>
                  </div>
                )}
              </div>

              {/* Footer hints */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">Enter</kbd>
                  to select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">Esc</kbd>
                  to close
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
