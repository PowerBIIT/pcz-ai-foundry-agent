// Theme Management Hook
// Light/Dark mode toggle functionality

import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

interface UseThemeReturn {
  theme: Theme;
  actualTheme: 'light' | 'dark'; // The actual applied theme
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useTheme = (): UseThemeReturn => {
  // Get initial theme from localStorage or default to 'auto'
  const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return 'dark'; // SSR fallback
    
    const stored = localStorage.getItem('pcz-agent-theme') as Theme;
    if (stored && ['light', 'dark', 'auto'].includes(stored)) {
      return stored;
    }
    
    // Default to dark theme as per original design
    return 'dark';
  };

  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Get system preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Calculate actual theme to apply
  const getActualTheme = (currentTheme: Theme): 'light' | 'dark' => {
    if (currentTheme === 'auto') {
      return getSystemTheme();
    }
    return currentTheme;
  };

  const actualTheme = getActualTheme(theme);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('theme-light', 'theme-dark');
    
    // Add current theme class
    root.classList.add(`theme-${actualTheme}`);
    
    // Update data attribute for CSS
    root.setAttribute('data-theme', actualTheme);
    
  }, [actualTheme]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('pcz-agent-theme', theme);
  }, [theme]);

  // Listen to system theme changes when in auto mode
  useEffect(() => {
    if (theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Trigger re-render when system theme changes
      setThemeState('auto');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  return {
    theme,
    actualTheme,
    setTheme,
    toggleTheme
  };
};