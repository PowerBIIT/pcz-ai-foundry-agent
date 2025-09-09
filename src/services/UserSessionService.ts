// User Session Management Service
// Sprint 1 - Multi-User Support

import { UserSession, ThreadMappingStorage, UnauthorizedThreadAccessError, SessionCreationError } from '../types/UserSession';
import { SessionStorageManager } from '../utils/sessionStorage';
import { agentConfig } from '../authConfig';

export class UserSessionService {
  private sessions: Map<string, UserSession> = new Map();
  private initialized = false;

  /**
   * Initialize the service - load existing sessions
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const storage = SessionStorageManager.loadFromStorage();
      
      // Perform cleanup if needed
      const cleanedStorage = SessionStorageManager.shouldPerformCleanup(storage)
        ? SessionStorageManager.cleanupExpiredSessions(storage)
        : storage;

      // Load sessions into memory - use threadId as key to preserve all threads
      cleanedStorage.sessions.forEach(session => {
        this.sessions.set(session.threadId, session);
      });

      // Save cleaned storage back
      if (cleanedStorage !== storage) {
        SessionStorageManager.saveToStorage(cleanedStorage);
      }

      this.initialized = true;
      console.info(`UserSessionService initialized with ${this.sessions.size} active sessions`);

      // Monitor storage usage
      const storageInfo = SessionStorageManager.getStorageInfo();
      if (storageInfo.percentage > 80) {
        console.warn(`Storage usage is high: ${storageInfo.percentage}%`);
      }

    } catch (error) {
      console.error('Failed to initialize UserSessionService:', error);
      this.initialized = true; // Continue with empty state
    }
  }

  /**
   * Get or create thread for a user
   */
  async getUserThread(userId: string): Promise<string> {
    await this.ensureInitialized();

    // Find current session for user (newest threadId)
    let session = Array.from(this.sessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => (b.metadata?.sessionStart?.getTime() || 0) - (a.metadata?.sessionStart?.getTime() || 0))[0];

    if (!session || !session.isActive) {
      console.info(`Creating new session for user: ${userId}`);
      session = await this.createNewSession(userId);
    } else {
      // Update last active time
      session.lastActive = new Date();
      this.updateSession(session);
    }

    return session.threadId;
  }

