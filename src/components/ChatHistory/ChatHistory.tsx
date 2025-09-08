// Chat History Sidebar Component  
// Sprint 2B - Chat History + Visual Indicators

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import debounce from 'lodash.debounce';
import { ConversationMetadata } from '../../services/ChatHistoryService';
import { useChatHistory } from '../../hooks/useChatHistory';
import { Icons } from '../Icons/IconSystem';

interface ChatHistoryProps {
  userId: string | null;
  currentThreadId?: string | null;
  onConversationSelect?: (threadId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  token?: string;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  userId,
  currentThreadId,
  onConversationSelect,
  isCollapsed = false,
  onToggleCollapse,
  token
}) => {
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const {
    filteredConversations,
    isLoading,
    error,
    summary,
    searchQuery,
    hasConversations,
    loadHistory,
    searchConversations,
    selectConversation,
    deleteConversation,
    deleteAllConversations,
    updateConversationTitle,
    clearSearch
  } = useChatHistory(userId, {
    autoRefresh: true,
    refreshInterval: 5,
    token,
    currentThreadId: currentThreadId || undefined,
    onConversationSelect,
    onError: (error) => {
      console.error('Chat history error:', error);
      toast.error('Błąd historii rozmów');
    }
  });

  // Debounced search
  const debouncedSearch = React.useMemo(
    () => debounce((query: string) => {
      searchConversations(query);
    }, 300),
    [searchConversations]
  );

  const handleSearch = (query: string) => {
    debouncedSearch(query);
  };

  const handleConversationClick = (conversation: ConversationMetadata) => {
    selectConversation(conversation.threadId);
  };

  const handleDeleteClick = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    
    if (window.confirm('Czy na pewno chcesz usunąć tę rozmowę?')) {
      deleteConversation(threadId);
    }
  };

  const handleDeleteAllClick = () => {
    const conversationCount = filteredConversations.length;
    const message = `Czy na pewno chcesz usunąć wszystkie ${conversationCount} rozmów?\n\nTa operacja jest nieodwracalna i usunie wszystkie rozmowy z Azure AI Foundry.`;
    
    if (window.confirm(message)) {
      // Double confirmation for safety
      if (window.confirm(`OSTATNIE OSTRZEŻENIE: Wszystkie ${conversationCount} rozmów zostaną trwale usunięte. Kontynuować?`)) {
        deleteAllConversations();
      }
    }
  };

  const handleTitleEdit = (e: React.MouseEvent, conversation: ConversationMetadata) => {
    e.stopPropagation();
    setEditingTitle(conversation.threadId);
    setEditTitle(conversation.title);
  };

  const handleTitleSave = (threadId: string) => {
    if (editTitle.trim() && editTitle !== '') {
      updateConversationTitle(threadId, editTitle.trim());
    }
    setEditingTitle(null);
    setEditTitle('');
  };

  const handleTitleCancel = () => {
    setEditingTitle(null);
    setEditTitle('');
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Teraz';
    if (diffMinutes < 60) return `${diffMinutes}m temu`;
    if (diffHours < 24) return `${diffHours}h temu`;
    if (diffDays < 7) return `${diffDays}d temu`;
    
    return date.toLocaleDateString('pl-PL');
  };

  const getAgentIcon = (agentType: string = '') => {
    if (agentType.includes('Audytor')) return <Icons.Search size={14} />;
    if (agentType.includes('Budżet')) return <Icons.DollarSign size={14} />;
    if (agentType.includes('Zamówień')) return <Icons.FileText size={14} />;
    if (agentType.includes('Prawnik')) return <Icons.Scale size={14} />;
    if (agentType.includes('Rachunk')) return <Icons.Calculator size={14} />;
    return <Icons.Robot size={14} />;
  };

  if (!userId) {
    return null;
  }

  return (
    <div className={`chat-history-sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`}>
      {/* Header */}
      <div className="history-header">
        <div className="header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <Icons.MessageSquare size={18} />
            <h3 style={{ marginRight: 'auto' }}>Historia rozmów</h3>
            {!isCollapsed && filteredConversations.length > 0 && (
              <button 
                onClick={handleDeleteAllClick}
                className="delete-all-btn"
                title={`Usuń wszystkie rozmowy (${filteredConversations.length})`}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background-color 0.2s',
                  marginRight: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
              >
                <Icons.Trash size={12} />
                Usuń wszystkie
              </button>
            )}
          </div>
          <button 
            onClick={onToggleCollapse}
            className="collapse-btn"
            title={isCollapsed ? 'Rozwiń historię' : 'Zwiń historię'}
          >
            {isCollapsed ? <Icons.ChevronRight size={16} /> : <Icons.ChevronLeft size={16} />}
          </button>
        </div>
        
        {/* Summary stats */}
        {!isCollapsed && summary && (
          <div className="history-stats">
            <small>
              {summary.totalConversations} rozmów • {summary.totalMessages} wiadomości
            </small>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* Search */}
          <div className="search-section">
            <div className="search-input-container">
              <input
                type="text"
                placeholder="Szukaj w historii..."
                defaultValue={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  onClick={clearSearch}
                  className="clear-search-btn"
                  title="Wyczyść wyszukiwanie"
                >
                  <Icons.Close size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="loading-state">
              <div className="loading-spinner"><Icons.Clock size={20} /></div>
              <span>Ładowanie historii...</span>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="error-state">
              <div className="error-icon"><Icons.AlertCircle size={20} /></div>
              <span>{error}</span>
              <button onClick={loadHistory} className="retry-btn">
                Spróbuj ponownie
              </button>
            </div>
          )}

          {/* Conversations list */}
          {!isLoading && !error && (
            <div className="conversations-list">
              {!hasConversations ? (
                <div className="empty-state">
                  <div className="empty-icon"><Icons.MessageSquare size={32} /></div>
                  <h4>Brak historii rozmów</h4>
                  <p>Rozpocznij pierwszą rozmowę z agentem!</p>
                </div>
              ) : (
                <>
                  {filteredConversations.length === 0 && searchQuery ? (
                    <div className="no-results">
                      <div className="search-icon">🔍</div>
                      <span>Brak wyników dla "{searchQuery}"</span>
                    </div>
                  ) : (
                    filteredConversations.map((conversation) => (
                      <div
                        key={conversation.threadId}
                        className={`conversation-item ${conversation.isActive ? 'active' : ''}`}
                        onClick={() => handleConversationClick(conversation)}
                      >
                        <div className="conversation-header">
                          <div className="conversation-meta">
                            <span className="agent-icon">
                              {getAgentIcon(conversation.agentType)}
                            </span>
                            <span className="message-count">
                              {conversation.messageCount}
                            </span>
                            {conversation.hasAttachments && (
                              <span className="attachment-indicator" title="Ma załączniki">📎</span>
                            )}
                          </div>
                          
                          <div className="conversation-actions">
                            <button
                              onClick={(e) => handleTitleEdit(e, conversation)}
                              className="edit-btn"
                              title="Edytuj tytuł"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => handleDeleteClick(e, conversation.threadId)}
                              className="delete-btn"
                              title="Usuń rozmowę"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <div className="conversation-content">
                          {editingTitle === conversation.threadId ? (
                            <div className="title-edit">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={() => handleTitleSave(conversation.threadId)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleTitleSave(conversation.threadId);
                                  if (e.key === 'Escape') handleTitleCancel();
                                }}
                                className="title-input"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="conversation-title" title={conversation.title}>
                              {conversation.title}
                            </div>
                          )}
                          
                          <div className="conversation-preview" title={conversation.lastMessagePreview}>
                            {conversation.lastMessagePreview}
                          </div>
                          
                          <div className="conversation-time">
                            {formatLastActivity(conversation.lastActivity)}
                          </div>
                        </div>

                        {conversation.tags && conversation.tags.length > 0 && (
                          <div className="conversation-tags">
                            {conversation.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="tag">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          )}

          {/* Footer with actions */}
          {!isCollapsed && hasConversations && (
            <div className="history-footer">
              <button 
                onClick={loadHistory}
                className="refresh-btn"
                disabled={isLoading}
                title="Odśwież historię"
              >
                🔄 Odśwież
              </button>
              
              {summary && (
                <small className="summary-text">
                  Aktywne: {summary.activeConversations}
                </small>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ChatHistory;