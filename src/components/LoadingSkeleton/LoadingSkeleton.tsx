// Loading Skeleton Components
// Professional loading states for better UX

import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

// Basic Skeleton Component
export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = '16px',
  className = '' 
}) => (
  <div 
    className={`loading-skeleton ${className}`}
    style={{ width, height }}
  />
);

// Text Skeleton
interface TextSkeletonProps {
  lines?: number;
  variant?: 'short' | 'medium' | 'long';
}

export const TextSkeleton: React.FC<TextSkeletonProps> = ({ 
  lines = 3,
  variant = 'medium' 
}) => (
  <div className="text-skeleton-container">
    {Array.from({ length: lines }, (_, i) => (
      <div 
        key={i}
        className={`skeleton-text ${variant} loading-skeleton`}
        style={{
          width: i === lines - 1 ? '75%' : undefined // Last line shorter
        }}
      />
    ))}
  </div>
);

// Message Skeleton (for chat messages)
export const MessageSkeleton: React.FC = () => (
  <div className="message-skeleton">
    <div className="message-skeleton-header">
      <div className="skeleton-avatar loading-skeleton" />
      <div className="skeleton-name loading-skeleton" />
    </div>
    <div className="message-skeleton-content">
      <TextSkeleton lines={2} variant="long" />
    </div>
  </div>
);

// Agent Response Skeleton
export const AgentResponseSkeleton: React.FC = () => (
  <div className="agent-response-skeleton">
    <div className="agent-skeleton-header">
      <div className="agent-avatar-skeleton">
        <div className="skeleton-circle loading-skeleton" />
      </div>
      <div className="agent-info-skeleton">
        <div className="skeleton-agent-name loading-skeleton" />
        <div className="skeleton-agent-status loading-skeleton" />
      </div>
    </div>
    
    <div className="agent-skeleton-content">
      <TextSkeleton lines={4} variant="medium" />
      
      <div className="skeleton-analysis-section">
        <div className="skeleton-section-title loading-skeleton" />
        <TextSkeleton lines={2} variant="short" />
      </div>
      
      <div className="skeleton-conclusion-section">
        <div className="skeleton-section-title loading-skeleton" />
        <TextSkeleton lines={3} variant="long" />
      </div>
    </div>
  </div>
);

// Sidebar History Skeleton
export const SidebarSkeleton: React.FC = () => (
  <div className="sidebar-skeleton">
    {Array.from({ length: 5 }, (_, i) => (
      <div key={i} className="history-item-skeleton">
        <div className="skeleton-history-title loading-skeleton" />
        <div className="skeleton-history-time loading-skeleton" />
      </div>
    ))}
  </div>
);

// Combined Loading Component for different states
interface LoadingStateProps {
  type: 'message' | 'agent-response' | 'sidebar' | 'text';
  lines?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  type, 
  lines = 3 
}) => {
  switch (type) {
    case 'message':
      return <MessageSkeleton />;
    case 'agent-response':
      return <AgentResponseSkeleton />;
    case 'sidebar':
      return <SidebarSkeleton />;
    case 'text':
      return <TextSkeleton lines={lines} />;
    default:
      return <TextSkeleton lines={lines} />;
  }
};

export default LoadingState;