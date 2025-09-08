// Professional Layout Architecture - Sprint 4.3
// Sidebar navigation + Card-based design + Multi-panel experience

import React, { useState } from 'react';

// ========================================
// LAYOUT INTERFACES
// ========================================

export interface LayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

export interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string | number;
  onClick?: () => void;
  href?: string;
}

export interface ExpertCardProps {
  type: 'budget' | 'orders' | 'audit' | 'legal' | 'strategy' | 'accounting' | 'assets' | 'liquidity' | 'procedures' | 'mentor';
  title: string;
  description: string;
  status?: 'available' | 'busy' | 'offline';
  active?: boolean;
  onClick?: () => void;
}

// ========================================
// MAIN LAYOUT COMPONENT
// ========================================

export const Layout: React.FC<LayoutProps> = ({
  children,
  sidebar,
  header,
  className = ''
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className={`pcz-app-layout ${className}`}>
      {sidebar && React.cloneElement(sidebar as React.ReactElement<SidebarProps>, {
        isCollapsed: sidebarCollapsed,
        onToggle: toggleSidebar
      })}
      
      <main className="pcz-main-content">
        {header && React.cloneElement(header as React.ReactElement, {
          onSidebarToggle: toggleSidebar,
          sidebarCollapsed
        } as any)}
        {children}
      </main>
    </div>
  );
};

// ========================================
// SIDEBAR COMPONENT
// ========================================

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggle,
  children,
  className = ''
}) => {
  const sidebarClasses = [
    'pcz-sidebar',
    isCollapsed && 'pcz-sidebar--collapsed',
    className
  ].filter(Boolean).join(' ');

  return (
    <aside className={sidebarClasses}>
      <div className="pcz-sidebar__header">
        <div className="pcz-sidebar__logo">
          <div className="pcz-sidebar__logo-icon">
            🏛️
          </div>
          <span className="pcz-sidebar__logo-text">
            PCZ Agent
          </span>
        </div>
      </div>
      
      <nav className="pcz-sidebar__nav">
        {children}
      </nav>
      
      <div className="pcz-sidebar__footer">
        <UserProfile collapsed={isCollapsed} />
      </div>
    </aside>
  );
};

// ========================================
// NAVIGATION COMPONENTS
// ========================================

export const NavSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="pcz-nav-section">
    <h3 className="pcz-nav-section__title">{title}</h3>
    {children}
  </div>
);

export const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  active = false,
  badge,
  onClick,
  href
}) => {
  const classes = [
    'pcz-nav-item',
    active && 'pcz-nav-item--active'
  ].filter(Boolean).join(' ');

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.();
  };

  const baseProps = {
    className: classes,
    onClick: handleClick,
    role: 'button' as const,
    tabIndex: 0
  };
  
  const linkProps = {
    ...baseProps,
    href,
    'aria-current': active ? 'page' as const : undefined
  };
  
  const buttonProps = {
    ...baseProps,
    'aria-current': active ? 'page' as const : undefined
  };

  const content = (
    <>
      <span className="pcz-nav-item__icon">{icon}</span>
      <span className="pcz-nav-item__label">{label}</span>
      {badge && (
        <span className="pcz-nav-item__badge">{badge}</span>
      )}
    </>
  );

  return href ? (
    <a {...linkProps}>{content}</a>
  ) : (
    <div {...buttonProps}>{content}</div>
  );
};

// ========================================
// USER PROFILE COMPONENT
// ========================================

const UserProfile: React.FC<{ collapsed?: boolean }> = ({ collapsed = false }) => {
  // Mock user data - replace with real data from authentication context
  const user = {
    name: 'Radosław Broniszewski',
    role: 'Developer',
    initials: 'RB'
  };

  return (
    <div className="pcz-user-profile">
      <div className="pcz-user-profile__avatar">
        {user.initials}
      </div>
      {!collapsed && (
        <div className="pcz-user-profile__info">
          <div className="pcz-user-profile__name">{user.name}</div>
          <div className="pcz-user-profile__role">{user.role}</div>
        </div>
      )}
    </div>
  );
};

// ========================================
// HEADER COMPONENT
// ========================================

