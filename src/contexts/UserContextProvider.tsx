// User Context Provider for Multi-User Support
// Sprint 1 - MSAL Integration Enhancement

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useMsal } from '@azure/msal-react';
import { UserSession, UserContextValue } from '../types/UserSession';
import { userSessionService } from '../services/UserSessionService';

// Create the context
const UserContext = createContext<UserContextValue | undefined>(undefined);

// Props for the provider
interface UserContextProviderProps {
  children: ReactNode;
}

/**
 * UserContextProvider - Manages user session state across the application
 * Integrates MSAL authentication with custom session management
 */
export const UserContextProvider: React.FC<UserContextProviderProps> = ({ children }) => {
  const { accounts, inProgress } = useMsal();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<UserSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Initialize UserSessionService
  useEffect(() => {
    const initializeService = async () => {
      try {
        await userSessionService.initialize();
        console.info('UserContextProvider: SessionService initialized');
      } catch (error) {
        console.error('UserContextProvider: Failed to initialize SessionService:', error);
      }
    };

    initializeService();
  }, []);

  // Handle user authentication state changes
  useEffect(() => {
    const handleAuthenticationChange = async () => {
      try {
        setIsInitializing(true);

        if (accounts && accounts.length > 0) {
          const account = accounts[0];
          const userId = account.homeAccountId;
          
          if (userId !== currentUserId) {
            console.info(`UserContextProvider: User changed: ${currentUserId} → ${userId}`);
            
            // Set authentication state
            setCurrentUserId(userId);
            setIsAuthenticated(true);

            // Get or create user session
            const userInfo = {
              displayName: account.name || account.username,
              email: account.username
            };

            try {
              // Try to get existing session first
              let session = await userSessionService.getUserSession(userId);
              
              if (!session || !session.isActive) {
                // Create new session if none exists or session is inactive
                session = await userSessionService.createNewSession(userId, userInfo);
                console.info(`UserContextProvider: Created new session for ${userId}`);
              } else {
                // Update existing session with latest user info
                if (session.metadata) {
                  session.metadata.displayName = userInfo.displayName;
                  session.metadata.email = userInfo.email;
                  userSessionService.updateSession(session);
                }
                console.info(`UserContextProvider: Restored existing session for ${userId}`);
              }

              setCurrentSession(session);

            } catch (error) {
              console.error(`UserContextProvider: Failed to manage session for ${userId}:`, error);
              // Continue with basic authentication even if session fails
              setCurrentSession(null);
            }
          }
        } else {
          // No authenticated user
          if (currentUserId) {
            console.info('UserContextProvider: User logged out');
            
            // Deactivate current session
            if (currentUserId) {
              try {
                await userSessionService.deactivateSession(currentUserId);
              } catch (error) {
                console.warn('UserContextProvider: Failed to deactivate session:', error);
              }
            }
          }
          
          setCurrentUserId(null);
          setCurrentSession(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('UserContextProvider: Error handling authentication change:', error);
        // Reset to safe state
        setCurrentUserId(null);
        setCurrentSession(null);
        setIsAuthenticated(false);
      } finally {
        setIsInitializing(false);
      }
    };

    // Process authentication changes
    handleAuthenticationChange();
  }, [accounts, inProgress, currentUserId]);

  // Cleanup expired sessions periodically
  useEffect(() => {
    const cleanupInterval = setInterval(async () => {
      try {
        await userSessionService.cleanupExpiredSessions();
      } catch (error) {
        console.warn('UserContextProvider: Periodic cleanup failed:', error);
      }
    }, 30 * 60 * 1000); // Every 30 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  // Update session function
  const updateSession = (session: UserSession) => {
    setCurrentSession(session);
    userSessionService.updateSession(session);
    console.info(`UserContextProvider: Session updated for ${session.userId}`);
  };

  // Clear session function
  const clearSession = async () => {
    if (currentUserId) {
      try {
        await userSessionService.deactivateSession(currentUserId);
        setCurrentSession(null);
        console.info(`UserContextProvider: Session cleared for ${currentUserId}`);
      } catch (error) {
        console.error('UserContextProvider: Failed to clear session:', error);
      }
    }
  };

  // Context value
  const contextValue: UserContextValue = {
    currentUserId,
    currentSession,
    isAuthenticated: isAuthenticated && !isInitializing,
    updateSession,
    clearSession
  };

  // Debug logging in development
  if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG_MODE === 'true') {
    console.debug('UserContextProvider state:', {
      currentUserId,
      isAuthenticated: contextValue.isAuthenticated,
      isInitializing,
      sessionActive: currentSession?.isActive,
      sessionThreadId: currentSession?.threadId,
      accountsCount: accounts?.length || 0,
      msalInProgress: inProgress
    });
  }

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

/**
 * Hook to use the user context
 * Must be used within UserContextProvider
 */
export const useUserContext = (): UserContextValue => {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserContextProvider');
  }
  
  return context;
};

/**
 * Hook to get current user session
 * Returns null if user is not authenticated or session is not available
 */
export const useUserSession = (): UserSession | null => {
  const { currentSession, isAuthenticated } = useUserContext();
  return isAuthenticated ? currentSession : null;
};

/**
 * Hook to get current thread ID
 * Returns null if user is not authenticated or no session
 */
export const useCurrentThreadId = (): string | null => {
  const session = useUserSession();
  return session?.threadId || null;
};

/**
 * Hook to check if user is fully authenticated and has active session
 */
export const useIsReady = (): boolean => {
  const { isAuthenticated, currentSession } = useUserContext();
  return isAuthenticated && !!currentSession && currentSession.isActive;
};