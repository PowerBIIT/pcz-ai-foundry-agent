// PCZ Agent - Enhanced Multi-User Chat Interface
// Sprint 1 - Complete Implementation

import React, { useState } from 'react';
import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { ToastContainer, toast } from 'react-toastify';
import { msalConfig, loginRequest } from './authConfig';
import { UserContextProvider, useUserContext, useCurrentThreadId } from './contexts/UserContextProvider';
import { chatService } from './services/ChatService';
import { fileService } from './services/FileService';
import { ChatMessage } from './services/ChatService';
import { FileMetadata } from './types/FileTypes';
import AgentAvatar, { TypingIndicator } from './components/AgentAvatar/AgentAvatar';
import ExportDialog from './components/Export/ExportDialog';
import { savedResponsesService } from './services/SavedResponsesService';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSlashCommands } from './hooks/useSlashCommands';
import Icons from './components/Icons/IconSystem';
import { IconButton } from './components/Icons/IconContainer';
import ErrorBoundary, { MiniError } from './components/ErrorBoundary/ErrorBoundary';
import { AgentResponseSkeleton } from './components/LoadingSkeleton/LoadingSkeleton';
import ThemeToggle from './components/ThemeToggle/ThemeToggle';
import 'react-toastify/dist/ReactToastify.css';
import './App-ultra-modern.css';

const msalInstance = new PublicClientApplication(msalConfig);

