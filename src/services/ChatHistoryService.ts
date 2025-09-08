// Chat History Service - Conversation Management
// Sprint 2B - Chat History + Visual Indicators

import { userSessionService } from './UserSessionService';
import { UnauthorizedThreadAccessError } from '../types/UserSession';
import { ChatMessage } from './ChatService';
import { agentConfig } from '../authConfig';

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
  async getConversationHistory(userId: string, limit = 50): Promise<ConversationMetadata[]> {
    try {
      // Get all user threads
      const userThreads = await userSessionService.getUserThreads(userId);
      const conversations: ConversationMetadata[] = [];

      for (const threadId of userThreads) {
        try {
          // Verify authorization
          const authorized = await userSessionService.authorizeThreadAccess(userId, threadId);
          if (!authorized) {
            console.warn(`Unauthorized access to thread ${threadId} for user ${userId}`);
            continue;
          }

          // Get conversation metadata
          const metadata = await this.getConversationMetadata(threadId, userId);
          if (metadata && metadata.messageCount > 0) {
            conversations.push(metadata);
          }

        } catch (error) {
          console.warn(`Failed to load metadata for thread ${threadId}:`, error);
          // Continue with other threads
        }
      }

      // Sort by last activity (newest first)
      const sorted = conversations
        .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
        .slice(0, limit);

      return sorted;

    } catch (error) {
      console.error(`Failed to get conversation history for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get conversation metadata from thread
   */
  async getConversationMetadata(threadId: string, userId: string): Promise<ConversationMetadata | null> {
    try {
      // Check local cache first
      const cached = this.getCachedMetadata(threadId);
      if (cached && this.isMetadataFresh(cached)) {
        return cached;
      }

      // For now, generate metadata from session service
      // In real implementation, would call Azure AI Foundry
      const session = await userSessionService.getUserSession(userId);
      if (!session || session.threadId !== threadId) {
        return null;
      }

      const metadata: ConversationMetadata = {
        threadId,
        userId,
        title: this.generateConversationTitle(threadId, session.metadata?.messageCount || 0),
        lastMessage: 'Konwersacja z agentem finansowym',
        lastMessagePreview: 'Rozmowa dotycząca finansów uczelni...',
        lastActivity: session.lastActive,
        messageCount: session.metadata?.messageCount || 0,
        hasAttachments: await this.checkForAttachments(threadId, userId),
        agentType: 'Multi-Agent Router',
        tags: this.generateTags(threadId),
        isActive: session.isActive && session.threadId === threadId
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
  async searchConversations(userId: string, query: string): Promise<ConversationMetadata[]> {
    try {
      const allConversations = await this.getConversationHistory(userId);
      
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
  async getConversationSummary(userId: string): Promise<ConversationSummary> {
    try {
      const conversations = await this.getConversationHistory(userId, 100);
      
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
  async deleteConversation(threadId: string, userId: string): Promise<void> {
    try {
      // Verify authorization
      const authorized = await userSessionService.authorizeThreadAccess(userId, threadId);
      if (!authorized) {
        throw new UnauthorizedThreadAccessError(userId, threadId);
      }

      // Remove from cache
      this.removeCachedMetadata(threadId);
      
      // In real implementation, could also delete from Azure
      // For now, just deactivate in session service
      
      console.info(`Conversation ${threadId} deleted for user ${userId}`);

    } catch (error) {
      console.error(`Failed to delete conversation ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(threadId: string, userId: string, newTitle: string): Promise<void> {
    try {
      const metadata = await this.getConversationMetadata(threadId, userId);
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
}

// Export singleton instance
export const chatHistoryService = new ChatHistoryService();