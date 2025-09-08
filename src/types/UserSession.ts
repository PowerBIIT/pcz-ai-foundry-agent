// User Session Type Definitions
// Sprint 1 - Multi-User Support

export interface UserSession {
  userId: string;           // MSAL homeAccountId
  threadId: string;         // Azure AI Foundry thread ID  
  lastActive: Date;         // Last interaction timestamp
  isActive: boolean;        // Session status
  metadata?: {
    displayName?: string;   // User display name
    email?: string;         // User email
    sessionStart: Date;     // Session creation time
    messageCount: number;   // Number of messages in session
  };
}

export interface ThreadMappingStorage {
  version: string;          // Storage schema version
  sessions: UserSession[];  // Array of user sessions
  lastCleanup: Date;        // Last cleanup timestamp
}

export interface UserContextValue {
  currentUserId: string | null;
  currentSession: UserSession | null;
  isAuthenticated: boolean;
  updateSession: (session: UserSession) => void;
  clearSession: () => void;
}

// Error types for user session management
export class UnauthorizedThreadAccessError extends Error {
  constructor(userId: string, threadId: string) {
    super(`User ${userId} not authorized to access thread ${threadId}`);
    this.name = 'UnauthorizedThreadAccessError';
  }
}

export class SessionExpiredError extends Error {
  constructor(userId: string) {
    super(`Session expired for user ${userId}`);
    this.name = 'SessionExpiredError';
  }
}

export class SessionCreationError extends Error {
  constructor(userId: string, reason: string) {
    super(`Failed to create session for user ${userId}: ${reason}`);
    this.name = 'SessionCreationError';
  }
}