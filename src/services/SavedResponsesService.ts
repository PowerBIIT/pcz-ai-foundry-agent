// Saved Responses Service - Bookmark Important Answers
// Sprint 3 - Professional Tools

export interface SavedResponse {
  id: string;
  userId: string;
  content: string;
  title: string;
  category: 'budżet' | 'pzp' | 'audyt' | 'rachunkowość' | 'procedury' | 'inne';
  agentType?: string;
  tags: string[];
  savedAt: Date;
  lastAccessed: Date;
  accessCount: number;
  threadId?: string;
  messageTimestamp?: Date;
  isFavorite: boolean;
  note?: string; // User's personal note
}

export interface SavedResponsesStats {
  totalSaved: number;
  byCategory: Record<SavedResponse['category'], number>;
  topTags: Array<{ tag: string; count: number }>;
  recentlyAccessed: SavedResponse[];
  favorites: number;
}

export class SavedResponsesService {
  private readonly STORAGE_KEY = 'pcz-agent-saved-responses';
  private readonly MAX_SAVED = 200; // Limit dla localStorage

  /**
   * Save agent response as important
   */
  async saveResponse(
    userId: string,
    content: string,
    title: string,
    category: SavedResponse['category'],
    options?: {
      agentType?: string;
      tags?: string[];
      threadId?: string;
      messageTimestamp?: Date;
      note?: string;
    }
  ): Promise<SavedResponse> {
    try {
      const savedResponse: SavedResponse = {
        id: this.generateId(),
        userId,
        content,
        title,
        category,
        agentType: options?.agentType,
        tags: options?.tags || this.generateAutoTags(content),
        savedAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        threadId: options?.threadId,
        messageTimestamp: options?.messageTimestamp,
        isFavorite: false,
        note: options?.note
      };

      // Load existing responses
      const existing = this.loadSavedResponses();
      
      // Check for duplicates
      const isDuplicate = existing.some(response => 
        response.userId === userId && 
        response.content === content.substring(0, 500)
      );

      if (isDuplicate) {
        throw new Error('Ta odpowiedź została już zapisana');
      }

      // Add new response
      existing.push(savedResponse);

      // Enforce limit
      if (existing.length > this.MAX_SAVED) {
        // Remove oldest non-favorite responses
        existing.sort((a, b) => {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return a.lastAccessed.getTime() - b.lastAccessed.getTime();
        });
        
        existing.splice(this.MAX_SAVED);
      }

      this.saveSavedResponses(existing);
      console.info(`Saved response: ${title} for user ${userId}`);
      
      return savedResponse;

    } catch (error) {
      console.error('Failed to save response:', error);
      throw error;
    }
  }

