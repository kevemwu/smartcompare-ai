import React, { useState, useRef, useEffect } from 'react';
import { Search, History, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchBoxProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  showHistory?: boolean;
  size?: 'default' | 'large';
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  onSearch,
  placeholder = "搜尋您想要的商品...",
  autoFocus = false,
  showHistory = true,
  size = 'default'
}) => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 載入搜尋歷史
  useEffect(() => {
    const saved = localStorage.getItem('searchHistory');
    if (saved) {
      setSearchHistory(JSON.parse(saved));
    }
  }, []);

  const handleSearch = () => {
    if (query.trim()) {
      // 更新搜尋歷史
      const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      
      onSearch?.(query);
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const selectHistoryItem = (item: string) => {
    setQuery(item);
    setShowSuggestions(false);
    onSearch?.(item);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  };

  const sizeClasses = {
    default: 'h-10 text-base',
    large: 'h-12 text-lg'
  };

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground ${
          size === 'large' ? 'h-5 w-5' : 'h-4 w-4'
        }`} />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => setShowSuggestions(showHistory && searchHistory.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className={`pl-10 pr-20 ${sizeClasses[size]} border-2 focus:border-primary transition-colors`}
          autoFocus={autoFocus}
        />
        <Button
          onClick={handleSearch}
          className={`absolute right-1 top-1/2 transform -translate-y-1/2 ${
            size === 'large' ? 'h-10 px-6' : 'h-8 px-4'
          }`}
          disabled={!query.trim()}
        >
          搜尋
        </Button>
      </div>

      {/* 搜尋歷史建議 */}
      {showSuggestions && searchHistory.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">搜尋歷史</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="h-6 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              清除
            </Button>
          </div>
          {searchHistory.map((item, index) => (
            <button
              key={index}
              onClick={() => selectHistoryItem(item)}
              className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center gap-2"
            >
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{item}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};