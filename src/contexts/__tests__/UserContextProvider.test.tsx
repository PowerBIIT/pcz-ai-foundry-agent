// UserContextProvider Unit Tests
// Sprint 1 - MSAL Integration Enhancement

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { UserContextProvider, useUserContext, useUserSession, useCurrentThreadId, useIsReady } from '../UserContextProvider';
import { userSessionService } from '../../services/UserSessionService';
import { UserSession } from '../../types/UserSession';

// Mock MSAL React
const mockUseMsal = jest.fn();
jest.mock('@azure/msal-react', () => ({
  useMsal: () => mockUseMsal()
}));

// Mock UserSessionService
jest.mock('../../services/UserSessionService');
const mockUserSessionService = userSessionService as jest.Mocked<typeof userSessionService>;

// Test component to use the hooks
const TestComponent: React.FC<{ 
  testUserId?: boolean;
  testSession?: boolean;
  testThreadId?: boolean;
  testIsReady?: boolean;
}> = ({ testUserId, testSession, testThreadId, testIsReady }) => {
  const userContext = useUserContext();
  const session = useUserSession();
  const threadId = useCurrentThreadId();
  const isReady = useIsReady();

  return (
    <div>
      {testUserId && <div data-testid="current-user-id">{userContext.currentUserId || 'null'}</div>}
      {testSession && <div data-testid="current-session">{session?.threadId || 'null'}</div>}
      {testThreadId && <div data-testid="thread-id">{threadId || 'null'}</div>}
      {testIsReady && <div data-testid="is-ready">{isReady ? 'ready' : 'not-ready'}</div>}
      <div data-testid="is-authenticated">{userContext.isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
    </div>
  );
};

describe('UserContextProvider', () => {
  const mockAccount = {
    homeAccountId: 'user123.homeAccountId',
    username: 'test@powerbiit.com',
    name: 'Test User',
    environment: 'test',
    tenantId: 'test-tenant',
    localAccountId: 'test-local'
  };

  const mockSession: UserSession = {
    userId: 'user123.homeAccountId',
    threadId: 'thread_test_123',
    lastActive: new Date(),
    isActive: true,
    metadata: {
      displayName: 'Test User',
      email: 'test@powerbiit.com',
      sessionStart: new Date(),
      messageCount: 0
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default MSAL mock
    mockUseMsal.mockReturnValue({
      accounts: [],
      inProgress: 'None'
    });

    // Default UserSessionService mocks
    mockUserSessionService.initialize.mockResolvedValue();
    mockUserSessionService.getUserSession.mockResolvedValue(null);
    mockUserSessionService.createNewSession.mockResolvedValue(mockSession);
    mockUserSessionService.updateSession.mockImplementation();
    mockUserSessionService.deactivateSession.mockResolvedValue();
    mockUserSessionService.cleanupExpiredSessions.mockResolvedValue();
  });

  describe('initialization', () => {
    it('should initialize UserSessionService on mount', async () => {
      render(
        <UserContextProvider>
          <TestComponent />
        </UserContextProvider>
      );

      await waitFor(() => {
        expect(mockUserSessionService.initialize).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle initialization failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockUserSessionService.initialize.mockRejectedValue(new Error('Init failed'));

      render(
        <UserContextProvider>
          <TestComponent />
        </UserContextProvider>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'UserContextProvider: Failed to initialize SessionService:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('authentication state management', () => {
    it('should set authenticated state when user is logged in', async () => {
      mockUseMsal.mockReturnValue({
        accounts: [mockAccount],
        inProgress: 'None'
      });

      render(
        <UserContextProvider>
          <TestComponent testUserId />
        </UserContextProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-user-id')).toHaveTextContent('user123.homeAccountId');
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('authenticated');
      });
    });

    it('should set unauthenticated state when no accounts', async () => {
      mockUseMsal.mockReturnValue({
        accounts: [],
        inProgress: 'None'
      });

      render(
        <UserContextProvider>
          <TestComponent testUserId />
        </UserContextProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-user-id')).toHaveTextContent('null');
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('not-authenticated');
      });
    });

    it('should wait for MSAL to complete processing', async () => {
      mockUseMsal.mockReturnValue({
        accounts: [mockAccount],
        inProgress: 'Login'
      });

      render(
        <UserContextProvider>
          <TestComponent />
        </UserContextProvider>
      );

      // Should not process authentication while MSAL is in progress
      expect(mockUserSessionService.getUserSession).not.toHaveBeenCalled();

      // Update to complete processing
      mockUseMsal.mockReturnValue({
        accounts: [mockAccount],
        inProgress: 'None'
      });

      // Re-render to trigger effect
      render(
        <UserContextProvider>
          <TestComponent />
        </UserContextProvider>
      );

      await waitFor(() => {
        expect(mockUserSessionService.getUserSession).toHaveBeenCalled();
      });
    });
  });

  describe('session management', () => {
    beforeEach(() => {
      mockUseMsal.mockReturnValue({
        accounts: [mockAccount],
        inProgress: 'None'
      });
    });

    it('should create new session for new user', async () => {
      mockUserSessionService.getUserSession.mockResolvedValue(null);
      
      render(
        <UserContextProvider>
          <TestComponent testSession />
        </UserContextProvider>
      );

      await waitFor(() => {
        expect(mockUserSessionService.createNewSession).toHaveBeenCalledWith(
          'user123.homeAccountId',
          {
            displayName: 'Test User',
            email: 'test@powerbiit.com'
          }
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-session')).toHaveTextContent('thread_test_123');
      });
    });

    it('should restore existing active session', async () => {
      mockUserSessionService.getUserSession.mockResolvedValue(mockSession);
      
      render(
        <UserContextProvider>
          <TestComponent testSession />
        </UserContextProvider>
      );

      await waitFor(() => {
        expect(mockUserSessionService.createNewSession).not.toHaveBeenCalled();
        expect(mockUserSessionService.updateSession).toHaveBeenCalledWith(mockSession);
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-session')).toHaveTextContent('thread_test_123');
      });
    });

    it('should create new session if existing session is inactive', async () => {
      const inactiveSession = { ...mockSession, isActive: false };
      mockUserSessionService.getUserSession.mockResolvedValue(inactiveSession);
      
      render(
        <UserContextProvider>
          <TestComponent testSession />
        </UserContextProvider>
      );

      await waitFor(() => {
        expect(mockUserSessionService.createNewSession).toHaveBeenCalled();
      });
    });

    it('should handle session creation failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockUserSessionService.getUserSession.mockResolvedValue(null);
      mockUserSessionService.createNewSession.mockRejectedValue(new Error('Session creation failed'));
      
      render(
        <UserContextProvider>
          <TestComponent testSession />
        </UserContextProvider>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to manage session'),
          expect.any(Error)
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-session')).toHaveTextContent('null');
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('authenticated');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('logout handling', () => {
    it('should deactivate session on logout', async () => {
      // Start with authenticated user
      mockUseMsal.mockReturnValue({
        accounts: [mockAccount],
        inProgress: 'None'
      });

      const { rerender } = render(
        <UserContextProvider>
          <TestComponent testUserId />
        </UserContextProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('authenticated');
      });

      // Simulate logout
      mockUseMsal.mockReturnValue({
        accounts: [],
        inProgress: 'None'
      });

      rerender(
        <UserContextProvider>
          <TestComponent testUserId />
        </UserContextProvider>
      );

      await waitFor(() => {
        expect(mockUserSessionService.deactivateSession).toHaveBeenCalledWith('user123.homeAccountId');
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('not-authenticated');
        expect(screen.getByTestId('current-user-id')).toHaveTextContent('null');
      });
    });
  });

  describe('hooks', () => {
    beforeEach(() => {
      mockUseMsal.mockReturnValue({
        accounts: [mockAccount],
        inProgress: 'None'
      });
      mockUserSessionService.getUserSession.mockResolvedValue(mockSession);
    });

    it('useUserSession should return session for authenticated user', async () => {
      render(
        <UserContextProvider>
          <TestComponent testSession />
        </UserContextProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-session')).toHaveTextContent('thread_test_123');
      });
    });

    it('useCurrentThreadId should return thread ID', async () => {
      render(
        <UserContextProvider>
          <TestComponent testThreadId />
        </UserContextProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('thread-id')).toHaveTextContent('thread_test_123');
      });
    });

    it('useIsReady should return true when user is authenticated with active session', async () => {
      render(
        <UserContextProvider>
          <TestComponent testIsReady />
        </UserContextProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-ready')).toHaveTextContent('ready');
      });
    });

    it('useIsReady should return false when session is inactive', async () => {
      const inactiveSession = { ...mockSession, isActive: false };
      mockUserSessionService.getUserSession.mockResolvedValue(inactiveSession);
      mockUserSessionService.createNewSession.mockRejectedValue(new Error('Failed'));
      
      render(
        <UserContextProvider>
          <TestComponent testIsReady />
        </UserContextProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-ready')).toHaveTextContent('not-ready');
      });
    });

    it('should throw error when hooks are used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useUserContext must be used within a UserContextProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('periodic cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should perform periodic session cleanup', async () => {
      render(
        <UserContextProvider>
          <TestComponent />
        </UserContextProvider>
      );

      // Fast forward 30 minutes
      act(() => {
        jest.advanceTimersByTime(30 * 60 * 1000);
      });

      await waitFor(() => {
        expect(mockUserSessionService.cleanupExpiredSessions).toHaveBeenCalled();
      });
    });

    it('should handle cleanup failures gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockUserSessionService.cleanupExpiredSessions.mockRejectedValue(new Error('Cleanup failed'));

      render(
        <UserContextProvider>
          <TestComponent />
        </UserContextProvider>
      );

      act(() => {
        jest.advanceTimersByTime(30 * 60 * 1000);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'UserContextProvider: Periodic cleanup failed:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });
});