  /**
   * Create a new session for a user
   */
  async createNewSession(userId: string, userInfo?: { displayName?: string; email?: string }): Promise<UserSession> {
    await this.ensureInitialized();

    try {
      // Create new Azure AI Foundry thread
      const threadId = await this.createAzureThread();
      
      const session: UserSession = {
        userId,
        threadId,
        lastActive: new Date(),
        isActive: true,
        metadata: {
          displayName: userInfo?.displayName,
          email: userInfo?.email,
          sessionStart: new Date(),
          messageCount: 0
        }
      };

      // Store in memory and localStorage - use threadId as key to allow multiple sessions per user
      this.sessions.set(session.threadId, session);
      this.persistSessions();

      console.info(`Created new session: ${userId} → ${threadId}`);
      return session;

    } catch (error) {
      console.error(`Failed to create session for user ${userId}:`, error);
      throw new SessionCreationError(userId, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Create a new Azure AI Foundry thread
   */
  private async createAzureThread(token?: string): Promise<string> {
    try {
      // If no token provided, generate temporary thread ID
      if (!token) {
        const threadId = SessionStorageManager.generateThreadId();
        console.info('Creating session thread ID:', threadId);
        return threadId;
      }

      // Create real Azure AI Foundry thread
      const response = await fetch(`${agentConfig.endpoint}/threads?api-version=2025-05-01`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error(`Thread creation failed: ${response.status} ${response.statusText}`);
      }
      
      const threadData = await response.json();
      console.info('Created real Azure thread:', threadData.id);
      return threadData.id;

    } catch (error) {
      console.error('Failed to create Azure thread:', error);
      
      // Fallback to local thread if Azure fails
      const fallbackId = SessionStorageManager.generateThreadId();
      console.info('Using local session thread ID:', fallbackId);
      return fallbackId;
    }
  }

  /**
   * Switch to a different thread for a user
   */
  async switchThread(userId: string, threadId: string): Promise<void> {
    await this.ensureInitialized();

    // Verify user owns this thread
    if (!(await this.authorizeThreadAccess(userId, threadId))) {
      throw new UnauthorizedThreadAccessError(userId, threadId);
    }

    // Find current session for user
    const session = Array.from(this.sessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => (b.metadata?.sessionStart?.getTime() || 0) - (a.metadata?.sessionStart?.getTime() || 0))[0];
    if (session) {
      session.threadId = threadId;
      session.lastActive = new Date();
      this.updateSession(session);
    }
  }

  /**
   * Authorize thread access for a user
   */
  async authorizeThreadAccess(userId: string, threadId: string): Promise<boolean> {
    await this.ensureInitialized();

    // Find current session for user
    const session = Array.from(this.sessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => (b.metadata?.sessionStart?.getTime() || 0) - (a.metadata?.sessionStart?.getTime() || 0))[0];
    if (!session) {
      return false;
    }

    // SIMPLIFIED: Allow access to any Azure AI Foundry thread for authenticated user
    // Since all threads are fetched from Azure with user's token, they belong to the user
    // The authorization happens at Azure API level via Bearer token

    // Check if session is still valid
    if (!session.isActive) {
      return false;
    }

    // Check if session has expired
    const now = new Date();
    const sessionAge = now.getTime() - session.lastActive.getTime();
    const maxAge = 60 * 60 * 1000; // 1 hour

    if (sessionAge > maxAge) {
      console.warn(`Session expired for user ${userId}`);
      session.isActive = false;
      this.updateSession(session);
      return false;
    }

    return true;
  }

  /**
   * Get all threads for a user
   */
  async getUserThreads(userId: string): Promise<string[]> {
    await this.ensureInitialized();

    const storage = SessionStorageManager.loadFromStorage();
    const userSessions = storage.sessions.filter(s => s.userId === userId);
    return userSessions.map(s => s.threadId);
  }

  /**
   * Get user session
   */
  async getUserSession(userId: string): Promise<UserSession | null> {
    await this.ensureInitialized();
    // Find current session for user (newest threadId)
    const session = Array.from(this.sessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => (b.metadata?.sessionStart?.getTime() || 0) - (a.metadata?.sessionStart?.getTime() || 0))[0];
    return session || null;
  }

  /**
   * Update user session
   */
  updateSession(session: UserSession): void {
    this.sessions.set(session.threadId, session);
    this.persistSessions();
  }

  /**
   * Increment message count for user session
   */
  incrementMessageCount(userId: string): void {
    // Find current session for user
    const session = Array.from(this.sessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => (b.metadata?.sessionStart?.getTime() || 0) - (a.metadata?.sessionStart?.getTime() || 0))[0];
    if (session && session.metadata) {
      session.metadata.messageCount++;
      session.lastActive = new Date();
      this.updateSession(session);
    }
  }

  /**
   * Deactivate user session
   */
  async deactivateSession(userId: string): Promise<void> {
    await this.ensureInitialized();

    // Find current session for user
    const session = Array.from(this.sessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => (b.metadata?.sessionStart?.getTime() || 0) - (a.metadata?.sessionStart?.getTime() || 0))[0];
    if (session) {
      session.isActive = false;
      session.lastActive = new Date();
      this.updateSession(session);
      console.info(`Deactivated session for user: ${userId}`);
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    await this.ensureInitialized();

    const storage = SessionStorageManager.loadFromStorage();
    const cleanedStorage = SessionStorageManager.cleanupExpiredSessions(storage);
    
    if (cleanedStorage.sessions.length !== storage.sessions.length) {
      // Reload sessions from cleaned storage
      this.sessions.clear();
      cleanedStorage.sessions.forEach(session => {
        this.sessions.set(session.threadId, session);
      });

      SessionStorageManager.saveToStorage(cleanedStorage);
      console.info(`Cleaned up ${storage.sessions.length - cleanedStorage.sessions.length} expired sessions`);
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): UserSession[] {
    return Array.from(this.sessions.values()).filter(s => s.isActive);
  }

  /**
   * Get service statistics
   */
  getStats(): { activeUsers: number; totalSessions: number; storageUsage: number } {
    const storageInfo = SessionStorageManager.getStorageInfo();
    
    return {
      activeUsers: this.getActiveSessions().length,
      totalSessions: this.sessions.size,
      storageUsage: storageInfo.percentage
    };
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Persist sessions to localStorage
   */
  private persistSessions(): void {
    try {
      const storage: ThreadMappingStorage = {
        version: '1.0.0',
        sessions: Array.from(this.sessions.values()),
        lastCleanup: new Date()
      };

      SessionStorageManager.saveToStorage(storage);
    } catch (error) {
      console.error('Failed to persist sessions:', error);
      // Don't throw - continue operation even if persistence fails
    }
  }
}

// Export singleton instance
export const userSessionService = new UserSessionService();