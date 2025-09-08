// Session Storage Utilities
// Sprint 1 - Multi-User Support

import { UserSession, ThreadMappingStorage } from '../types/UserSession';

export class SessionStorageManager {
  private static readonly STORAGE_KEY = 'pcz-agent-thread-mapping';
  private static readonly CURRENT_VERSION = '1.0.0';
  private static readonly MAX_SESSIONS_PER_USER = 10;
  private static readonly SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Load thread mapping data from localStorage
   */
  static loadFromStorage(): ThreadMappingStorage {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return this.createEmptyStorage();
      }

      const parsed = JSON.parse(stored) as ThreadMappingStorage;
      
      // Validate version and migrate if needed
      if (parsed.version !== this.CURRENT_VERSION) {
        console.warn(`Storage version mismatch. Current: ${this.CURRENT_VERSION}, Found: ${parsed.version}`);
        return this.migrateStorage(parsed);
      }

      // Convert date strings back to Date objects
      parsed.lastCleanup = new Date(parsed.lastCleanup);
      parsed.sessions = parsed.sessions.map(session => ({
        ...session,
        lastActive: new Date(session.lastActive),
        metadata: session.metadata ? {
          ...session.metadata,
          sessionStart: new Date(session.metadata.sessionStart)
        } : undefined
      }));

      return parsed;
    } catch (error) {
      console.error('Error loading session storage:', error);
      return this.createEmptyStorage();
    }
  }

  /**
   * Save thread mapping data to localStorage
   */
  static saveToStorage(data: ThreadMappingStorage): void {
    try {
      const toStore = {
        ...data,
        version: this.CURRENT_VERSION
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error('Error saving session storage:', error);
      
      // If quota exceeded, try cleanup and retry
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, performing cleanup');
        this.performEmergencyCleanup(data);
        
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (retryError) {
          console.error('Failed to save after cleanup:', retryError);
          throw new Error('Storage save failed: quota exceeded');
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Create empty storage structure
   */
  private static createEmptyStorage(): ThreadMappingStorage {
    return {
      version: this.CURRENT_VERSION,
      sessions: [],
      lastCleanup: new Date()
    };
  }

  /**
   * Migrate storage from older version
   */
  private static migrateStorage(oldData: any): ThreadMappingStorage {
    console.info('Migrating session storage to current version');
    
    // For now, just recreate empty storage
    // In future versions, implement actual migration logic
    return this.createEmptyStorage();
  }

  /**
   * Clean up expired sessions
   */
  static cleanupExpiredSessions(data: ThreadMappingStorage): ThreadMappingStorage {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - this.SESSION_TIMEOUT_MS);

    const activeSessions = data.sessions.filter(session => {
      const isNotExpired = session.lastActive > cutoffTime;
      const isActive = session.isActive;
      
      if (!isNotExpired || !isActive) {
        console.info(`Cleaning up expired session: ${session.userId} → ${session.threadId}`);
      }
      
      return isNotExpired && isActive;
    });

    // Also limit sessions per user to prevent storage bloat
    const sessionsByUser = new Map<string, UserSession[]>();
    activeSessions.forEach(session => {
      const userSessions = sessionsByUser.get(session.userId) || [];
      userSessions.push(session);
      sessionsByUser.set(session.userId, userSessions);
    });

    const limitedSessions: UserSession[] = [];
    sessionsByUser.forEach((userSessions, userId) => {
      // Sort by lastActive, keep only the most recent MAX_SESSIONS_PER_USER
      const sortedSessions = userSessions.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
      const keepSessions = sortedSessions.slice(0, this.MAX_SESSIONS_PER_USER);
      
      if (sortedSessions.length > this.MAX_SESSIONS_PER_USER) {
        console.info(`Limiting sessions for user ${userId}: ${sortedSessions.length} → ${keepSessions.length}`);
      }
      
      limitedSessions.push(...keepSessions);
    });

    return {
      ...data,
      sessions: limitedSessions,
      lastCleanup: now
    };
  }

  /**
   * Emergency cleanup when storage quota exceeded
   */
  private static performEmergencyCleanup(data: ThreadMappingStorage): void {
    console.warn('Performing emergency storage cleanup');
    
    // Keep only the most recent session per user
    const sessionsByUser = new Map<string, UserSession>();
    
    data.sessions.forEach(session => {
      const existing = sessionsByUser.get(session.userId);
      if (!existing || session.lastActive > existing.lastActive) {
        sessionsByUser.set(session.userId, session);
      }
    });

    data.sessions = Array.from(sessionsByUser.values());
    console.info(`Emergency cleanup: kept ${data.sessions.length} sessions`);
  }

  /**
   * Generate a unique thread ID
   */
  static generateThreadId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `thread_${timestamp}_${random}`;
  }

  /**
   * Check if cleanup is needed
   */
  static shouldPerformCleanup(data: ThreadMappingStorage): boolean {
    const now = new Date();
    const timeSinceLastCleanup = now.getTime() - data.lastCleanup.getTime();
    const cleanupInterval = 30 * 60 * 1000; // 30 minutes
    
    return timeSinceLastCleanup > cleanupInterval;
  }

  /**
   * Get storage usage information
   */
  static getStorageInfo(): { used: number; available: number; percentage: number } {
    let used = 0;
    let available = 5 * 1024 * 1024; // 5MB typical localStorage limit
    
    try {
      // Calculate current usage
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage.getItem(key)?.length || 0;
        }
      }
      
      const percentage = (used / available) * 100;
      
      return {
        used,
        available,
        percentage: Math.round(percentage * 100) / 100
      };
    } catch (error) {
      console.warn('Could not calculate storage usage:', error);
      return { used: 0, available, percentage: 0 };
    }
  }
}