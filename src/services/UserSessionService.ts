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
  async createNewSession(userId: string, userInfo?: { displayName?: string; email?: string }, threadId?: string): Promise<UserSession> {
    await this.ensureInitialized();

    try {
      // Use provided threadId or create new Azure AI Foundry thread
      const actualThreadId = threadId || await this.createAzureThread();
      
      const session: UserSession = {
        userId,
        threadId: actualThreadId,
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

      console.info(`Created new session: ${userId} → ${actualThreadId}`);
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

    // Check if thread is registered to this user
    const threadSession = this.sessions.get(threadId);
    if (threadSession && threadSession.userId === userId) {
      // Register it if not already done
      if (!threadSession.isActive) {
        await this.registerAzureThread(userId, threadId);
      }
      return true;
    }

    // Check all user sessions
    const userSessions = Array.from(this.sessions.values())
      .filter(s => s.userId === userId);
    
    // Check if thread belongs to user through any session
    const hasAccess = userSessions.some(s => s.threadId === threadId);
    if (hasAccess) {
      return true;
    }

    // Also check if user has access to this thread through thread history
    const userThreads = await this.getUserThreads(userId);
    if (userThreads.includes(threadId)) {
      // Register the thread for future access
      await this.registerAzureThread(userId, threadId);
      return true;
    }

    // For Azure threads that exist but aren't registered yet,
    // register them to the user (this handles discovered threads)
    if (threadId.startsWith('thread_') && threadId.length > 20) {
      console.info(`Registering discovered Azure thread ${threadId} for user ${userId}`);
      await this.registerAzureThread(userId, threadId);
      return true;
    }

    return false;
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
   * Get all user threads across all users (for Azure sync)
   */
  async getAllUserThreads(): Promise<string[]> {
    await this.ensureInitialized();

    const storage = SessionStorageManager.loadFromStorage();
    const allThreads = storage.sessions.map(s => s.threadId);
    const uniqueThreads = Array.from(new Set(allThreads)); // Remove duplicates
    
    console.info(`Found ${uniqueThreads.length} unique threads in local storage`);
    return uniqueThreads;
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
   * Register an Azure thread with a user (for discovered threads)
   */
  async registerAzureThread(userId: string, threadId: string): Promise<void> {
    await this.ensureInitialized();
    
    // Check if thread already exists
    if (this.sessions.has(threadId)) {
      console.info(`Thread ${threadId} already registered`);
      return;
    }

    // Create session for discovered Azure thread
    const session: UserSession = {
      userId,
      threadId,
      lastActive: new Date(),
      isActive: false, // Not active since it's a discovered thread
      metadata: {
        sessionStart: new Date(),
        messageCount: 0
      }
    };

    this.sessions.set(threadId, session);
    this.persistSessions();
    console.info(`Registered Azure thread ${threadId} for user ${userId}`);
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