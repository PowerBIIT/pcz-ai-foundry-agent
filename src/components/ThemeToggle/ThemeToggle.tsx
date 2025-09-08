// Theme Toggle Component
// Professional light/dark mode switcher

import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import Icons from '../Icons/IconSystem';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown';
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'button',
  showLabel = false,
  size = 'medium'
}) => {
  const { theme, actualTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  if (variant === 'dropdown') {
    return (
      <div className="theme-toggle-dropdown">
        <button
          className={`theme-toggle-btn ${size} ripple-effect`}
          onClick={() => setIsOpen(!isOpen)}
          title="Wybierz motyw"
        >
          {actualTheme === 'light' ? <Icons.Sun size={16} /> : <Icons.Moon size={16} />}
          {showLabel && <span className="theme-label">Motyw</span>}
          <Icons.ChevronRight size={14} className={`chevron ${isOpen ? 'open' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="theme-dropdown">
            <div className="theme-option-group">
              <button
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => {
                  setTheme('light');
                  setIsOpen(false);
                }}
              >
                <Icons.Sun size={16} />
                <span>Jasny motyw</span>
                {theme === 'light' && <Icons.CheckCircle size={14} />}
              </button>
              
              <button
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => {
                  setTheme('dark');
                  setIsOpen(false);
                }}
              >
                <Icons.Moon size={16} />
                <span>Ciemny motyw</span>
                {theme === 'dark' && <Icons.CheckCircle size={14} />}
              </button>
              
              <button
                className={`theme-option ${theme === 'auto' ? 'active' : ''}`}
                onClick={() => {
                  setTheme('auto');
                  setIsOpen(false);
                }}
              >
                <Icons.Palette size={16} />
                <span>Automatyczny</span>
                {theme === 'auto' && <Icons.CheckCircle size={14} />}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Simple button variant
  return (
    <button
      className={`theme-toggle-simple ${size} ripple-effect`}
      onClick={() => setTheme(actualTheme === 'light' ? 'dark' : 'light')}
      title={`Przełącz na ${actualTheme === 'light' ? 'ciemny' : 'jasny'} motyw`}
    >
      {actualTheme === 'light' ? (
        <Icons.Moon size={size === 'small' ? 14 : size === 'large' ? 20 : 16} />
      ) : (
        <Icons.Sun size={size === 'small' ? 14 : size === 'large' ? 20 : 16} />
      )}
      {showLabel && (
        <span className="theme-label">
          {actualTheme === 'light' ? 'Ciemny' : 'Jasny'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;