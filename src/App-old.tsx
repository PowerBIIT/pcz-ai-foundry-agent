import React, { useState } from 'react';
import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { ToastContainer } from 'react-toastify';
import { msalConfig, loginRequest } from './authConfig';
import { UserContextProvider, useUserContext, useCurrentThreadId } from './contexts/UserContextProvider';
import { chatService, ChatMessage } from './services/ChatService';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

const msalInstance = new PublicClientApplication(msalConfig);

// ChatMessage interface moved to ChatService.ts

const ChatInterface: React.FC = () => {
  const { instance, accounts } = useMsal();
  const { currentUserId, isAuthenticated } = useUserContext();
  const currentThreadId = useCurrentThreadId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    instance.loginPopup(loginRequest).catch(e => {
      console.log(e);
    });
  };

  const handleLogout = () => {
    instance.logoutPopup().catch(e => {
      console.log(e);
    });
  };

  const callAgent = async (message: string) => {
    if (!currentUserId || !isAuthenticated) {
      console.error('User not authenticated or no active session');
      return;
    }

    setIsLoading(true);
    
    try {
      // Get access token for Azure AI Foundry
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ["https://ai.azure.com/.default"],
        account: accounts[0]
      });
      
      // Add user message to UI immediately
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date(),
        userId: currentUserId
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Use ChatService with proper authorization and thread isolation
      const assistantResponse = await chatService.sendMessage(
        currentUserId,
        message,
        tokenResponse.accessToken,
        {
          onProgress: (status) => {
            // Could show progress in UI later
            console.info(`Chat progress: ${status}`);
          },
          onError: (error) => {
            console.error('Chat service error:', error);
          }
        }
      );
      
      // Add assistant response to UI
      const assistantMessage: ChatMessage = {
        ...assistantResponse,
        userId: currentUserId
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('Error calling agent:', error);
      
      let errorMessage = 'Nieznany błąd';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle specific error types
        if (error.name === 'UnauthorizedThreadAccessError') {
          errorMessage = 'Brak uprawnień do tej rozmowy. Spróbuj rozpocząć nową rozmowę.';
        } else if (error.name === 'SessionExpiredError') {
          errorMessage = 'Sesja wygasła. Proszę zalogować się ponownie.';
        }
      }
      
      const errorChatMessage: ChatMessage = {
        role: 'assistant',
        content: `Błąd: ${errorMessage}`,
        timestamp: new Date(),
        userId: currentUserId
      };
      
      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
      setInputMessage('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoading) {
      callAgent(inputMessage.trim());
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>PCZ Agent - Asystent Dyrektora Finansowego</h1>
        
        <AuthenticatedTemplate>
          <div className="user-info">
            Zalogowany jako: {accounts[0]?.username}
            {currentThreadId && <span className="thread-info"> (Thread: {currentThreadId.substring(0, 8)}...)</span>}
            <button onClick={handleLogout} className="logout-btn">Wyloguj</button>
          </div>
          
          <div className="chat-container">
            <div className="messages">
              {messages.length === 0 && (
                <div className="welcome-message">
                  Witaj! Jestem asystentem Dyrektora Finansowego Politechniki Częstochowskiej. 
                  Mogę pomóc Ci z pytaniami dotyczącymi finansów uczelni.
                </div>
              )}
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.role}`}>
                  <div className="message-content">
                    <strong>{msg.role === 'user' ? 'Ty' : 'Agent'}:</strong>
                    <p>{msg.content}</p>
                    <small>{msg.timestamp.toLocaleTimeString()}</small>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message assistant">
                  <div className="message-content">
                    <strong>Agent:</strong>
                    <p>Przetwarzam zapytanie...</p>
                  </div>
                </div>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="input-form">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Zadaj pytanie dotyczące finansów uczelni..."
                disabled={isLoading}
                className="message-input"
              />
              <button 
                type="submit" 
                disabled={!inputMessage.trim() || isLoading}
                className="send-btn"
              >
                Wyślij
              </button>
            </form>
          </div>
        </AuthenticatedTemplate>

        <UnauthenticatedTemplate>
          <div className="login-container">
            <h2>Logowanie wymagane</h2>
            <p>Aby uzyskać dostęp do Asystenta Dyrektora Finansowego, zaloguj się przez Microsoft Entra ID.</p>
            <button onClick={handleLogin} className="login-btn">
              Zaloguj przez Microsoft
            </button>
          </div>
        </UnauthenticatedTemplate>
      </header>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <MsalProvider instance={msalInstance}>
      <UserContextProvider>
        <ChatInterface />
        <ToastContainer 
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </UserContextProvider>
    </MsalProvider>
  );
};

export default App;
