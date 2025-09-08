// Streaming Chat Service with Server-Sent Events
// Sprint 2 - Advanced UX

import { fetchEventSource } from '@microsoft/fetch-event-source';
import { userSessionService } from './UserSessionService';
import { UnauthorizedThreadAccessError } from '../types/UserSession';
import { agentConfig } from '../authConfig';

export interface StreamingOptions {
  onToken?: (token: string) => void;           // Each token/word received
  onProgress?: (status: string) => void;       // Progress updates
  onComplete?: (fullResponse: string) => void; // Final response
  onError?: (error: Error) => void;            // Error handling
  onAgentIdentified?: (agentName: string) => void; // When sub-agent identified
}

export interface StreamingResponse {
  success: boolean;
  fullResponse: string;
  agentName?: string;
  error?: string;
  tokensUsed?: number;
}

export class StreamingChatService {
  private endpoint: string;
  private abortController: AbortController | null = null;

  constructor(endpoint: string = agentConfig.endpoint) {
    this.endpoint = endpoint;
  }

  /**
   * Send message with streaming response
   */
  async sendMessageWithStreaming(
    userId: string,
    message: string,
    token: string,
    options?: StreamingOptions
  ): Promise<StreamingResponse> {
    try {
      // Ensure user has valid thread
      const threadId = await this.ensureUserThread(userId, token);
      
      // Authorize access
      const authorized = await userSessionService.authorizeThreadAccess(userId, threadId);
      if (!authorized) {
        throw new UnauthorizedThreadAccessError(userId, threadId);
      }

      options?.onProgress?.('Przygotowywanie streaming...');

      // Add message to thread first
      await this.addMessageToThread(threadId, message, token);
      
      options?.onProgress?.('Uruchamianie streaming...');

      // Start streaming run
      return await this.startStreamingRun(threadId, token, options);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown streaming error';
      options?.onError?.(error as Error);
      
      return {
        success: false,
        fullResponse: '',
        error: errorMsg
      };
    }
  }

