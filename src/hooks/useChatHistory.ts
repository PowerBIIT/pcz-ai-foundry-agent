// React Hook for Chat History Management
// Sprint 2B - Chat History + Visual Indicators

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { chatHistoryService, ConversationMetadata, ConversationSummary } from '../services/ChatHistoryService';
import { userSessionService } from '../services/UserSessionService';

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

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [conversations, summary] = await Promise.all([
        chatHistoryService.getConversationHistory(userId),
        chatHistoryService.getConversationSummary(userId)
      ]);

      setState(prev => ({
        ...prev,
        conversations,
        summary,
        filteredConversations: conversations,
        isLoading: false
      }));

      console.info(`Loaded ${conversations.length} conversations for user ${userId}`);

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
  }, [userId, options]);

  /**
   * Search conversations
   */
  const searchConversations = useCallback(async (query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));

    if (!userId) return;

    try {
      const filtered = await chatHistoryService.searchConversations(userId, query);
      setState(prev => ({ ...prev, filteredConversations: filtered }));
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Błąd wyszukiwania');
    }
  }, [userId]);

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
  }, [userId, options]);

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
    if (!userId) return;

    try {
      await chatHistoryService.updateConversationTitle(threadId, userId, newTitle);
      
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
  }, [userId]);

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
    deleteConversation,
    updateConversationTitle,
    clearSearch,
    
    // Status
    hasConversations: state.conversations.length > 0,
    hasFilteredResults: state.filteredConversations.length > 0
  };
};