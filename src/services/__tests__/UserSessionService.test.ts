// UserSessionService Unit Tests
// Sprint 1 - Multi-User Support

import { UserSessionService } from '../UserSessionService';
import { UnauthorizedThreadAccessError, SessionCreationError } from '../../types/UserSession';
import { SessionStorageManager } from '../../utils/sessionStorage';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

// Mock SessionStorageManager
jest.mock('../../utils/sessionStorage');
const mockSessionStorageManager = SessionStorageManager as jest.Mocked<typeof SessionStorageManager>;

describe('UserSessionService', () => {
  let service: UserSessionService;
  const mockUserId1 = 'user123.homeAccountId';
  const mockUserId2 = 'user456.homeAccountId';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserSessionService();
    
    // Setup default mocks
    mockSessionStorageManager.loadFromStorage.mockReturnValue({
      version: '1.0.0',
      sessions: [],
      lastCleanup: new Date()
    });
    
    mockSessionStorageManager.shouldPerformCleanup.mockReturnValue(false);
    mockSessionStorageManager.generateThreadId.mockReturnValue('thread_test_123');
    mockSessionStorageManager.getStorageInfo.mockReturnValue({
      used: 1000,
      available: 5000000,
      percentage: 0.02
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with empty storage', async () => {
      await service.initialize();
      
      expect(mockSessionStorageManager.loadFromStorage).toHaveBeenCalledTimes(1);
      expect(service.getActiveSessions()).toHaveLength(0);
    });

    it('should load existing sessions from storage', async () => {
      const existingSession = {
        userId: mockUserId1,
        threadId: 'thread_existing',
        lastActive: new Date(),
        isActive: true,
        metadata: {
          sessionStart: new Date(),
          messageCount: 5
        }
      };

      mockSessionStorageManager.loadFromStorage.mockReturnValue({
        version: '1.0.0',
        sessions: [existingSession],
        lastCleanup: new Date()
      });

      await service.initialize();

      const userSession = await service.getUserSession(mockUserId1);
      expect(userSession).toBeTruthy();
      expect(userSession?.threadId).toBe('thread_existing');
    });

    it('should perform cleanup if needed during initialization', async () => {
      const cleanedStorage = {
        version: '1.0.0',
        sessions: [],
        lastCleanup: new Date()
      };

      mockSessionStorageManager.shouldPerformCleanup.mockReturnValue(true);
      mockSessionStorageManager.cleanupExpiredSessions.mockReturnValue(cleanedStorage);
      mockSessionStorageManager.saveToStorage.mockImplementation();

      await service.initialize();

      expect(mockSessionStorageManager.cleanupExpiredSessions).toHaveBeenCalledTimes(1);
      expect(mockSessionStorageManager.saveToStorage).toHaveBeenCalledWith(cleanedStorage);
    });
  });

  describe('getUserThread', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should create new session for new user', async () => {
      const threadId = await service.getUserThread(mockUserId1);
      
      expect(threadId).toBe('thread_test_123');
      expect(mockSessionStorageManager.generateThreadId).toHaveBeenCalledTimes(1);
      
      const session = await service.getUserSession(mockUserId1);
      expect(session).toBeTruthy();
      expect(session?.userId).toBe(mockUserId1);
      expect(session?.isActive).toBe(true);
    });

    it('should return existing thread for returning user', async () => {
      // First call creates session
      const threadId1 = await service.getUserThread(mockUserId1);
      
      // Second call should return same thread
      const threadId2 = await service.getUserThread(mockUserId1);
      
      expect(threadId1).toBe(threadId2);
      expect(mockSessionStorageManager.generateThreadId).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should update lastActive on subsequent calls', async () => {
      await service.getUserThread(mockUserId1);
      const session1 = await service.getUserSession(mockUserId1);
      const firstActiveTime = session1?.lastActive;
      
      // Wait a bit and call again
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.getUserThread(mockUserId1);
      
      const session2 = await service.getUserSession(mockUserId1);
      const secondActiveTime = session2?.lastActive;
      
      expect(secondActiveTime?.getTime()).toBeGreaterThan(firstActiveTime?.getTime() || 0);
    });

    it('should isolate threads between different users', async () => {
      mockSessionStorageManager.generateThreadId
        .mockReturnValueOnce('thread_user1')
        .mockReturnValueOnce('thread_user2');

      const thread1 = await service.getUserThread(mockUserId1);
      const thread2 = await service.getUserThread(mockUserId2);
      
      expect(thread1).toBe('thread_user1');
      expect(thread2).toBe('thread_user2');
      expect(thread1).not.toBe(thread2);
    });
  });

  describe('createNewSession', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should create new session with user info', async () => {
      const userInfo = {
        displayName: 'Jan Kowalski',
        email: 'jan.kowalski@powerbiit.com'
      };

      const session = await service.createNewSession(mockUserId1, userInfo);

      expect(session.userId).toBe(mockUserId1);
      expect(session.threadId).toBe('thread_test_123');
      expect(session.isActive).toBe(true);
      expect(session.metadata?.displayName).toBe(userInfo.displayName);
      expect(session.metadata?.email).toBe(userInfo.email);
      expect(session.metadata?.messageCount).toBe(0);
    });

    it('should create new session without user info', async () => {
      const session = await service.createNewSession(mockUserId1);

      expect(session.userId).toBe(mockUserId1);
      expect(session.metadata?.displayName).toBeUndefined();
      expect(session.metadata?.email).toBeUndefined();
    });

    it('should handle thread creation failure', async () => {
      mockSessionStorageManager.generateThreadId.mockImplementation(() => {
        throw new Error('Thread creation failed');
      });

      await expect(service.createNewSession(mockUserId1))
        .rejects
        .toThrow(SessionCreationError);
    });
  });

  describe('authorizeThreadAccess', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should authorize access to own thread', async () => {
      const threadId = await service.getUserThread(mockUserId1);
      const authorized = await service.authorizeThreadAccess(mockUserId1, threadId);
      
      expect(authorized).toBe(true);
    });

    it('should deny access to other user thread', async () => {
      const threadId1 = await service.getUserThread(mockUserId1);
      const authorized = await service.authorizeThreadAccess(mockUserId2, threadId1);
      
      expect(authorized).toBe(false);
    });

    it('should deny access for non-existent user', async () => {
      const authorized = await service.authorizeThreadAccess('nonexistent', 'thread_123');
      
      expect(authorized).toBe(false);
    });

    it('should deny access for inactive session', async () => {
      const threadId = await service.getUserThread(mockUserId1);
      
      // Deactivate session
      await service.deactivateSession(mockUserId1);
      
      const authorized = await service.authorizeThreadAccess(mockUserId1, threadId);
      expect(authorized).toBe(false);
    });
  });

  describe('switchThread', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should allow switching to authorized thread', async () => {
      // Create session and get original thread
      const originalThread = await service.getUserThread(mockUserId1);
      
      // Mock that user has access to another thread
      jest.spyOn(service, 'getUserThreads').mockResolvedValue([originalThread, 'thread_other']);
      
      await service.switchThread(mockUserId1, 'thread_other');
      
      const session = await service.getUserSession(mockUserId1);
      expect(session?.threadId).toBe('thread_other');
    });

    it('should reject switching to unauthorized thread', async () => {
      await service.getUserThread(mockUserId1);
      
      await expect(service.switchThread(mockUserId1, 'unauthorized_thread'))
        .rejects
        .toThrow(UnauthorizedThreadAccessError);
    });
  });

  describe('incrementMessageCount', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should increment message count for existing user', async () => {
      await service.getUserThread(mockUserId1);
      
      service.incrementMessageCount(mockUserId1);
      
      const session = await service.getUserSession(mockUserId1);
      expect(session?.metadata?.messageCount).toBe(1);
    });

    it('should handle non-existent user gracefully', () => {
      // Should not throw error
      expect(() => service.incrementMessageCount('nonexistent')).not.toThrow();
    });
  });

  describe('cleanupExpiredSessions', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should clean up expired sessions', async () => {
      const cleanedStorage = {
        version: '1.0.0',
        sessions: [],
        lastCleanup: new Date()
      };

      // Setup initial storage with sessions
      mockSessionStorageManager.loadFromStorage.mockReturnValue({
        version: '1.0.0',
        sessions: [
          {
            userId: mockUserId1,
            threadId: 'thread_1',
            lastActive: new Date(),
            isActive: true
          }
        ],
        lastCleanup: new Date()
      });

      mockSessionStorageManager.cleanupExpiredSessions.mockReturnValue(cleanedStorage);

      await service.cleanupExpiredSessions();

      expect(mockSessionStorageManager.cleanupExpiredSessions).toHaveBeenCalledTimes(1);
      expect(service.getActiveSessions()).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return correct statistics', async () => {
      await service.getUserThread(mockUserId1);
      await service.getUserThread(mockUserId2);

      const stats = service.getStats();

      expect(stats.activeUsers).toBe(2);
      expect(stats.totalSessions).toBe(2);
      expect(stats.storageUsage).toBe(0.02);
    });

    it('should return zero stats for empty service', () => {
      const stats = service.getStats();

      expect(stats.activeUsers).toBe(0);
      expect(stats.totalSessions).toBe(0);
    });
  });
});