  /**
   * Start streaming run with SSE
   */
  private async startStreamingRun(
    threadId: string,
    token: string,
    options?: StreamingOptions
  ): Promise<StreamingResponse> {
    return new Promise((resolve, reject) => {
      this.abortController = new AbortController();
      let fullResponse = '';
      let currentAgent = '';
      let tokensUsed = 0;

      options?.onProgress?.('Łączenie ze streaming...');

      fetchEventSource(`${this.endpoint}/threads/${threadId}/runs?api-version=2025-04-01-preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          assistant_id: agentConfig.agentId,
          stream: true
        }),
        signal: this.abortController.signal,

        onopen: async (response) => {
          if (response.ok) {
            options?.onProgress?.('Streaming aktywny...');
            console.info('🌊 Streaming connection opened');
          } else {
            const error = new Error(`Streaming failed: ${response.status} ${response.statusText}`);
            options?.onError?.(error);
            reject(error);
          }
        },

        onmessage: (event) => {
          if (event.data === '[DONE]') {
            console.info('🏁 Streaming completed');
            options?.onProgress?.('Streaming zakończony');
            options?.onComplete?.(fullResponse);
            
            resolve({
              success: true,
              fullResponse,
              agentName: currentAgent,
              tokensUsed
            });
            return;
          }

          try {
            const data = JSON.parse(event.data);
            this.handleStreamEvent(data, {
              onToken: (token: string) => {
                fullResponse += token;
                options?.onToken?.(token);
              },
              onAgentDetected: (agentName: string) => {
                if (agentName !== currentAgent) {
                  currentAgent = agentName;
                  options?.onAgentIdentified?.(agentName);
                  console.info(`🔍 Agent identified: ${agentName}`);
                }
              },
              onProgress: options?.onProgress,
              onTokensUpdate: (tokens: number) => {
                tokensUsed = tokens;
              }
            });

          } catch (parseError) {
            console.warn('Stream parse error:', parseError);
            // Continue processing other events
          }
        },

        onerror: (error) => {
          console.error('🚨 Streaming error:', error);
          options?.onError?.(error as Error);
          
          // Don't reject immediately - allow retries
          if (this.abortController?.signal.aborted) {
            resolve({
              success: false,
              fullResponse,
              error: 'Stream aborted'
            });
          }
          // fetchEventSource handles retries automatically
        },

        onclose: () => {
          console.info('🔌 Streaming connection closed');
          if (fullResponse) {
            resolve({
              success: true,
              fullResponse,
              agentName: currentAgent,
              tokensUsed
            });
          } else {
            resolve({
              success: false,
              fullResponse: '',
              error: 'Stream closed without response'
            });
          }
        }
      });
    });
  }

  /**
   * Handle individual stream events
   */
  private handleStreamEvent(data: any, callbacks: {
    onToken: (token: string) => void;
    onAgentDetected: (agentName: string) => void;
    onProgress?: (status: string) => void;
    onTokensUpdate?: (tokens: number) => void;
  }): void {
    const eventType = data.event;

    switch (eventType) {
      case 'thread.run.step.delta':
        this.handleStepDelta(data.data, callbacks);
        break;

      case 'thread.run.step.completed':
        callbacks.onProgress?.('Step completed...');
        break;

      case 'thread.run.completed':
        callbacks.onProgress?.('Finalizowanie...');
        if (data.data?.usage) {
          callbacks.onTokensUpdate?.(data.data.usage.total_tokens);
        }
        break;

      case 'thread.run.failed':
        throw new Error(`Run failed: ${data.data?.last_error?.message || 'Unknown error'}`);

      case 'thread.run.requires_action':
        // Handle tool calls (Connected Agents)
        this.handleRequiredAction(data.data, callbacks);
        break;

      default:
        console.debug(`Unknown event type: ${eventType}`);
    }
  }

  /**
   * Handle step delta events (actual content)
   */
  private handleStepDelta(stepData: any, callbacks: {
    onToken: (token: string) => void;
    onAgentDetected: (agentName: string) => void;
  }): void {
    const delta = stepData.delta;

    // Handle content deltas
    if (delta?.content) {
      delta.content.forEach((contentPart: any) => {
        if (contentPart.type === 'text' && contentPart.text?.value) {
          const token = contentPart.text.value;
          callbacks.onToken(token);

          // Detect agent identification in response
          this.detectAgentFromText(token, callbacks.onAgentDetected);
        }
      });
    }

    // Handle tool call deltas (Connected Agents)
    if (delta?.step_details?.tool_calls) {
      delta.step_details.tool_calls.forEach((toolCall: any) => {
        if (toolCall.type === 'function' && toolCall.function?.name) {
          const agentName = this.extractAgentName(toolCall.function.name);
          if (agentName) {
            callbacks.onAgentDetected(agentName);
          }
        }
      });
    }
  }

  /**
   * Handle required actions (Connected Agents routing)
   */
  private handleRequiredAction(actionData: any, callbacks: {
    onAgentDetected: (agentName: string) => void;
    onProgress?: (status: string) => void;
  }): void {
    const requiredAction = actionData.required_action;
    
    if (requiredAction?.type === 'submit_tool_outputs') {
      const toolCalls = requiredAction.submit_tool_outputs?.tool_calls || [];
      
      toolCalls.forEach((toolCall: any) => {
        if (toolCall.type === 'function' && toolCall.function?.name) {
          const agentName = this.extractAgentName(toolCall.function.name);
          if (agentName) {
            callbacks.onAgentDetected(agentName);
            callbacks.onProgress?.(`Routing to ${agentName}...`);
          }
        }
      });
    }
  }

  /**
   * Detect agent identification from text content
   */
  private detectAgentFromText(text: string, onAgentDetected: (agentName: string) => void): void {
    // Look for agent identification patterns
    const agentPatterns = [
      /🔍\s*(.+?)\s+odpowiada:/i,
      /🔍\s*(.+?)\s*:/i,
      /Ekspert[^:]*:/i,
      /Audytor[^:]*:/i,
      /Prawnik[^:]*:/i
    ];

    for (const pattern of agentPatterns) {
      const match = text.match(pattern);
      if (match) {
        const agentName = match[1] || match[0];
        onAgentDetected(agentName.trim());
        break;
      }
    }
  }

  /**
   * Extract agent name from tool call
   */
  private extractAgentName(toolName: string): string {
    // Convert tool names to readable agent names
    const agentMapping = {
      'Audytor_Tool': 'Audytor Wewnętrzny',
      'Ekspert_Zamowien_Tool': 'Ekspert Zamówień Publicznych',
      'Ekspert_Budzetu_Tool': 'Ekspert Budżetu',
      'Ekspert_Rachunkowosci_Tool': 'Ekspert Rachunkowości',
      'Ekspert_Plynnosci_Tool': 'Ekspert Płynności Finansowej',
      'Ekspert_Majatku_Tool': 'Ekspert Majątku',
      'Ekspert_Zarzadzen_Tool': 'Ekspert Zarządzeń',
      'Prawnik_Compliance_Tool': 'Prawnik Compliance',
      'Strateg_Tool': 'Strateg Finansowy',
      'Mentor_Tool': 'Mentor CFO'
    } as Record<string, string>;

    return agentMapping[toolName] || toolName;
  }

  /**
   * Ensure user thread (reuse from ChatService)
   */
  private async ensureUserThread(userId: string, token: string): Promise<string> {
    let threadId = await userSessionService.getUserThread(userId);
    
    // If mock thread, create real one
    if (threadId.startsWith('thread_')) {
      threadId = await this.createRealThread(token);
      
      const session = await userSessionService.getUserSession(userId);
      if (session) {
        session.threadId = threadId;
        userSessionService.updateSession(session);
      }
    }
    
    return threadId;
  }

  /**
   * Create real Azure thread
   */
  private async createRealThread(token: string): Promise<string> {
    const response = await fetch(`${this.endpoint}/threads?api-version=2025-05-01`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error(`Thread creation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Add message to thread
   */
  private async addMessageToThread(threadId: string, message: string, token: string): Promise<void> {
    const response = await fetch(`${this.endpoint}/threads/${threadId}/messages?api-version=2025-05-01`, {
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

    if (!response.ok) {
      throw new Error(`Message creation failed: ${response.status}`);
    }
  }

  /**
   * Stop current streaming
   */
  stopStreaming(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      console.info('🛑 Streaming stopped by user');
    }
  }

  /**
   * Check if streaming is supported in current environment
   */
  static isStreamingSupported(): boolean {
    // Check for required APIs
    return (
      typeof fetch !== 'undefined' &&
      typeof ReadableStream !== 'undefined' &&
      typeof TextDecoder !== 'undefined'
    );
  }
}

// Export singleton instance
export const streamingChatService = new StreamingChatService();