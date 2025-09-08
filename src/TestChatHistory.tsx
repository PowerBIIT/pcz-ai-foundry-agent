// Test Page for Chat History Component
// Temporary file for testing purposes

import React, { useState } from 'react';
import ChatHistory from './components/ChatHistory/ChatHistory';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App-ultra-modern.css';

const TestChatHistory: React.FC = () => {
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  
  // Mock user data for testing
  const mockUserId = 'test-user-12345';
  const mockThreadId = 'test-thread-67890';

  return (
    <div className="modern-app" style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', border: '2px dashed #28a745' }}>
        <h1 style={{ color: '#28a745', margin: '0 0 10px 0' }}>🧪 TEST: Komponent Historia Czatów</h1>
        <p style={{ margin: '0', color: '#6c757d' }}>
          Ta strona testuje komponent ChatHistory bez wymagania logowania Microsoft.
        </p>
        <div style={{ marginTop: '15px', fontSize: '14px', color: '#495057' }}>
          <strong>Mock Data:</strong><br/>
          • User ID: {mockUserId}<br/>
          • Thread ID: {mockThreadId}<br/>
          • Status: {isHistoryCollapsed ? 'Zwinięte' : 'Rozwinięte'}
        </div>
      </div>

      <div className="modern-sidebar" style={{ position: 'relative', width: '350px', height: '600px', margin: '0 auto' }}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">🏛️</div>
            <h2 className="logo-text">PCZ Agent - TEST</h2>
          </div>
        </div>
        
        <ChatHistory 
          userId={mockUserId}
          currentThreadId={mockThreadId}
          onConversationSelect={(threadId) => {
            console.info(`[TEST] Selected conversation: ${threadId}`);
            alert(`Wybrano rozmowę: ${threadId}`);
          }}
          isCollapsed={isHistoryCollapsed}
          onToggleCollapse={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
        />
        
        <div className="sidebar-footer" style={{ padding: '15px', borderTop: '1px solid #e9ecef' }}>
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#6c757d' }}>
            Tryb testowy - Historia Czatów
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button 
          onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          {isHistoryCollapsed ? 'Rozwiń Historię' : 'Zwiń Historię'}
        </button>
        
        <button 
          onClick={() => {
            localStorage.removeItem('pcz-agent-chat-history');
            window.location.reload();
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Wyczyść Cache Historii
        </button>
      </div>

      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default TestChatHistory;