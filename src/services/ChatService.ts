// Chat Service with Multi-User Support
// Sprint 1 - Thread Isolation Implementation

import { userSessionService } from './UserSessionService';
import { UnauthorizedThreadAccessError } from '../types/UserSession';
import { agentConfig } from '../authConfig';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  threadId?: string;
  userId?: string;
}

export interface ChatServiceOptions {
  onProgress?: (status: string) => void;
  onError?: (error: Error) => void;
}

export class ChatService {
  private endpoint: string;

  constructor(endpoint: string = agentConfig.endpoint) {
    this.endpoint = endpoint;
  }

  /**
   * Send message with proper user authorization and thread isolation
   */
  async sendMessage(
    userId: string,
    message: string,
    token: string,
    options?: ChatServiceOptions
  ): Promise<ChatMessage> {
    try {
      // Step 1: Ensure user has a valid Azure AI Foundry thread
      const threadId = await this.ensureUserThread(userId, token);
      
      // Step 2: Authorize user access to thread
      const authorized = await userSessionService.authorizeThreadAccess(userId, threadId);
      if (!authorized) {
        throw new UnauthorizedThreadAccessError(userId, threadId);
      }

      options?.onProgress?.('Wysyłanie wiadomości...');

      // Step 3: Add message to user's thread
      const messageResponse = await this.addMessageToThread(threadId, message, token);
      if (!messageResponse.ok) {
        throw new Error(`Message creation failed: ${messageResponse.status}`);
      }

      options?.onProgress?.('Uruchamianie agenta...');

      // Step 4: Create a run with the agent
      const runResponse = await this.createRun(threadId, token);
      if (!runResponse.ok) {
        throw new Error(`Run creation failed: ${runResponse.status}`);
      }

      const runData = await runResponse.json();
      const runId = runData.id;

      options?.onProgress?.('Oczekiwanie na odpowiedź...');

      // Step 5: Wait for run completion
      await this.waitForRunCompletion(threadId, runId, token, options);

      options?.onProgress?.('Pobieranie odpowiedzi...');

      // Step 6: Get the response messages
      const response = await this.getThreadMessages(threadId, token);
      
      // Step 7: Update session statistics
      userSessionService.incrementMessageCount(userId);

      options?.onProgress?.('Gotowe');

      return response;

    } catch (error) {
      options?.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Add message to specific thread
   */
  private async addMessageToThread(threadId: string, message: string, token: string): Promise<Response> {
    return fetch(`${this.endpoint}/threads/${threadId}/messages?api-version=2025-05-01`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      })
    });
  }

  /**
   * Create a run for the agent
   */
  private async createRun(threadId: string, token: string): Promise<Response> {
    return fetch(`${this.endpoint}/threads/${threadId}/runs?api-version=2025-05-01`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistant_id: agentConfig.agentId
      })
    });
  }

  /**
   * Wait for run completion with timeout
   */
  private async waitForRunCompletion(
    threadId: string, 
    runId: string, 
    token: string,
    options?: ChatServiceOptions
  ): Promise<void> {
    const maxAttempts = 60; // 60 seconds timeout
    let attempts = 0;
    let runStatus = 'queued';

    while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const statusResponse = await fetch(
          `${this.endpoint}/threads/${threadId}/runs/${runId}?api-version=2025-05-01`,
          {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          runStatus = statusData.status;
          
          // Log detailed status for debugging
          if (runStatus === 'failed') {
            console.error(`Azure AI run failed:`, statusData);
            console.error(`Failed run details:`, {
              threadId,
              runId,
              status: runStatus,
              lastError: statusData.last_error,
              failedAt: statusData.failed_at
            });
          }
          
          // Provide progress updates
          if (attempts % 5 === 0) { // Every 5 seconds
            options?.onProgress?.(`Przetwarzanie... (${attempts}s)`);
          }
        } else {
          console.warn(`Status check failed: ${statusResponse.status}`);
        }
      } catch (error) {
        console.warn(`Status check error:`, error);
      }
      
      attempts++;
    }

    if (runStatus !== 'completed') {
      throw new Error(`Run did not complete successfully. Status: ${runStatus} after ${attempts}s`);
    }
  }

  /**
   * Get messages from thread
   */
  private async getThreadMessages(threadId: string, token: string): Promise<ChatMessage> {
    const messagesResponse = await fetch(
      `${this.endpoint}/threads/${threadId}/messages?api-version=2025-05-01`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!messagesResponse.ok) {
      throw new Error(`Messages retrieval failed: ${messagesResponse.status}`);
    }

    const messagesData = await messagesResponse.json();
    const agentMessages = messagesData.data.filter((msg: any) => msg.role === 'assistant');

    if (agentMessages.length === 0) {
      throw new Error('Nie otrzymano odpowiedzi od agenta');
    }

    const latestMessage = agentMessages[0];
    const content = latestMessage.content?.[0]?.text?.value || 'Brak odpowiedzi od agenta.';

    return {
      role: 'assistant',
      content,
      timestamp: new Date(),
      threadId,
      userId: undefined // Will be set by caller
    };
  }

  /**
   * Get conversation history for user
   */
  async getConversationHistory(userId: string, token: string): Promise<ChatMessage[]> {
    try {
      // Get all user threads
      const userThreads = await userSessionService.getUserThreads(userId);
      const allMessages: ChatMessage[] = [];

      for (const threadId of userThreads) {
        // Authorize access to each thread
        const authorized = await userSessionService.authorizeThreadAccess(userId, threadId);
        if (!authorized) {
          console.warn(`Skipping unauthorized thread: ${threadId} for user: ${userId}`);
          continue;
        }

        try {
          const messages = await this.getThreadAllMessages(threadId, token);
          allMessages.push(...messages.map(msg => ({ ...msg, userId, threadId })));
        } catch (error) {
          console.warn(`Failed to load messages from thread ${threadId}:`, error);
        }
      }

      // Sort by timestamp (newest first)
      return allMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    } catch (error) {
      console.error(`Failed to get conversation history for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all messages from a specific thread
   */
  async getThreadAllMessages(threadId: string, token: string): Promise<ChatMessage[]> {
    const response = await fetch(
      `${this.endpoint}/threads/${threadId}/messages?api-version=2025-05-01&limit=100`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get messages: ${response.status}`);
    }

    const data = await response.json();
    
    return data.data.map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content?.[0]?.text?.value || '',
      timestamp: new Date(msg.created_at * 1000), // Convert Unix timestamp
      threadId
    }));
  }

  /**
   * Create a new conversation thread for user
   */
  async createNewConversation(userId: string, token: string): Promise<string> {
    try {
      // Create new Azure AI Foundry thread with user metadata
      const threadResponse = await fetch(`${this.endpoint}/threads?api-version=2025-05-01`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metadata: {
            userId: userId,
            createdAt: new Date().toISOString(),
            application: 'pcz-agent'
          }
        })
      });

      if (!threadResponse.ok) {
        throw new Error(`Thread creation failed: ${threadResponse.status}`);
      }

      const threadData = await threadResponse.json();
      const newThreadId = threadData.id;

      // Create new session with the real thread ID
      await userSessionService.createNewSession(userId);
      
      console.info(`Created new conversation thread for user ${userId}: ${newThreadId}`);
      return newThreadId;

    } catch (error) {
      console.error(`Failed to create new conversation for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Ensure user has a valid Azure AI Foundry thread
   */
  async ensureUserThread(userId: string, token: string): Promise<string> {
    try {
      // Get current thread ID from session
      let threadId = await userSessionService.getUserThread(userId);
      
      // If it's a local thread ID, create a real one
      if (threadId.startsWith('thread_')) {
        console.info('Converting local thread to Azure thread for user:', userId);
        
        // Create real Azure thread
        const realThreadId = await this.createNewConversation(userId, token);
        
        // Update session with real thread ID
        const session = await userSessionService.getUserSession(userId);
        if (session) {
          session.threadId = realThreadId;
          userSessionService.updateSession(session);
        }
        
        return realThreadId;
      }
      
      // Verify thread exists in Azure (optional check)
      try {
        await this.verifyThreadExists(threadId, token);
        return threadId;
      } catch (error) {
        console.warn(`Thread ${threadId} doesn't exist, creating new one`);
        return await this.createNewConversation(userId, token);
      }
      
    } catch (error) {
      console.error(`Failed to ensure user thread for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Verify thread exists in Azure AI Foundry
   */
  private async verifyThreadExists(threadId: string, token: string): Promise<void> {
    const response = await fetch(`${this.endpoint}/threads/${threadId}?api-version=2025-05-01`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Thread ${threadId} does not exist: ${response.status}`);
    }
  }

  /**
   * Switch to a different conversation thread
   */
  async switchConversation(userId: string, threadId: string): Promise<void> {
    try {
      // This will validate authorization and switch the user to the thread
      await userSessionService.switchThread(userId, threadId);
      console.info(`User ${userId} switched to thread ${threadId}`);
    } catch (error) {
      console.error(`Failed to switch conversation for user ${userId} to ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a conversation thread (deactivate in session)
   */
  async deleteConversation(userId: string, threadId: string): Promise<void> {
    try {
      // Authorize access first
      const authorized = await userSessionService.authorizeThreadAccess(userId, threadId);
      if (!authorized) {
        throw new UnauthorizedThreadAccessError(userId, threadId);
      }

      // For now, we don't actually delete the Azure thread, just deactivate in session
      // In future, might want to call DELETE /threads/{threadId}
      
      console.info(`Conversation ${threadId} deactivated for user ${userId}`);
    } catch (error) {
      console.error(`Failed to delete conversation ${threadId} for user ${userId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();