// Chat History Service - Conversation Management
// Sprint 2B - Chat History + Visual Indicators

import { userSessionService } from './UserSessionService';
import { UnauthorizedThreadAccessError } from '../types/UserSession';
import { agentConfig } from '../authConfig';
import { chatService, ChatMessage } from './ChatService';

export interface ConversationMetadata {
  threadId: string;
  userId: string;
  title: string;
  lastMessage: string;
  lastMessagePreview: string;  // First 100 chars of last message
  lastActivity: Date;
  messageCount: number;
  hasAttachments: boolean;
  agentType?: string;         // Which expert was involved
  tags?: string[];           // Conversation tags
  isActive: boolean;         // Current conversation
}

export interface ConversationSummary {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  lastActivity: Date;
  topAgents: Array<{ agent: string; count: number }>;
}

export class ChatHistoryService {
  private endpoint: string;
  private readonly STORAGE_KEY = 'pcz-agent-chat-history';

  constructor(endpoint: string = agentConfig.endpoint) {
    this.endpoint = endpoint;
  }

  /**
   * Get conversation history for user
   */
  async getConversationHistory(userId: string, token: string, limit = 50): Promise<ConversationMetadata[]> {
    try {
      // Get all threads from Azure AI Foundry directly
      const azureThreads = await this.getAllAzureThreads(token);
      const conversations: ConversationMetadata[] = [];

      for (const threadId of azureThreads) {
        try {
          // TODO: Implement proper per-user thread isolation
          // For now, showing all threads (Azure doesn't filter automatically)
          // Get conversation metadata from Azure thread
          const metadata = await this.getConversationMetadata(threadId, userId, token);
          if (metadata && metadata.messageCount > 0) {
            conversations.push(metadata);
          }

        } catch (error) {
          console.warn(`Failed to load metadata for thread ${threadId}:`, error);
          // Continue with other threads
        }
      }

      // Deduplicate by threadId (usuwamy duplikaty)
      const unique = conversations.filter((conv, index, arr) => 
        arr.findIndex(c => c.threadId === conv.threadId) === index
      );

      // Sort by last activity (newest first)
      const sorted = unique
        .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
        .slice(0, limit);

      console.info(`Deduplicated: ${conversations.length} → ${unique.length} → ${sorted.length} conversations`);
      return sorted;

    } catch (error) {
      console.error(`Failed to get conversation history for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get conversation metadata from thread
   */
  async getConversationMetadata(threadId: string, userId: string, token: string): Promise<ConversationMetadata | null> {
    try {
      // Check local cache first
      const cached = this.getCachedMetadata(threadId);
      if (cached && this.isMetadataFresh(cached)) {
        return cached;
      }

      // Skip only local threads (check if it's in Azure by trying to fetch)
      // Don't skip all 'thread_' prefixed IDs as Azure also uses this format

      // Get real messages from Azure AI Foundry
      const realMessages = await this.getThreadRealMessages(threadId, token);
      if (!realMessages || realMessages.length === 0) {
        console.warn(`No messages found for thread ${threadId}, skipping`);
        return null;
      }

      const lastMessage = realMessages[0]; // Azure zwraca od najnowszych
      const firstUserMessage = realMessages.find(m => m.role === 'user');
      const lastAssistantMessage = realMessages.find(m => m.role === 'assistant');
      
      console.info(`Generated title from content: "${firstUserMessage?.content?.substring(0, 50)}"`);      

      const metadata: ConversationMetadata = {
        threadId,
        userId,
        title: await this.generateTitleFromContent(firstUserMessage?.content || ''),
        lastMessage: lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : ''),
        lastMessagePreview: lastMessage.content.substring(0, 100),
        lastActivity: lastMessage.timestamp,
        messageCount: realMessages.length,
        hasAttachments: await this.checkForAttachments(threadId, userId),
        agentType: this.detectAgentFromContent(lastAssistantMessage?.content || ''),
        tags: this.generateTagsFromContent(realMessages),
        isActive: await this.isThreadActive(userId, threadId)
      };

      // Cache metadata
      this.cacheMetadata(metadata);

      return metadata;

    } catch (error) {
      console.error(`Failed to get metadata for thread ${threadId}:`, error);
      return null;
    }
  }

  /**
   * Search conversations by query
   */
  async searchConversations(userId: string, query: string, token: string): Promise<ConversationMetadata[]> {
    try {
      const allConversations = await this.getConversationHistory(userId, token);
      
      if (!query.trim()) {
        return allConversations;
      }

      const searchTerm = query.toLowerCase();
      
      return allConversations.filter(conv => 
        conv.title.toLowerCase().includes(searchTerm) ||
        conv.lastMessage.toLowerCase().includes(searchTerm) ||
        conv.agentType?.toLowerCase().includes(searchTerm) ||
        conv.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
      );

    } catch (error) {
      console.error(`Failed to search conversations for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get conversation summary stats
   */
  async getConversationSummary(userId: string, token: string): Promise<ConversationSummary> {
    try {
      const conversations = await this.getConversationHistory(userId, token, 100);
      
      const agentCounts = new Map<string, number>();
      let totalMessages = 0;
      let lastActivity = new Date(0);

      conversations.forEach(conv => {
        totalMessages += conv.messageCount;
        
        if (conv.lastActivity > lastActivity) {
          lastActivity = conv.lastActivity;
        }

        if (conv.agentType) {
          agentCounts.set(conv.agentType, (agentCounts.get(conv.agentType) || 0) + 1);
        }
      });

      const topAgents = Array.from(agentCounts.entries())
        .map(([agent, count]) => ({ agent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalConversations: conversations.length,
        activeConversations: conversations.filter(c => c.isActive).length,
        totalMessages,
        lastActivity,
        topAgents
      };

    } catch (error) {
      console.error(`Failed to get summary for ${userId}:`, error);
      return {
        totalConversations: 0,
        activeConversations: 0,
        totalMessages: 0,
        lastActivity: new Date(),
        topAgents: []
      };
    }
  }

  /**
   * Delete conversation
   */
  async deleteConversation(threadId: string, userId: string, token: string): Promise<void> {
    try {
      // Delete directly from Azure AI Foundry
      const response = await fetch(
        `${this.endpoint}/threads/${threadId}?api-version=v1`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        throw new Error(`Azure delete failed: ${response.status}`);
      }

      // Remove from cache
      this.removeCachedMetadata(threadId);
      
      console.info(`Thread ${threadId} deleted from Azure AI Foundry for user ${userId}`);

    } catch (error) {
      console.error(`Failed to delete conversation ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Delete ALL conversations for user
   */
  async deleteAllConversations(userId: string, token: string): Promise<void> {
    try {
      // Get all Azure threads
      const azureThreads = await this.getAllAzureThreads(token);
      let deletedCount = 0;
      let errors = 0;

      for (const threadId of azureThreads) {
        try {
          await this.deleteConversation(threadId, userId, token);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete thread ${threadId}:`, error);
          errors++;
        }
      }

      // Clear all cache
      localStorage.removeItem(this.STORAGE_KEY);
      
      console.info(`Deleted ${deletedCount} conversations, ${errors} errors`);

      if (errors > 0) {
        throw new Error(`Usunięto ${deletedCount} rozmów, ${errors} błędów`);
      }

    } catch (error) {
      console.error(`Failed to delete all conversations for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(threadId: string, userId: string, newTitle: string, token: string): Promise<void> {
    try {
      const metadata = await this.getConversationMetadata(threadId, userId, token);
      if (metadata) {
        metadata.title = newTitle;
        this.cacheMetadata(metadata);
      }
    } catch (error) {
      console.error(`Failed to update title for ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Generate conversation title from content
   */
  private generateConversationTitle(threadId: string, messageCount: number): string {
    const threadShort = threadId.substring(0, 8);
    
    if (messageCount === 0) {
      return `Nowa rozmowa ${threadShort}`;
    } else if (messageCount < 5) {
      return `Rozmowa ${threadShort} (${messageCount} wiadomości)`;
    } else {
      return `Długa rozmowa ${threadShort} (${messageCount} wiadomości)`;
    }
    
    // In real implementation, could analyze first message content:
    // const firstMessage = await this.getFirstMessage(threadId);
    // return this.extractTitleFromMessage(firstMessage);
  }

  /**
   * Generate conversation tags
   */
  private generateTags(threadId: string): string[] {
    // In real implementation, would analyze conversation content
    // For now, return basic tags
    return ['finansowy', 'pcz', 'agent'];
  }

  /**
   * Check if conversation has attachments
   */
  private async checkForAttachments(threadId: string, userId: string): Promise<boolean> {
    try {
      // Check file metadata storage
      const fileStorage = localStorage.getItem('pcz-agent-file-metadata');
      if (!fileStorage) return false;

      const files = JSON.parse(fileStorage);
      return files.some((file: any) => 
        file.threadId === threadId && 
        file.userId === userId && 
        file.status === 'ready'
      );

    } catch (error) {
      console.warn(`Error checking attachments for ${threadId}:`, error);
      return false;
    }
  }

  /**
   * Cache conversation metadata
   */
  private cacheMetadata(metadata: ConversationMetadata): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const cache = stored ? JSON.parse(stored) : {};
      
      cache[metadata.threadId] = {
        ...metadata,
        cachedAt: new Date().toISOString()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to cache metadata:', error);
    }
  }

  /**
   * Get cached metadata
   */
  private getCachedMetadata(threadId: string): ConversationMetadata | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const cache = JSON.parse(stored);
      const cached = cache[threadId];
      
      if (!cached) return null;

      // Convert date strings back to Date objects
      return {
        ...cached,
        lastActivity: new Date(cached.lastActivity),
        cachedAt: undefined // Remove cache metadata
      };

    } catch (error) {
      console.warn('Failed to get cached metadata:', error);
      return null;
    }
  }

  /**
   * Remove cached metadata
   */
  private removeCachedMetadata(threadId: string): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const cache = JSON.parse(stored);
        delete cache[threadId];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
      }
    } catch (error) {
      console.warn('Failed to remove cached metadata:', error);
    }
  }