export const Header: React.FC<{
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  onSidebarToggle?: () => void;
}> = ({ title, breadcrumbs, actions, onSidebarToggle }) => (
  <header className="pcz-main-header">
    <div className="pcz-main-header__left">
      <button 
        className="pcz-sidebar-toggle"
        onClick={onSidebarToggle}
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
      >
        ☰
      </button>
      
      <div>
        {title && <h1 className="pcz-page-title">{title}</h1>}
        {breadcrumbs && (
          <nav className="pcz-breadcrumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <span className="pcz-breadcrumb-separator">/</span>
                )}
                {crumb.href ? (
                  <a href={crumb.href}>{crumb.label}</a>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>
    </div>
    
    {actions && (
      <div className="pcz-main-header__actions">
        {actions}
      </div>
    )}
  </header>
);

// ========================================
// CARD COMPONENTS
// ========================================

export interface CardProps {
  title?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  actions,
  footer,
  children,
  className = '',
  hoverable = false
}) => {
  const cardClasses = [
    'pcz-card',
    hoverable && 'pcz-card--hoverable',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses}>
      {title && (
        <div className="pcz-card__header">
          <h3 className="pcz-card__title">{title}</h3>
          {actions && (
            <div className="pcz-card__actions">{actions}</div>
          )}
        </div>
      )}
      
      <div className="pcz-card__body">
        {children}
      </div>
      
      {footer && (
        <div className="pcz-card__footer">
          {footer}
        </div>
      )}
    </div>
  );
};

// ========================================
// MESSAGE CARD COMPONENT
// ========================================

export interface MessageCardProps {
  role: 'user' | 'assistant' | 'expert';
  content: string;
  timestamp: Date;
  expertType?: string;
  actions?: React.ReactNode;
  avatar?: React.ReactNode;
  className?: string;
}

export const MessageCard: React.FC<MessageCardProps> = ({
  role,
  content,
  timestamp,
  expertType,
  actions,
  avatar,
  className = ''
}) => {
  const messageClasses = [
    'pcz-message-card',
    `pcz-message-card--${role}`,
    expertType && `pcz-message-card--expert`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={messageClasses}>
      <div className={`pcz-message-header pcz-message-header--${role}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {avatar}
          <span>
            {role === 'user' ? 'Ty' : expertType ? `${expertType}` : 'Asystent'}
          </span>
        </div>
        <small>{timestamp.toLocaleTimeString()}</small>
      </div>
      
      <div className="pcz-message-body">
        {content}
      </div>
      
      {actions && (
        <div className="pcz-message-footer">
          {actions}
        </div>
      )}
    </div>
  );
};

// ========================================
// EXPERT CARD COMPONENT
// ========================================

const EXPERT_CONFIG = {
  budget: { icon: '💰', color: 'var(--pcz-expert-budget)' },
  orders: { icon: '📋', color: 'var(--pcz-expert-orders)' },
  audit: { icon: '🔍', color: 'var(--pcz-expert-audit)' },
  legal: { icon: '⚖️', color: 'var(--pcz-expert-legal)' },
  strategy: { icon: '📈', color: 'var(--pcz-expert-strategy)' },
  accounting: { icon: '📊', color: 'var(--pcz-expert-accounting)' },
  assets: { icon: '🏢', color: 'var(--pcz-expert-assets)' },
  liquidity: { icon: '💧', color: 'var(--pcz-expert-liquidity)' },
  procedures: { icon: '📋', color: 'var(--pcz-expert-procedures)' },
  mentor: { icon: '🎓', color: 'var(--pcz-expert-mentor)' }
};

export const ExpertCard: React.FC<ExpertCardProps> = ({
  type,
  title,
  description,
  status = 'available',
  active = false,
  onClick
}) => {
  const config = EXPERT_CONFIG[type];
  const cardClasses = [
    'pcz-expert-card',
    `pcz-expert-card--${type}`,
    active && 'pcz-expert-card--active'
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={cardClasses}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={active}
    >
      <div className="pcz-expert-card__icon" style={{ background: config.color }}>
        {config.icon}
      </div>
      
      <h4 className="pcz-expert-card__title">{title}</h4>
      <p className="pcz-expert-card__description">{description}</p>
      
      <div className="pcz-expert-card__status">
        <div className={`pcz-expert-status pcz-expert-status--${status}`}>
          <div className="pcz-expert-status__dot" />
          <span>{status === 'available' ? 'Dostępny' : status === 'busy' ? 'Zajęty' : 'Offline'}</span>
        </div>
      </div>
    </div>
  );
};

// ========================================
// EXPERT PANEL COMPONENT
// ========================================

export const ExpertPanel: React.FC<{
  experts: Array<Omit<ExpertCardProps, 'onClick'> & { id: string }>;
  activeExpert?: string;
  onExpertSelect?: (expertId: string) => void;
}> = ({ experts, activeExpert, onExpertSelect }) => (
  <div className="pcz-expert-panel">
    {experts.map((expert) => (
      <ExpertCard
        key={expert.id}
        {...expert}
        active={activeExpert === expert.id}
        onClick={() => onExpertSelect?.(expert.id)}
      />
    ))}
  </div>
);

// Export all components
export default Layout;