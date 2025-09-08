// React Hook for Chat History Management
// Sprint 2B - Chat History + Visual Indicators

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { chatHistoryService, ConversationMetadata, ConversationSummary } from '../services/ChatHistoryService';
import { userSessionService } from '../services/UserSessionService';
import { ChatMessage } from '../services/ChatService';

// Utility functions for chat history events
export const triggerHistoryRefresh = () => {
  window.dispatchEvent(new CustomEvent('chatHistoryUpdate'));
};

export const triggerNewConversation = () => {
  window.dispatchEvent(new CustomEvent('newConversationCreated'));
};

export const triggerMessageReceived = () => {
  window.dispatchEvent(new CustomEvent('messageReceived'));
};

export interface ChatHistoryState {
  conversations: ConversationMetadata[];
  isLoading: boolean;
  error: string | null;
  summary: ConversationSummary | null;
  searchQuery: string;
  filteredConversations: ConversationMetadata[];
}

export interface UseChatHistoryOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // minutes
  token?: string; // Azure access token
  onConversationSelect?: (threadId: string) => void;
  onError?: (error: Error) => void;
}

export const useChatHistory = (userId: string | null, options?: UseChatHistoryOptions) => {
  const [state, setState] = useState<ChatHistoryState>({
    conversations: [],
    isLoading: false,
    error: null,
    summary: null,
    searchQuery: '',
    filteredConversations: []
  });

  /**
   * Load conversation history
   */
  const loadHistory = useCallback(async () => {
    if (!userId) {
      setState(prev => ({ ...prev, conversations: [], filteredConversations: [] }));
      return;
    }

    if (!options?.token) {
      console.warn('No token available for chat history, skipping load');
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [conversations, summary] = await Promise.all([
        chatHistoryService.getConversationHistory(userId, options.token),
        chatHistoryService.getConversationSummary(userId, options.token)
      ]);

      // Deduplicate conversations at React state level
      const uniqueConversations = conversations.filter((conv, index, arr) => 
        arr.findIndex(c => c.threadId === conv.threadId) === index
      );

      setState(prev => ({
        ...prev,
        conversations: uniqueConversations,
        summary,
        filteredConversations: uniqueConversations,
        isLoading: false
      }));

      console.info(`Loaded ${conversations.length} conversations for user ${userId} using Azure API`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load history';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMsg
      }));

      options?.onError?.(error as Error);
      console.error('Failed to load chat history:', error);
    }
  }, [userId, options?.token]); // Dodano token do zależności

  /**
   * Search conversations
   */
  const searchConversations = useCallback(async (query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));

    if (!userId || !options?.token) return;

    try {
      const filtered = await chatHistoryService.searchConversations(userId, query, options.token);
      setState(prev => ({ ...prev, filteredConversations: filtered }));
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Błąd wyszukiwania');
    }
  }, [userId, options?.token]);

  /**
   * Load messages from a specific conversation
   */
  const loadConversationMessages = useCallback(async (threadId: string): Promise<ChatMessage[]> => {
    if (!userId || !options?.token) {
      console.warn('Cannot load conversation messages: missing userId or token');
      return [];
    }

    try {
      console.info(`Loading messages for conversation ${threadId}`);
      const messages = await chatHistoryService.loadConversationMessages(threadId, userId, options.token);
      return messages;
    } catch (error) {
      console.error(`Failed to load messages for conversation ${threadId}:`, error);
      toast.error('Błąd ładowania wiadomości z rozmowy');
      return [];
    }
  }, [userId, options?.token]);

  /**
   * Select conversation
   */
  const selectConversation = useCallback(async (threadId: string) => {
    if (!userId) return;

    try {
      // Switch user to selected thread
      await userSessionService.switchThread(userId, threadId);
      
      // Mark as active in history
      setState(prev => ({
        ...prev,
        conversations: prev.conversations.map(conv => ({
          ...conv,
          isActive: conv.threadId === threadId
        })),
        filteredConversations: prev.filteredConversations.map(conv => ({
          ...conv,
          isActive: conv.threadId === threadId
        }))
      }));

      options?.onConversationSelect?.(threadId);
      toast.success('Przełączono na wybraną rozmowę');

    } catch (error) {
      console.error('Failed to select conversation:', error);
      toast.error('Błąd przełączania rozmowy');
    }
  }, [userId]); // Usunięto 'options' z zależności aby uniknąć pętli

  /**
   * Delete conversation
   */
  const deleteConversation = useCallback(async (threadId: string) => {
    if (!userId) return;

    try {
      await chatHistoryService.deleteConversation(threadId, userId);
      
      // Remove from state
      setState(prev => ({
        ...prev,
        conversations: prev.conversations.filter(c => c.threadId !== threadId),
        filteredConversations: prev.filteredConversations.filter(c => c.threadId !== threadId)
      }));

      toast.success('Rozmowa została usunięta');

    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error('Błąd usuwania rozmowy');
    }
  }, [userId]);

  /**
   * Update conversation title
   */
  const updateConversationTitle = useCallback(async (threadId: string, newTitle: string) => {
    if (!userId || !options?.token) return;

    try {
      await chatHistoryService.updateConversationTitle(threadId, userId, newTitle, options.token);
      
      // Update state
      setState(prev => ({
        ...prev,
        conversations: prev.conversations.map(conv =>
          conv.threadId === threadId ? { ...conv, title: newTitle } : conv
        ),
        filteredConversations: prev.filteredConversations.map(conv =>
          conv.threadId === threadId ? { ...conv, title: newTitle } : conv
        )
      }));

      toast.success('Tytuł rozmowy został zaktualizowany');

    } catch (error) {
      console.error('Failed to update title:', error);
      toast.error('Błąd aktualizacji tytułu');
    }
  }, [userId, options?.token]);

  /**
   * Clear search
   */
  const clearSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchQuery: '',
      filteredConversations: prev.conversations
    }));
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (options?.autoRefresh && userId) {
      const interval = setInterval(
        loadHistory,
        (options.refreshInterval || 5) * 60 * 1000 // Convert minutes to ms
      );

      return () => clearInterval(interval);
    }
  }, [loadHistory, userId, options?.autoRefresh, options?.refreshInterval]);

  // Initial load
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Event-driven refresh - natychmiastowa aktualizacja
  useEffect(() => {
    const handleHistoryUpdate = () => {
      console.info('Historia czatów - otrzymano event aktualizacji');
      loadHistory();
    };

    // Nasłuchuj custom events
    window.addEventListener('chatHistoryUpdate', handleHistoryUpdate);
    window.addEventListener('newConversationCreated', handleHistoryUpdate);
    window.addEventListener('messageReceived', handleHistoryUpdate);

    return () => {
      window.removeEventListener('chatHistoryUpdate', handleHistoryUpdate);
      window.removeEventListener('newConversationCreated', handleHistoryUpdate);
      window.removeEventListener('messageReceived', handleHistoryUpdate);
    };
  }, [loadHistory]);

  // Periodic cache cleanup
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      chatHistoryService.cleanupOldCache();
    }, 60 * 60 * 1000); // Every hour

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    loadHistory,
    searchConversations,
    selectConversation,
    loadConversationMessages,
    deleteConversation,
    updateConversationTitle,
    clearSearch,
    
    // Status
    hasConversations: state.conversations.length > 0,
    hasFilteredResults: state.filteredConversations.length > 0
  };
};