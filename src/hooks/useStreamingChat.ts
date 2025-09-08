// React Hook for Streaming Chat
// Sprint 2 - Advanced UX

import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { streamingChatService, StreamingChatService, StreamingOptions, StreamingResponse } from '../services/StreamingChatService';
import { userSessionService } from '../services/UserSessionService';
import { ChatMessage } from '../services/ChatService';

export interface StreamingChatState {
  isStreaming: boolean;
  streamingMessage: string;
  currentAgent: string | null;
  progress: string;
}

export interface UseStreamingChatOptions {
  onMessageComplete?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
  enableFallback?: boolean; // Fallback to regular chat if streaming fails
}

export const useStreamingChat = (options?: UseStreamingChatOptions) => {
  const [streamingState, setStreamingState] = useState<StreamingChatState>({
    isStreaming: false,
    streamingMessage: '',
    currentAgent: null,
    progress: ''
  });

  const streamingRef = useRef<boolean>(false);

  /**
   * Send message with streaming response
   */
  const sendStreamingMessage = useCallback(async (
    userId: string,
    message: string,
    token: string
  ): Promise<StreamingResponse> => {
    if (streamingRef.current) {
      console.warn('Streaming already in progress');
      return { success: false, fullResponse: '', error: 'Already streaming' };
    }

    // Check if streaming is supported
    if (!StreamingChatService.isStreamingSupported()) {
      const error = new Error('Streaming not supported in this environment');
      options?.onError?.(error);
      toast.warn('Streaming nie jest dostępny, używam standardowego trybu');
      
      if (options?.enableFallback) {
        // Could fallback to regular ChatService here
        return { success: false, fullResponse: '', error: error.message };
      } else {
        throw error;
      }
    }

    streamingRef.current = true;

    // Reset streaming state
    setStreamingState({
      isStreaming: true,
      streamingMessage: '',
      currentAgent: null,
      progress: 'Rozpoczynanie...'
    });

    try {
      const streamingOptions: StreamingOptions = {
        onToken: (token: string) => {
          setStreamingState(prev => ({
            ...prev,
            streamingMessage: prev.streamingMessage + token
          }));
        },

        onProgress: (status: string) => {
          setStreamingState(prev => ({
            ...prev,
            progress: status
          }));
        },

        onAgentIdentified: (agentName: string) => {
          setStreamingState(prev => ({
            ...prev,
            currentAgent: agentName
          }));
          toast.info(`🔍 ${agentName} odpowiada...`);
        },

        onComplete: (fullResponse: string) => {
          const completedMessage: ChatMessage = {
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date(),
            userId: userId
          };

          options?.onMessageComplete?.(completedMessage);
          
          // Update session message count
          userSessionService.incrementMessageCount(userId);
          
          toast.success('Odpowiedź ukończona');
        },

        onError: (error: Error) => {
          console.error('Streaming error:', error);
          options?.onError?.(error);
          toast.error(`Błąd streaming: ${error.message}`);
        }
      };

      // Start streaming
      const result = await streamingChatService.sendMessageWithStreaming(
        userId,
        message,
        token,
        streamingOptions
      );

      return result;

    } catch (error) {
      console.error('Streaming chat error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      options?.onError?.(error as Error);
      toast.error(`Błąd: ${errorMessage}`);

      return {
        success: false,
        fullResponse: '',
        error: errorMessage
      };

    } finally {
      // Clean up streaming state
      streamingRef.current = false;
      setStreamingState(prev => ({
        ...prev,
        isStreaming: false
      }));
    }
  }, [options]);

  /**
   * Stop current streaming
   */
  const stopStreaming = useCallback(() => {
    if (streamingRef.current) {
      streamingChatService.stopStreaming();
      streamingRef.current = false;
      
      setStreamingState(prev => ({
        ...prev,
        isStreaming: false,
        progress: 'Anulowano'
      }));
      
      toast.info('Streaming anulowany');
    }
  }, []);

  /**
   * Clear streaming state
   */
  const clearStreamingState = useCallback(() => {
    setStreamingState({
      isStreaming: false,
      streamingMessage: '',
      currentAgent: null,
      progress: ''
    });
  }, []);

  return {
    // State
    ...streamingState,
    
    // Actions
    sendStreamingMessage,
    stopStreaming,
    clearStreamingState,
    
    // Status
    canStream: StreamingChatService.isStreamingSupported()
  };
};