const ChatInterface: React.FC = () => {
  const { instance, accounts } = useMsal();
  const { currentUserId, isAuthenticated } = useUserContext();
  const currentThreadId = useCurrentThreadId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>(''); // Progress tracking
  const [uploadedFiles, setUploadedFiles] = useState<FileMetadata[]>([]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  
  // Power User Features
  const inputRef = React.useRef<HTMLInputElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll when messages change
  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleLogin = () => {
    instance.loginPopup(loginRequest).catch(e => {
      console.log(e);
      toast.error('Błąd logowania');
    });
  };

  const handleLogout = () => {
    instance.logoutPopup().catch(e => {
      console.log(e);
      toast.error('Błąd wylogowania');
    });
  };

  const handleFilesSelected = async (files: File[]) => {
    if (!currentUserId || !isAuthenticated) {
      toast.error('Musisz być zalogowany żeby przesłać pliki');
      return;
    }

    try {
      // Get access token
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ["https://ai.azure.com/.default"],
        account: accounts[0]
      });

      // Upload each file
      for (const file of files) {
        try {
          const result = await fileService.uploadFile(
            file,
            currentUserId,
            tokenResponse.accessToken,
            {
              onProgress: (fileId, progress) => {
                // Only update non-temp files in UI
                if (!fileId.startsWith('temp_')) {
                  setUploadedFiles(prev => 
                    prev.map(f => 
                      f.fileId === fileId ? { ...f, progress } : f
                    )
                  );
                }
              },
              onStatusChange: (fileId, status) => {
                // Only update non-temp files in UI
                if (!fileId.startsWith('temp_')) {
                  setUploadedFiles(prev => 
                    prev.map(f => 
                      f.fileId === fileId ? { ...f, status } : f
                    )
                  );
                }
              }
            }
          );

          if (result.status === 'ready') {
            toast.success(`Plik ${file.name} został przesłany pomyślnie`);
          } else if (result.status === 'error') {
            toast.error(`Błąd przesyłania ${file.name}: ${result.error}`);
          }

        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          toast.error(`Błąd przesyłania ${file.name}`);
        }
      }

      // Refresh user files and filter out temp files
      const userFiles = await fileService.getUserFiles(currentUserId);
      const cleanFiles = userFiles.filter(file => !file.fileId.startsWith('temp_'));
      setUploadedFiles(cleanFiles);

    } catch (error) {
      console.error('Error in file upload process:', error);
      toast.error('Błąd podczas przesyłania plików');
    }
  };

  const handleFileRemove = async (file: File) => {
    if (!currentUserId) return;

    try {
      // Find file metadata by name (since we only have File object)
      const fileMetadata = uploadedFiles.find(f => f.filename === file.name);
      if (fileMetadata) {
        await fileService.removeFileMetadata(fileMetadata.fileId, currentUserId);
        
        // Update UI
        setUploadedFiles(prev => prev.filter(f => f.fileId !== fileMetadata.fileId));
        toast.success(`Plik ${file.name} został usunięty`);
      }
    } catch (error) {
      console.error(`Error removing file ${file.name}:`, error);
      toast.error(`Błąd usuwania pliku ${file.name}`);
    }
  };

  const callAgent = async (message: string) => {
    if (!currentUserId || !isAuthenticated) {
      toast.error('Musisz być zalogowany żeby wysłać wiadomość');
      return;
    }

    setIsLoading(true);
    setLoadingStage('Przygotowywanie zapytania...');
    
    try {
      // Step 1: Authentication
      setLoadingStage('Weryfikacja uprawnień...');
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ["https://ai.azure.com/.default"],
        account: accounts[0]
      });
      
      // Step 2: Add user message
      setLoadingStage('Dodawanie wiadomości...');
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date(),
        userId: currentUserId
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Step 3: AI Processing
      setLoadingStage('Analizowanie zapytania przez AI...');
      
      // Use ChatService with detailed progress tracking
      const assistantResponse = await chatService.sendMessage(
        currentUserId,
        message,
        tokenResponse.accessToken,
        {
          onProgress: (status) => {
            console.info(`Chat progress: ${status}`);
            // Update loading stage based on status
            if (status.includes('router')) {
              setLoadingStage('Wybieranie odpowiedniego eksperta...');
            } else if (status.includes('expert')) {
              setLoadingStage('Konsultacja z ekspertem...');
            } else if (status.includes('response')) {
              setLoadingStage('Generowanie odpowiedzi...');
            } else {
              setLoadingStage('Przetwarzanie przez AI...');
            }
          },
          onError: (error) => {
            console.error('Chat service error:', error);
            setLoadingStage('Błąd podczas komunikacji...');
          }
        }
      );
      
      // Add assistant response to UI
      console.log('Assistant response received:', assistantResponse);
      
      if (assistantResponse && assistantResponse.content) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: assistantResponse.content,
          timestamp: assistantResponse.timestamp || new Date(),
          userId: currentUserId
        };
        
        console.log('Adding assistant message to UI:', assistantMessage);
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        console.error('Invalid assistant response:', assistantResponse);
        throw new Error('Otrzymano nieprawidłową odpowiedź od AI');
      }
      
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
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingStage('');
      setInputMessage('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    // Check for slash commands first
    const { isCommand, processedInput } = processInput(inputMessage.trim());
    
    if (isCommand) {
      // Command was executed, clear input
      setInputMessage('');
      return;
    }

    // Regular message
    if (processedInput.trim()) {
      callAgent(processedInput.trim());
    }
  };

  const handleInputChangeWithSlash = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputMessage(value);
    handleSlashInput(value);
  };

  const handleNewConversation = () => {
    setMessages([]);
    toast.info('Rozpoczęto nową rozmowę');
  };

  const handleSaveResponse = async (message: ChatMessage) => {
    if (!currentUserId || message.role !== 'assistant') return;

    try {
      // Auto-detect category from agent type
      let category: 'budżet' | 'pzp' | 'audyt' | 'rachunkowość' | 'procedury' | 'inne' = 'inne';
      
      if (message.content.includes('Audytor')) category = 'audyt';
      else if (message.content.includes('Budżet')) category = 'budżet';
      else if (message.content.includes('Zamówień')) category = 'pzp';
      else if (message.content.includes('Rachunk')) category = 'rachunkowość';
      else if (message.content.includes('procedur')) category = 'procedury';

      const title = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '');
      
      await savedResponsesService.saveResponse(
        currentUserId,
        message.content,
        title,
        category,
        {
          threadId: currentThreadId || undefined,
          messageTimestamp: message.timestamp
        }
      );

      toast.success('Odpowiedź została zapisana');
    } catch (error) {
      console.error('Save response error:', error);
      toast.error(error instanceof Error ? error.message : 'Błąd zapisywania');
    }
  };

  // Load user files when user changes
  React.useEffect(() => {
    const loadUserFiles = async () => {
      if (currentUserId && isAuthenticated) {
        try {
          const userFiles = await fileService.getUserFiles(currentUserId);
          // Filter out temp files from display
          const cleanFiles = userFiles.filter(file => !file.fileId.startsWith('temp_'));
          setUploadedFiles(cleanFiles);
        } catch (error) {
          console.error('Error loading user files:', error);
        }
      }
    };

    loadUserFiles();
  }, [currentUserId, isAuthenticated]);

  // Power User Features - Setup after all functions defined
  useKeyboardShortcuts({
    onNewConversation: handleNewConversation,
    onExport: () => setShowExportDialog(true),
    onSendMessage: () => {
      if (inputMessage.trim() && !isLoading) {
        handleSubmit(new Event('submit') as any);
      }
    },
    onClearInput: () => {
      setInputMessage('');
      inputRef.current?.focus();
    },
    onFocusInput: () => inputRef.current?.focus(),
    enabled: true
  });

  const { processInput, handleInputChange: handleSlashInput } = useSlashCommands({
    onNewConversation: handleNewConversation,
    onExport: () => setShowExportDialog(true),
    onHelp: () => toast.info('💡 Dostępne komendy:\n/clear - Nowa rozmowa\n/export - Eksport\n/help - Pomoc', {
      autoClose: 5000,
      style: { whiteSpace: 'pre-line' }
    }),
    enabled: true
  });

  // Fix: Close profile dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserProfile && !target.closest('.user-profile') && !target.closest('.user-profile-dropdown')) {
        setShowUserProfile(false);
      }
    };

    if (showUserProfile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserProfile]);

  return (
    <div className="modern-app">
      {/* Mobile Sidebar Overlay */}
      <AuthenticatedTemplate>
        <div 
          className={`sidebar-overlay ${isMobileSidebarOpen ? 'active' : ''}`}
          onClick={() => setIsMobileSidebarOpen(false)}
        />
        
        {/* MODERN SIDEBAR */}
        <div className={`modern-sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <div className="logo-icon"><Icons.Building size={20} /></div>
              <h2 className="logo-text">PCZ Agent</h2>
            </div>
            <button 
              onClick={handleNewConversation}
              className="new-chat-btn ripple-effect"
              title="Nowa rozmowa"
            >
              <IconButton
                variant="soft"
                size="sm"
                shape="rounded"
                className="new-chat-icon"
              >
                <Icons.Plus size={14} />
              </IconButton>
              <span className="text">Nowa rozmowa</span>
            </button>
          </div>
          
          <div className="chat-history">
            <div className="history-section">
              <h3>Dzisiaj</h3>
              <div className="history-item active">
                <span className="history-title">Aktualna rozmowa</span>
              </div>
            </div>
            
            <div className="history-section">
              <h3>Historia</h3>
              <div className="history-empty">
                <span className="empty-text">Brak wcześniejszych rozmów</span>
              </div>
            </div>
          </div>
          
          <div className="sidebar-footer">
            <div 
              className={`user-profile ${showUserProfile ? 'active' : ''}`}
              onClick={() => setShowUserProfile(!showUserProfile)}
            >
              <div className="user-avatar">
                <span>{accounts[0]?.username?.split('@')[0]?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="user-info">
                <div className="user-name">{accounts[0]?.username?.split('@')[0]}</div>
                <div className="user-email">{accounts[0]?.username}</div>
              </div>
              <IconButton
                variant="soft"
                size="sm"
                shape="circle"
                color="error"
                onClick={(e) => {
                  e?.stopPropagation();
                  handleLogout();
                }}
                title="Wyloguj"
                className="logout-btn"
              >
                <Icons.Logout size={14} />
              </IconButton>
            </div>
            
            {/* User Profile Dropdown */}
            {showUserProfile && (
              <div className="user-profile-dropdown">
                <div className="profile-section">
                  <div className="profile-header">
                    <Icons.User size={16} />
                    <span className="profile-title">Profil użytkownika</span>
                  </div>
                  <div className="profile-info">
                    <div className="info-item">
                      <span className="info-label">Nazwa:</span>
                      <span className="info-value">{accounts[0]?.username?.split('@')[0]}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Email:</span>
                      <span className="info-value">{accounts[0]?.username}</span>
                    </div>
                  </div>
                </div>
                
                <div className="profile-actions">
                  <button 
                    className="profile-action-btn"
                    onClick={async () => {
                      if (!currentUserId) return;
                      try {
                        const saved = await savedResponsesService.getUserSavedResponses(currentUserId);
                        if (saved.length === 0) {
                          toast.info('Brak zapisanych odpowiedzi. Zapisz odpowiedź eksperta klikając ⭐ przy wiadomości.');
                        } else {
                          toast.success(`Masz ${saved.length} zapisanych odpowiedzi:\n${saved.slice(0, 3).map(r => `• ${r.title}`).join('\n')}${saved.length > 3 ? '\n...' : ''}`, {
                            autoClose: 5000,
                            style: { whiteSpace: 'pre-line' }
                          });
                        }
                      } catch (error) {
                        toast.error('Błąd podczas pobierania zapisanych odpowiedzi');
                      }
                    }}
                  >
                    <Icons.Star size={14} />
                    <span className="action-text">Zapisane odpowiedzi</span>
                  </button>

                  <div className="profile-theme-section">
                    <ThemeToggle variant="dropdown" showLabel={true} size="small" />
                  </div>
                  
                  <button 
                    className="profile-action-btn logout"
                    onClick={handleLogout}
                  >
                    <Icons.Logout size={14} />
                    <span className="action-text">Wyloguj</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </AuthenticatedTemplate>

      {/* MAIN CONTENT AREA */}
      <div className="modern-main">
        <AuthenticatedTemplate>
          <div className="main-header">
            <div className="main-header-left">
              <IconButton
                variant="soft"
                size="md"
                shape="rounded"
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                title="Toggle sidebar"
                className="mobile-sidebar-toggle"
              >
                <Icons.Menu size={18} />
              </IconButton>
              <h1>Asystent Finansowy PCZ</h1>
            </div>
            <div className="header-actions">
              <ThemeToggle variant="button" size="medium" />
              <IconButton
                variant="outlined"
                size="md"
                shape="rounded"
                onClick={() => setShowExportDialog(true)}
                disabled={messages.length === 0}
                title="Eksportuj rozmowę"
              >
                <Icons.Download size={16} />
              </IconButton>
            </div>
          </div>
          
          {/* FILE ATTACHMENTS COMPACT */}
          {uploadedFiles.length > 0 && (
            <div className="file-attachments">
              <div className="attachment-header">
                <Icons.Download size={16} />
                <span>Załączniki ({uploadedFiles.length})</span>
              </div>
              <div className="attachment-list">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="attachment-item">
                    <span className="file-icon"><Icons.FileText size={14} /></span>
                    <span className="file-name">{file.filename}</span>
                    <button 
                      onClick={() => handleFileRemove(new File([], file.filename))}
                      className="remove-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* MODERN CHAT AREA */}
          <div className="modern-chat">
            <div className="messages-container">
              {messages.length === 0 && (
                <div className="welcome-screen">
                  <div className="welcome-icon"><Icons.Building size={48} /></div>
                  <h2>Asystent Finansowy PCZ</h2>
                  <p>Zadaj pytanie dotyczące finansów uczelni. System automatycznie przekieruje je do odpowiedniego eksperta.</p>
                </div>
              )}
              
              {messages.map((msg, index) => (
                <div key={index} className={`modern-message ${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <div className="message-avatar">
                      <AgentAvatar
                        agentText={msg.content}
                        status="complete"
                        size="medium"
                        showName={false}
                        animated={false}
                      />
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div className="message-avatar user-avatar">
                      <span>{accounts[0]?.username?.charAt(0)?.toUpperCase()}</span>
                    </div>
                  )}
                  
                  <div className="message-content">
                    <div className="message-text">{msg.content}</div>
                    <div className="message-actions">
                      <span className="message-time">{msg.timestamp.toLocaleTimeString()}</span>
                      {msg.role === 'assistant' && (
                        <IconButton
                          variant="minimal"
                          size="sm"
                          shape="rounded"
                          onClick={() => handleSaveResponse(msg)}
                          title="Zapisz odpowiedź"
                          className="action-btn"
                        >
                          <Icons.Star size={14} />
                        </IconButton>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="modern-message assistant loading">
                  <div className="message-avatar">
                    <div className="loading-avatar"><Icons.Robot size={24} /></div>
                  </div>
                  <div className="message-content">
                    <div className="progress-section">
                      <div className="progress-header">
                        <Icons.Clock size={16} />
                        <span className="progress-title">Przetwarzanie zapytania</span>
                      </div>
                      <TypingIndicator 
                        message={loadingStage || "Analizuję zapytanie i przekazuję do odpowiedniego eksperta..."}
                        animated={true}
                      />
                      <div className="loading-progress-bar">
                        <div className="progress-bar-fill"></div>
                      </div>
                      <div className="loading-steps">
                        <div className={`step ${loadingStage.includes('Przygotowywanie') || loadingStage.includes('Weryfikacja') ? 'active' : 'completed'}`}>
                          <Icons.CheckCircle size={12} />
                          <span>Weryfikacja</span>
                        </div>
                        <div className={`step ${loadingStage.includes('Analizowanie') || loadingStage.includes('Wybieranie') ? 'active' : ''}`}>
                          <Icons.Search size={12} />
                          <span>Analiza</span>
                        </div>
                        <div className={`step ${loadingStage.includes('Konsultacja') || loadingStage.includes('Generowanie') ? 'active' : ''}`}>
                          <Icons.Robot size={12} />
                          <span>Odpowiedź</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Enhanced Loading Skeleton for longer waits */}
                    {loadingStage.includes('Przetwarzanie') && (
                      <AgentResponseSkeleton />
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* MODERN INPUT */}
            <div className="modern-input">
              <form onSubmit={handleSubmit} className="input-container">
                <div className="input-wrapper">
                  <IconButton
                    variant="soft"
                    size="md"
                    shape="rounded"
                    onClick={() => document.getElementById('file-input')?.click()}
                    disabled={isLoading}
                    title="Załącz pliki"
                    className="attach-btn"
                  >
                    <Icons.Attachment size={16} />
                  </IconButton>
                  <input 
                    id="file-input"
                    type="file"
                    multiple
                    accept=".pdf,.docx,.xlsx,.txt,.md"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        handleFilesSelected(files);
                      }
                    }}
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={handleInputChangeWithSlash}
                    placeholder="Zadaj pytanie..."
                    disabled={isLoading}
                    className="chat-input"
                  />
                  <IconButton
                    variant="filled"
                    size="md"
                    shape="circle"
                    color="accent"
                    onClick={() => {
                      if (!isLoading && inputMessage.trim()) {
                        handleSubmit(new Event('submit') as any);
                      }
                    }}
                    disabled={!inputMessage.trim() || isLoading}
                    title="Wyślij wiadomość"
                    className="send-button"
                  >
                    {isLoading ? (
                      <div className="loading-spinner"></div>
                    ) : (
                      <Icons.Send size={16} />
                    )}
                  </IconButton>
                </div>
              </form>
            </div>
          </div>
        </AuthenticatedTemplate>

        <UnauthenticatedTemplate>
          <div className="login-container">
            <h2>Logowanie wymagane</h2>
            <p>Aby uzyskać dostęp do Asystenta Dyrektora Finansowego, zaloguj się przez Microsoft Entra ID.</p>
            <button onClick={handleLogin} className="login-btn">
              <Icons.User size={16} /><span style={{marginLeft: '8px'}}>Zaloguj przez Microsoft</span>
            </button>
          </div>
        </UnauthenticatedTemplate>

        {/* Export Dialog */}
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          messages={messages}
          attachments={uploadedFiles}
          title="Eksport rozmowy z PCZ Agent"
        />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <MsalProvider instance={msalInstance}>
        <UserContextProvider>
          <ErrorBoundary>
            <ChatInterface />
          </ErrorBoundary>
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
            theme="light"
          />
        </UserContextProvider>
      </MsalProvider>
    </ErrorBoundary>
  );
};

export default App;