  /**
   * Check if metadata is fresh (within 5 minutes)
   */
  private isMetadataFresh(metadata: any): boolean {
    if (!metadata.cachedAt) return false;
    
    const cached = new Date(metadata.cachedAt);
    const now = new Date();
    const ageMinutes = (now.getTime() - cached.getTime()) / (1000 * 60);
    
    return ageMinutes < 5; // Fresh for 5 minutes
  }

  /**
   * Get real messages from Azure AI Foundry thread
   */
  async getThreadRealMessages(threadId: string, token: string): Promise<ChatMessage[]> {
    try {
      console.info(`Loading real messages for thread ${threadId}`);
      const messages = await chatService.getThreadAllMessages(threadId, token);
      console.info(`Found ${messages.length} real messages in thread ${threadId}`);
      return messages;
    } catch (error) {
      console.warn(`Failed to get real messages from thread ${threadId}:`, error);
      return [];
    }
  }

  /**
   * Load all messages from a conversation for display in chat interface
   */
  async loadConversationMessages(threadId: string, userId: string, token: string): Promise<ChatMessage[]> {
    try {
      console.info(`Loading conversation messages for thread ${threadId}`);
      
      // Get all messages from the thread directly from Azure
      const messages = await this.getThreadRealMessages(threadId, token);
      
      // Sort messages chronologically (oldest first) for chat display
      const sortedMessages = messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Add userId to all messages
      const messagesWithUserId = sortedMessages.map(msg => ({
        ...msg,
        userId,
        threadId
      }));

      console.info(`Loaded ${messagesWithUserId.length} messages for conversation ${threadId}`);
      return messagesWithUserId;

    } catch (error) {
      console.error(`Failed to load conversation messages for ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Generate title from first user message content
   */
  private async generateTitleFromContent(content: string): Promise<string> {
    if (!content || content.length === 0) {
      return 'Pusta rozmowa';
    }

    // Usuń formatowanie i skróć
    const cleaned = content.replace(/[*#_`]/g, '').trim();
    
    if (cleaned.length <= 50) {
      return cleaned;
    }

    // Znajdź punkt końcowy w pobliżu 50 znaków
    const truncated = cleaned.substring(0, 50);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > 30) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Detect which expert agent responded based on content
   */
  private detectAgentFromContent(content: string): string {
    if (content.includes('🔍') && content.includes('Audytor')) return 'Audytor';
    if (content.includes('💰') && content.includes('Budżet')) return 'Ekspert Budżetu';
    if (content.includes('📋') && content.includes('Zamówień')) return 'Ekspert Zamówień';
    if (content.includes('Ekspert_Majatku')) return 'Ekspert Majątku';
    if (content.includes('Ekspert_Plynnosci')) return 'Ekspert Płynności';
    if (content.includes('Ekspert_Rachunkowosci')) return 'Ekspert Rachunkowości';
    if (content.includes('Ekspert_Zarzadzen')) return 'Ekspert Zarządzeń';
    if (content.includes('Prawnik_Compliance')) return 'Prawnik';
    if (content.includes('Strateg')) return 'Strateg';
    if (content.includes('Mentor')) return 'Mentor';
    
    return 'Multi-Agent Router';
  }