  /**
   * Get all saved responses for user
   */
  async getUserSavedResponses(userId: string): Promise<SavedResponse[]> {
    try {
      const all = this.loadSavedResponses();
      const userResponses = all.filter(response => response.userId === userId);
      
      // Sort by last accessed (most recent first)
      return userResponses.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
      
    } catch (error) {
      console.error(`Failed to get saved responses for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Search saved responses
   */
  async searchSavedResponses(
    userId: string, 
    query: string,
    filters?: {
      category?: SavedResponse['category'];
      tags?: string[];
      favoritesOnly?: boolean;
    }
  ): Promise<SavedResponse[]> {
    try {
      let responses = await this.getUserSavedResponses(userId);

      // Apply filters
      if (filters?.category) {
        responses = responses.filter(r => r.category === filters.category);
      }

      if (filters?.tags && filters.tags.length > 0) {
        responses = responses.filter(r => 
          filters.tags!.some(tag => r.tags.includes(tag))
        );
      }

      if (filters?.favoritesOnly) {
        responses = responses.filter(r => r.isFavorite);
      }

      // Apply text search
      if (query.trim()) {
        const searchTerm = query.toLowerCase();
        responses = responses.filter(r =>
          r.title.toLowerCase().includes(searchTerm) ||
          r.content.toLowerCase().includes(searchTerm) ||
          r.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
          r.note?.toLowerCase().includes(searchTerm)
        );
      }

      return responses;

    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Access saved response (increment counter)
   */
  async accessSavedResponse(responseId: string, userId: string): Promise<SavedResponse | null> {
    try {
      const all = this.loadSavedResponses();
      const response = all.find(r => r.id === responseId && r.userId === userId);
      
      if (!response) {
        return null;
      }

      // Update access info
      response.lastAccessed = new Date();
      response.accessCount++;

      this.saveSavedResponses(all);
      return response;

    } catch (error) {
      console.error('Failed to access saved response:', error);
      return null;
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(responseId: string, userId: string): Promise<boolean> {
    try {
      const all = this.loadSavedResponses();
      const response = all.find(r => r.id === responseId && r.userId === userId);
      
      if (!response) {
        throw new Error('Saved response not found');
      }

      response.isFavorite = !response.isFavorite;
      this.saveSavedResponses(all);
      
      return response.isFavorite;

    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      throw error;
    }
  }

  /**
   * Update response note
   */
  async updateNote(responseId: string, userId: string, note: string): Promise<void> {
    try {
      const all = this.loadSavedResponses();
      const response = all.find(r => r.id === responseId && r.userId === userId);
      
      if (!response) {
        throw new Error('Saved response not found');
      }

      response.note = note.trim() || undefined;
      this.saveSavedResponses(all);

    } catch (error) {
      console.error('Failed to update note:', error);
      throw error;
    }
  }

  /**
   * Delete saved response
   */
  async deleteSavedResponse(responseId: string, userId: string): Promise<void> {
    try {
      const all = this.loadSavedResponses();
      const filtered = all.filter(r => !(r.id === responseId && r.userId === userId));
      
      if (filtered.length === all.length) {
        throw new Error('Saved response not found');
      }

      this.saveSavedResponses(filtered);
      console.info(`Deleted saved response: ${responseId} for user ${userId}`);

    } catch (error) {
      console.error('Failed to delete saved response:', error);
      throw error;
    }
  }

  /**
   * Get statistics for user's saved responses
   */
  async getStats(userId: string): Promise<SavedResponsesStats> {
    try {
      const responses = await this.getUserSavedResponses(userId);

      // By category
      const byCategory = responses.reduce((acc, response) => {
        acc[response.category] = (acc[response.category] || 0) + 1;
        return acc;
      }, {} as Record<SavedResponse['category'], number>);

      // Top tags
      const tagCounts = new Map<string, number>();
      responses.forEach(response => {
        response.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });

      const topTags = Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Recently accessed
      const recentlyAccessed = responses
        .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
        .slice(0, 5);

      return {
        totalSaved: responses.length,
        byCategory,
        topTags,
        recentlyAccessed,
        favorites: responses.filter(r => r.isFavorite).length
      };

    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        totalSaved: 0,
        byCategory: {} as any,
        topTags: [],
        recentlyAccessed: [],
        favorites: 0
      };
    }
  }

  /**
   * Auto-generate tags from content
   */
  private generateAutoTags(content: string): string[] {
    const tags: string[] = [];
    
    // Financial terms
    if (/budżet|finansow|kwot|koszt|wydatek/i.test(content)) tags.push('finansowy');
    if (/zamówien|przetarg|PZP/i.test(content)) tags.push('zamówienia');
    if (/audyt|kontrol|nieprawidłow|fraud/i.test(content)) tags.push('audyt');
    if (/księgow|ewidencj|plan.*kont/i.test(content)) tags.push('rachunkowość');
    if (/procedur|regulamin|zarządzen/i.test(content)) tags.push('procedury');
    if (/prawo|ustaw|przepis/i.test(content)) tags.push('prawny');
    
    // Amount-based tags
    if (/\d+.*PLN|\d+.*euro/i.test(content)) tags.push('kwoty');
    if (/1000.*PLN|próg.*1000/i.test(content)) tags.push('progi');
    
    return tags.length > 0 ? tags : ['ogólny'];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `saved_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Load saved responses from localStorage
   */
  private loadSavedResponses(): SavedResponse[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      
      // Convert date strings back to Date objects
      return parsed.map((response: any) => ({
        ...response,
        savedAt: new Date(response.savedAt),
        lastAccessed: new Date(response.lastAccessed),
        messageTimestamp: response.messageTimestamp ? new Date(response.messageTimestamp) : undefined
      }));

    } catch (error) {
      console.error('Failed to load saved responses:', error);
      return [];
    }
  }

  /**
   * Save responses to localStorage
   */
  private saveSavedResponses(responses: SavedResponse[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(responses));
    } catch (error) {
      console.error('Failed to save responses:', error);
      
      // Handle quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, cleaning up saved responses');
        const reduced = responses
          .filter(r => r.isFavorite || r.accessCount > 0)
          .slice(0, Math.floor(this.MAX_SAVED / 2));
        
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reduced));
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError);
        }
      }
    }
  }

  /**
   * Get category icon
   */
  static getCategoryIcon(category: SavedResponse['category']): string {
    const icons = {
      'budżet': '💰',
      'pzp': '📋',
      'audyt': '🔍',
      'rachunkowość': '🧮',
      'procedury': '📜',
      'inne': '📄'
    };
    return icons[category] || '📄';
  }

  /**
   * Get category color
   */
  static getCategoryColor(category: SavedResponse['category']): string {
    const colors = {
      'budżet': '#28a745',
      'pzp': '#007acc',
      'audyt': '#dc3545',
      'rachunkowość': '#6f42c1',
      'procedury': '#fd7e14',
      'inne': '#6c757d'
    };
    return colors[category] || '#6c757d';
  }
}

// Export singleton
export const savedResponsesService = new SavedResponsesService();