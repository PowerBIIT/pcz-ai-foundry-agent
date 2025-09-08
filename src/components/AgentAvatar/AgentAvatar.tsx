// Agent Avatar Component - Visual Indicators
// Sprint 2B - Visual Indicators Implementation

import React from 'react';
import { AgentIdentificationService, AgentInfo } from '../../utils/agentIdentification';
import Icons from '../Icons/IconSystem';

interface AgentAvatarProps {
  agentText?: string;           // Agent response text to detect from
  agentType?: string;           // Direct agent tool name
  status?: 'thinking' | 'responding' | 'complete' | 'idle';
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;           // Show agent name
  showStatus?: boolean;         // Show status message
  animated?: boolean;           // Enable animations
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  agentText,
  agentType,
  status = 'idle',
  size = 'medium',
  showName = true,
  showStatus = false,
  animated = true
}) => {
  // Get agent info
  const agentInfo = React.useMemo(() => {
    if (agentType) {
      return AgentIdentificationService.getAgentInfo(agentType);
    }
    if (agentText) {
      return AgentIdentificationService.getAgentInfo(agentText);
    }
    return null;
  }, [agentType, agentText]);

  // Default to generic agent if no specific match
  const displayInfo: AgentInfo = agentInfo || {
    name: 'Asystent Dyrektora Finansowego',
    iconName: 'Robot',
    color: '#6c757d',
    description: 'Politechnika Częstochowska',
    category: 'financial'
  };

  // Generate status message
  const statusMessage = showStatus && status !== 'idle' 
    ? AgentIdentificationService.generateStatusMessage(displayInfo, status)
    : null;

  // CSS classes
  const avatarClasses = [
    'agent-avatar',
    `size-${size}`,
    `status-${status}`,
    `category-${displayInfo.category}`,
    animated ? 'animated' : '',
    showStatus ? 'with-status' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={avatarClasses} title={displayInfo.description}>
      {/* Avatar Circle */}
      <div 
        className="avatar-circle"
        style={{ 
          borderColor: displayInfo.color,
          background: `${displayInfo.color}15` // 15% opacity background
        }}
      >
        <span 
          className="avatar-icon"
          style={{ color: displayInfo.color }}
        >
          {React.createElement(Icons[displayInfo.iconName as keyof typeof Icons] || Icons.Robot, { size: 20 })}
        </span>
        
        {/* Status indicator dot */}
        {status !== 'idle' && (
          <div 
            className={`status-dot status-${status}`}
            style={{ backgroundColor: displayInfo.color }}
          />
        )}
      </div>

      {/* Agent Name */}
      {showName && (
        <div className="agent-name" style={{ color: displayInfo.color }}>
          {displayInfo.name}
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div className="agent-status-message">
          {statusMessage}
        </div>
      )}

      {/* Thinking Animation */}
      {status === 'thinking' && animated && (
        <div className="thinking-animation">
          <div className="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
    </div>
  );
};

// Typing Indicator Component
interface TypingIndicatorProps {
  agentInfo?: AgentInfo;
  message?: string;
  animated?: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  agentInfo,
  message = 'Agent pisze...',
  animated = true
}) => {
  return (
    <div className="typing-indicator">
      <AgentAvatar
        agentType={agentInfo ? Object.keys(AgentIdentificationService['AGENTS']).find(
          key => AgentIdentificationService['AGENTS'][key].name === agentInfo.name
        ) : undefined}
        status="thinking"
        size="small"
        showName={false}
        animated={animated}
      />
      <div className="typing-text">
        {message}
        {animated && (
          <span className="typing-cursor">|</span>
        )}
      </div>
    </div>
  );
};

// Progress Bar Component
interface ProgressBarProps {
  progress: number;              // 0-100
  status: string;                // Current operation
  agentInfo?: AgentInfo;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  status,
  agentInfo,
  animated = true
}) => {
  const progressColor = agentInfo?.color || '#007acc';

  return (
    <div className="progress-bar-container">
      <div className="progress-info">
        {agentInfo && (
          <AgentAvatar
            agentType={Object.keys(AgentIdentificationService['AGENTS']).find(
              key => AgentIdentificationService['AGENTS'][key].name === agentInfo.name
            )}
            status="responding"
            size="small" 
            showName={false}
            animated={animated}
          />
        )}
        <span className="progress-status">{status}</span>
        <span className="progress-percent">{progress}%</span>
      </div>
      
      <div className="progress-bar">
        <div 
          className={`progress-fill ${animated ? 'animated' : ''}`}
          style={{ 
            width: `${progress}%`,
            backgroundColor: progressColor
          }}
        />
      </div>
    </div>
  );
};

export default AgentAvatar;