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
  private readonly THREAD_CACHE_KEY = 'pcz-agent-thread-cache';
  private readonly KNOWN_THREADS_KEY = 'pcz-agent-known-threads';
  private threadVerificationCache: Map<string, { verified: boolean; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(endpoint: string = agentConfig.endpoint) {
    this.endpoint = endpoint;
    // Load cached thread verification data on initialization
    this.loadThreadCacheFromStorage();
  }

  /**
   * Add known Azure thread IDs (for manual discovery)
   */
  addKnownThreads(threadIds: string[]): void {
    try {
      const stored = localStorage.getItem(this.KNOWN_THREADS_KEY);
      const knownThreads = stored ? JSON.parse(stored) : [];
      const updated = Array.from(new Set([...knownThreads, ...threadIds]));
      localStorage.setItem(this.KNOWN_THREADS_KEY, JSON.stringify(updated));
      console.info(`Added ${threadIds.length} known threads, total: ${updated.length}`);
    } catch (error) {
      console.error('Failed to add known threads:', error);
    }
  }

  /**
   * Get all known thread IDs
   */
  private getKnownThreads(): string[] {
    try {
      const stored = localStorage.getItem(this.KNOWN_THREADS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load known threads:', error);
      return [];
    }
  }

  /**
   * Fetch all threads from Azure AI Foundry API
   */
  async fetchAllThreadsFromAzure(token: string): Promise<string[]> {
    try {
      const allThreads: string[] = [];
      let after = '';
      let hasMore = true;
      
      while (hasMore) {
        const url = `${this.endpoint}/threads?api-version=2025-05-15-preview&limit=100&order=desc${after ? `&after=${after}` : ''}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          console.warn(`Failed to fetch threads from Azure: ${response.status}`);
          break;
        }
        
        const data = await response.json();
        
        if (data.data && Array.isArray(data.data)) {
          const threadIds = data.data.map((thread: any) => thread.id);
          allThreads.push(...threadIds);
          console.info(`Fetched ${threadIds.length} threads from Azure (total: ${allThreads.length})`);
        }
        
        // Check if there are more pages
        hasMore = data.has_more === true;
        if (hasMore && data.data && data.data.length > 0) {
          after = data.data[data.data.length - 1].id;
        } else {
          hasMore = false;
        }
      }
      
      console.info(`Successfully fetched ${allThreads.length} threads from Azure AI Foundry`);
      return allThreads;
      
    } catch (error) {
      console.error('Failed to fetch threads from Azure:', error);
      return [];
    }
  }

  /**
   * Get conversation history for user with enhanced Azure synchronization
   */
  async getConversationHistory(userId: string, token: string, limit = 50): Promise<ConversationMetadata[]> {
    try {
      // Get threads from multiple sources including AZURE API
      const [localThreads, allLocalThreads, knownThreads, azureThreads] = await Promise.all([
        userSessionService.getUserThreads(userId),
        userSessionService.getAllUserThreads(),
        Promise.resolve(this.getKnownThreads()),
        this.fetchAllThreadsFromAzure(token)
      ]);
      
      // Combine and deduplicate thread IDs from all sources
      const allThreads = Array.from(new Set([...localThreads, ...allLocalThreads, ...knownThreads, ...azureThreads]));
      console.info(`Found ${allThreads.length} unique threads (${localThreads.length} user, ${allLocalThreads.length} total, ${knownThreads.length} known, ${azureThreads.length} from Azure)`);
      
      const conversations: ConversationMetadata[] = [];
      const verificationPromises: Promise<void>[] = [];

      for (const threadId of allThreads) {
        // Parallel verification and loading
        const promise = (async () => {
          try {
            // Try to verify thread exists in Azure (with cache)
            const exists = await this.verifyThreadExistsWithCache(threadId, token);
            if (!exists) {
              console.info(`Thread ${threadId} no longer exists in Azure, skipping`);
              return;
            }

            // Register thread with user if it exists in Azure
            await userSessionService.registerAzureThread(userId, threadId);
            
            // Check authorization
            const authorized = await userSessionService.authorizeThreadAccess(userId, threadId);
            if (!authorized) {
              console.warn(`Unauthorized access to thread ${threadId} for user ${userId}`);
              return;
            }

            // Get conversation metadata
            const metadata = await this.getConversationMetadata(threadId, userId, token);
            if (metadata && metadata.messageCount > 0) {
              conversations.push(metadata);
            }

          } catch (error) {
            console.warn(`Failed to load metadata for thread ${threadId}:`, error);
          }
        })();
        
        verificationPromises.push(promise);
      }
      
      // Wait for all verifications to complete
      await Promise.all(verificationPromises);

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
  async deleteConversation(threadId: string, userId: string, token?: string): Promise<void> {
    try {
      // Verify authorization
      const authorized = await userSessionService.authorizeThreadAccess(userId, threadId);
      if (!authorized) {
        throw new UnauthorizedThreadAccessError(userId, threadId);
      }

      // Delete from Azure AI Foundry if token is provided
      if (token) {
        try {
          const deleteResponse = await fetch(
            `${this.endpoint}/threads/${threadId}?api-version=2025-05-01`,
            {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          
          if (deleteResponse.ok) {
            console.info(`Successfully deleted thread ${threadId} from Azure AI Foundry`);
          } else if (deleteResponse.status === 404) {
            console.warn(`Thread ${threadId} already deleted from Azure or doesn't exist`);
          } else {
            console.error(`Failed to delete thread from Azure: ${deleteResponse.status}`);
            // Continue with local cleanup even if Azure delete fails
          }
        } catch (azureError) {
          console.error(`Error deleting thread from Azure:`, azureError);
          // Continue with local cleanup even if Azure delete fails
        }
      }

      // Remove from cache
      this.removeCachedMetadata(threadId);
      
      // Remove from known threads
      const knownThreads = this.getKnownThreads();
      const updatedThreads = knownThreads.filter(id => id !== threadId);
      localStorage.setItem(this.KNOWN_THREADS_KEY, JSON.stringify(updatedThreads));
      
      console.info(`Conversation ${threadId} deleted for user ${userId}`);

    } catch (error) {
      console.error(`Failed to delete conversation ${threadId}:`, error);
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
   * Check if metadata is fresh (within TTL)
   */
  private isMetadataFresh(metadata: any): boolean {
    if (!metadata.cachedAt) return false;
    
    const cached = new Date(metadata.cachedAt);
    const now = new Date();
    const age = now.getTime() - cached.getTime();
    
    return age < this.CACHE_TTL;
  }

  /**
   * Verify thread exists in Azure with cache
   */
  private async verifyThreadExistsWithCache(threadId: string, token: string): Promise<boolean> {
    // Check memory cache first
    const cached = this.threadVerificationCache.get(threadId);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.verified;
    }

    try {
      // Make actual API call to verify thread exists in Azure AI Foundry
      const response = await fetch(
        `${this.endpoint}/threads/${threadId}?api-version=2025-05-01`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const exists = response.ok;
      
      // Cache the result
      this.threadVerificationCache.set(threadId, {
        verified: exists,
        timestamp: Date.now()
      });

      // Also save to localStorage for persistence
      this.saveThreadCacheToStorage();

      if (!exists) {
        console.info(`Thread ${threadId} does not exist in Azure AI Foundry`);
      }

      return exists;
    } catch (error) {
      console.warn(`Error verifying thread ${threadId} in Azure:`, error);
      return false;
    }
  }

  /**
   * Save thread verification cache to localStorage
   */
  private saveThreadCacheToStorage(): void {
    try {
      const cacheData = Array.from(this.threadVerificationCache.entries()).map(([key, value]) => ({
        threadId: key,
        ...value
      }));
      
      localStorage.setItem(this.THREAD_CACHE_KEY, JSON.stringify({
        data: cacheData,
        savedAt: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to save thread cache:', error);
    }
  }

  /**
   * Load thread verification cache from localStorage
   */
  private loadThreadCacheFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.THREAD_CACHE_KEY);
      if (!stored) return;

      const cache = JSON.parse(stored);
      if (!cache.data || (Date.now() - cache.savedAt) > this.CACHE_TTL) {
        return; // Cache too old
      }

      cache.data.forEach((item: any) => {
        if ((Date.now() - item.timestamp) < this.CACHE_TTL) {
          this.threadVerificationCache.set(item.threadId, {
            verified: item.verified,
            timestamp: item.timestamp
          });
        }
      });
    } catch (error) {
      console.warn('Failed to load thread cache:', error);
    }
  }

  /**
   * Get real messages from Azure AI Foundry thread
   */
  async getThreadRealMessages(threadId: string, token: string): Promise<ChatMessage[]> {
    try {
      console.info(`Loading real messages from Azure AI Foundry for thread ${threadId}`);
      const messages = await chatService.getThreadAllMessages(threadId, token);
      console.info(`Successfully loaded ${messages.length} real messages from Azure for thread ${threadId}`);
      return messages;
    } catch (error) {
      console.error(`Failed to get real messages from Azure AI Foundry thread ${threadId}:`, error);
      return [];
    }
  }

  /**
   * Load all messages from a conversation for display in chat interface
   */
  async loadConversationMessages(threadId: string, userId: string, token: string): Promise<ChatMessage[]> {
    try {
      // Verify user has access to this thread
      const authorized = await userSessionService.authorizeThreadAccess(userId, threadId);
      if (!authorized) {
        throw new Error(`Unauthorized access to thread ${threadId} for user ${userId}`);
      }

      console.info(`Loading conversation messages for thread ${threadId}`);
      
      // Get all messages from the thread
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
   * Delete all conversations for a user
   */
  async deleteAllConversations(userId: string, token?: string): Promise<{ deleted: number; failed: number }> {
    try {
      console.info(`Starting deletion of all conversations for user ${userId}`);
      
      // Get all user threads
      const userThreads = await userSessionService.getUserThreads(userId);
      
      if (userThreads.length === 0) {
        console.info('No conversations to delete');
        return { deleted: 0, failed: 0 };
      }

      console.info(`Found ${userThreads.length} conversations to delete`);
      
      let deleted = 0;
      let failed = 0;

      // Delete threads in parallel batches (10 at a time to avoid overwhelming the API)
      const batchSize = 10;
      for (let i = 0; i < userThreads.length; i += batchSize) {
        const batch = userThreads.slice(i, i + batchSize);
        
        const deletePromises = batch.map(async (threadId) => {
          try {
            // Delete from Azure if token provided
            if (token) {
              const deleteResponse = await fetch(
                `${this.endpoint}/threads/${threadId}?api-version=2025-05-01`,
                {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                }
              );
              
              if (deleteResponse.ok) {
                console.info(`Deleted thread ${threadId} from Azure`);
              } else if (deleteResponse.status === 404) {
                console.info(`Thread ${threadId} already deleted from Azure`);
              } else {
                console.error(`Failed to delete thread ${threadId}: ${deleteResponse.status}`);
                failed++;
                return;
              }
            }
            
            // Remove from local cache
            this.removeCachedMetadata(threadId);
            deleted++;
            
          } catch (error) {
            console.error(`Error deleting thread ${threadId}:`, error);
            failed++;
          }
        });
        
        await Promise.all(deletePromises);
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < userThreads.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Clear all local storage for this user
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const cache = JSON.parse(stored);
          // Remove all entries for this user
          for (const threadId in cache) {
            if (cache[threadId].userId === userId) {
              delete cache[threadId];
            }
          }
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
        }
      } catch (error) {
        console.warn('Failed to clear local cache:', error);
      }

      console.info(`Deletion complete: ${deleted} deleted, ${failed} failed`);
      return { deleted, failed };
      
    } catch (error) {
      console.error('Failed to delete all conversations:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const chatHistoryService = new ChatHistoryService();