  /**
   * Generate tags from conversation content
   */
  private generateTagsFromContent(messages: ChatMessage[]): string[] {
    const tags = ['finansowy', 'pcz', 'agent'];
    
    // Analizuj zawartość wiadomości dla dodatkowych tagów
    const allContent = messages.map(m => m.content.toLowerCase()).join(' ');
    
    if (allContent.includes('budżet') || allContent.includes('planowanie')) tags.push('budżet');
    if (allContent.includes('zamówień') || allContent.includes('przetarg')) tags.push('pzp');
    if (allContent.includes('audit') || allContent.includes('kontrola')) tags.push('audyt');
    if (allContent.includes('rachunek') || allContent.includes('księg')) tags.push('rachunkowość');
    if (allContent.includes('procedur') || allContent.includes('zarządzeń')) tags.push('procedury');
    if (allContent.includes('majątek') || allContent.includes('amortyzacja')) tags.push('majątek');
    if (allContent.includes('płynność') || allContent.includes('cash')) tags.push('płynność');
    
    return Array.from(new Set(tags)); // Usuń duplikaty
  }

  /**
   * Check if thread is currently active for user
   */
  private async isThreadActive(userId: string, threadId: string): Promise<boolean> {
    try {
      const currentThreadId = await userSessionService.getUserThread(userId);
      return currentThreadId === threadId;
    } catch (error) {
      console.warn(`Error checking if thread ${threadId} is active for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Cleanup old cached metadata
   */
  async cleanupOldCache(maxAge = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const cache = JSON.parse(stored);
      const cutoff = new Date(Date.now() - maxAge);
      const cleaned: any = {};

      Object.entries(cache).forEach(([threadId, metadata]: [string, any]) => {
        const cachedAt = new Date(metadata.cachedAt || 0);
        if (cachedAt > cutoff) {
          cleaned[threadId] = metadata;
        }
      });

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleaned));
      console.info(`Chat history cache cleanup completed`);

    } catch (error) {
      console.error('Failed to cleanup chat history cache:', error);
    }
  }

  /**
   * Get all threads from Azure AI Foundry
   */
  private async getAllAzureThreads(token: string): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.endpoint}/threads?api-version=2025-05-01&limit=50`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get threads: ${response.status}`);
      }

      const data = await response.json();
      const threadIds = data.data?.map((thread: any) => thread.id) || [];
      
      console.info(`Found ${threadIds.length} threads in Azure AI Foundry:`, threadIds);
      return threadIds;

    } catch (error) {
      console.error('Failed to get Azure threads:', error);
      return [];
    }
  }

  /**
   * Check if thread belongs to user (security per user)
   */
  private async doesThreadBelongToUser(threadId: string, userId: string, token: string): Promise<boolean> {
    try {
      // Check thread metadata in Azure to see if it belongs to this user
      const response = await fetch(
        `${this.endpoint}/threads/${threadId}?api-version=v1`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        return false;
      }

      const threadData = await response.json();
      
      // Check if metadata contains our userId (if we stored it during creation)
      const belongsToUser = threadData.metadata?.userId === userId;
      
      console.info(`Thread ${threadId} belongs to user ${userId}: ${belongsToUser}`);
      return belongsToUser;
      
    } catch (error) {
      console.warn(`Error checking thread ownership for ${threadId}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const chatHistoryService = new ChatHistoryService();