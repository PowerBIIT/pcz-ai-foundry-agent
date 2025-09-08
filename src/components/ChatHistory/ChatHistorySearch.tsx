// ChatHistorySearch Component
// Wyszukiwarka w historii rozmów z debounced input

import React, { useState, useEffect } from 'react';
import Icons from '../Icons/IconSystem';
import { IconButton } from '../Icons/IconContainer';

interface ChatHistorySearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

const ChatHistorySearch: React.FC<ChatHistorySearchProps> = ({
  onSearch,
  placeholder = "Szukaj w rozmowach...",
  isLoading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    if (isExpanded) {
      handleClear();
    }
  };

  return (
    <div className={`chat-history-search ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {!isExpanded ? (
        <IconButton
          variant="minimal"
          size="sm"
          shape="circle"
          onClick={handleExpand}
          title="Szukaj w rozmowach"
          aria-label="Otwórz wyszukiwarkę"
          className="search-toggle-btn"
        >
          <Icons.Search size={16} />
        </IconButton>
      ) : (
        <div className="search-input-container">
          <div className="search-input-wrapper">
            <Icons.Search size={14} className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="search-input"
              autoFocus
              aria-label="Wyszukaj rozmowy"
            />
            {searchQuery && (
              <IconButton
                variant="minimal"
                size="xs"
                shape="circle"
                onClick={handleClear}
                title="Wyczyść wyszukiwanie"
                className="search-clear-btn"
              >
                <Icons.Close size={12} />
              </IconButton>
            )}
          </div>
          <IconButton
            variant="minimal"
            size="sm"
            shape="circle"
            onClick={handleExpand}
            title="Zamknij wyszukiwarkę"
            className="search-collapse-btn"
          >
            <Icons.Close size={14} />
          </IconButton>
        </div>
      )}
      
      {isLoading && (
        <div className="search-loading">
          <div className="search-spinner"></div>
        </div>
      )}
    </div>
  );
};

export default ChatHistorySearch;