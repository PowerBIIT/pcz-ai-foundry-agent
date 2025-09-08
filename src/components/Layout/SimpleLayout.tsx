// Simplified Professional Layout - Working Version
// Sprint 4.3 - Immediate integration with existing App

import React, { useState } from 'react';

// ========================================
// SIMPLIFIED LAYOUT FOR IMMEDIATE USE
// ========================================

export interface SimpleLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  className?: string;
}

export const SimpleLayout: React.FC<SimpleLayoutProps> = ({
  children,
  showSidebar = true,
  className = ''
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className={`pcz-app-layout ${className}`}>
      {showSidebar && (
        <SimpleSidebar 
          isCollapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
      )}
      
      <main className="pcz-main-content">
        <SimpleHeader 
          onSidebarToggle={toggleSidebar}
          showSidebarToggle={showSidebar}
        />
        
        <div className="pcz-content-area">
          {children}
        </div>
      </main>
    </div>
  );
};

// ========================================
// SIMPLIFIED SIDEBAR
// ========================================

interface SimpleSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const SimpleSidebar: React.FC<SimpleSidebarProps> = ({
  isCollapsed,
  onToggle
}) => {
  const sidebarClasses = [
    'pcz-sidebar',
    isCollapsed && 'pcz-sidebar--collapsed'
  ].filter(Boolean).join(' ');

  return (
    <aside className={sidebarClasses}>
      <div className="pcz-sidebar__header">
        <div className="pcz-sidebar__logo">
          <div className="pcz-sidebar__logo-icon">
            🏛️
          </div>
          {!isCollapsed && (
            <span className="pcz-sidebar__logo-text">
              PCZ Agent
            </span>
          )}
        </div>
      </div>
      
      <nav className="pcz-sidebar__nav">
        <NavSection title="Główne">
          <SimpleNavItem
            icon="💬"
            label="Chat z Ekspertami"
            active={true}
          />
          <SimpleNavItem
            icon="📊"
            label="Historia"
            badge="5"
          />
          <SimpleNavItem
            icon="⭐"
            label="Zapisane"
          />
        </NavSection>

        <NavSection title="Eksperci">
          <SimpleNavItem
            icon="💰"
            label="Budżet"
            expertType="budget"
          />
          <SimpleNavItem
            icon="📋"
            label="Zamówienia"
            expertType="orders"
          />
          <SimpleNavItem
            icon="🔍"
            label="Audyt"
            expertType="audit"
          />
          <SimpleNavItem
            icon="⚖️"
            label="Compliance"
            expertType="legal"
          />
          <SimpleNavItem
            icon="📈"
            label="Strategia"
            expertType="strategy"
          />
        </NavSection>
      </nav>
      
      <div className="pcz-sidebar__footer">
        <SimpleUserProfile collapsed={isCollapsed} />
      </div>
    </aside>
  );
};

// ========================================
// SIMPLIFIED NAVIGATION
// ========================================

const NavSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="pcz-nav-section">
    <h3 className="pcz-nav-section__title">{title}</h3>
    {children}
  </div>
);

interface SimpleNavItemProps {
  icon: string;
  label: string;
  active?: boolean;
  badge?: string;
  expertType?: string;
  onClick?: () => void;
}

const SimpleNavItem: React.FC<SimpleNavItemProps> = ({
  icon,
  label,
  active = false,
  badge,
  expertType,
  onClick
}) => {
  const classes = [
    'pcz-nav-item',
    active && 'pcz-nav-item--active',
    expertType && `pcz-nav-item--expert-${expertType}`
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={classes}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <span className="pcz-nav-item__icon">{icon}</span>
      <span className="pcz-nav-item__label">{label}</span>
      {badge && (
        <span className="pcz-nav-item__badge">{badge}</span>
      )}
    </div>
  );
};

// ========================================
// SIMPLIFIED USER PROFILE
// ========================================

const SimpleUserProfile: React.FC<{ collapsed?: boolean }> = ({ 
  collapsed = false 
}) => {
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
// SIMPLIFIED HEADER
// ========================================

interface SimpleHeaderProps {
  onSidebarToggle: () => void;
  showSidebarToggle?: boolean;
}

const SimpleHeader: React.FC<SimpleHeaderProps> = ({
  onSidebarToggle,
  showSidebarToggle = true
}) => (
  <header className="pcz-main-header">
    <div className="pcz-main-header__left">
      {showSidebarToggle && (
        <button 
          className="pcz-sidebar-toggle"
          onClick={onSidebarToggle}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          ☰
        </button>
      )}
      
      <div>
        <h1 className="pcz-page-title">Asystent Dyrektora Finansowego</h1>
      </div>
    </div>
  </header>
);

// ========================================
// SIMPLIFIED CARD WRAPPER
// ========================================

export const SimpleCard: React.FC<{
  title?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className = '' }) => (
  <div className={`pcz-card ${className}`}>
    {title && (
      <div className="pcz-card__header">
        <h3 className="pcz-card__title">{title}</h3>
      </div>
    )}
    <div className="pcz-card__body">
      {children}
    </div>
  </div>
);

export default SimpleLayout;