// Enhanced Error Boundary Component
// Professional error handling with better UX

import React, { Component, ReactNode } from 'react';
import Icons from '../Icons/IconSystem';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">
              <Icons.AlertCircle size={48} color="#ef4444" />
            </div>
            
            <h2 className="error-title">Ups! Coś poszło nie tak</h2>
            
            <p className="error-description">
              Wystąpił nieoczekiwany błąd w aplikacji. Spróbuj odświeżyć stronę lub skontaktuj się z administratorem.
            </p>

            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                className="retry-btn ripple-effect"
              >
                <Icons.RefreshCcw size={16} />
                <span>Spróbuj ponownie</span>
              </button>
              
              <button 
                onClick={this.handleReload}
                className="reload-btn ripple-effect"
              >
                <Icons.RefreshCcw size={16} />
                <span>Odśwież stronę</span>
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Szczegóły błędu (tryb deweloperski)</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Mini Error Component for inline errors
interface MiniErrorProps {
  message: string;
  onRetry?: () => void;
}

export const MiniError: React.FC<MiniErrorProps> = ({ message, onRetry }) => (
  <div className="mini-error">
    <Icons.AlertCircle size={16} color="#ef4444" />
    <span className="mini-error-text">{message}</span>
    {onRetry && (
      <button onClick={onRetry} className="mini-retry-btn">
        <Icons.RefreshCcw size={14} />
      </button>
    )}
  </div>
);

export default ErrorBoundary;