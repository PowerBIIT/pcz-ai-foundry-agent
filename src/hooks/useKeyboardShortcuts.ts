// Keyboard Shortcuts Hook - Power User Features
// Sprint 3 - Professional Tools

import { useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

export interface ShortcutAction {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'actions' | 'export' | 'general';
}

export interface UseKeyboardShortcutsOptions {
  onNewConversation?: () => void;
  onExport?: () => void;
  onSendMessage?: () => void;
  onClearInput?: () => void;
  onToggleHelp?: () => void;
  onFocusInput?: () => void;
  enabled?: boolean;
}

export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions) => {
  // Define all shortcuts
  const shortcuts: ShortcutAction[] = [
    {
      key: 'Enter',
      ctrlKey: true,
      action: () => options.onSendMessage?.(),
      description: 'Wyślij wiadomość',
      category: 'actions'
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => options.onNewConversation?.(),
      description: 'Nowa rozmowa',
      category: 'navigation'
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => options.onExport?.(),
      description: 'Eksportuj rozmowę',
      category: 'export'
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => options.onClearInput?.(),
      description: 'Wyczyść pole tekstowe',
      category: 'actions'
    },
    {
      key: '/',
      action: () => options.onFocusInput?.(),
      description: 'Przejdź do pola tekstowego',
      category: 'navigation'
    },
    {
      key: 'h',
      ctrlKey: true,
      action: () => options.onToggleHelp?.(),
      description: 'Pokaż/ukryj pomoc',
      category: 'general'
    },
    {
      key: 'F1',
      action: () => options.onToggleHelp?.(),
      description: 'Pomoc',
      category: 'general'
    }
  ];

  // Handle keydown events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!options.enabled) return;

    // Skip if user is typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow Ctrl+Enter in input fields
      if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault();
        options.onSendMessage?.();
        return;
      }
      
      // Skip other shortcuts when in input
      if (!event.ctrlKey) return;
    }

    // Find matching shortcut
    const shortcut = shortcuts.find(s => 
      s.key === event.key &&
      (s.ctrlKey || false) === event.ctrlKey &&
      (s.altKey || false) === event.altKey &&
      (s.shiftKey || false) === event.shiftKey
    );

    if (shortcut) {
      event.preventDefault();
      shortcut.action();
      
      // Show shortcut feedback
      if (process.env.NODE_ENV === 'development') {
        console.info(`🔥 Shortcut executed: ${shortcut.description}`);
      }
    }
  }, [options, shortcuts]);

  // Setup event listeners
  useEffect(() => {
    if (options.enabled !== false) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, options.enabled]);

  // Get shortcuts by category
  const getShortcutsByCategory = useCallback((category?: ShortcutAction['category']) => {
    if (!category) return shortcuts;
    return shortcuts.filter(s => s.category === category);
  }, [shortcuts]);

  // Format shortcut display
  const formatShortcut = useCallback((shortcut: ShortcutAction): string => {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    parts.push(shortcut.key);
    return parts.join(' + ');
  }, []);

  // Show shortcuts help
  const showShortcutsHelp = useCallback(() => {
    const helpText = shortcuts
      .map(s => `${formatShortcut(s)}: ${s.description}`)
      .join('\n');
    
    toast.info(`🔥 Keyboard Shortcuts:\n${helpText}`, {
      autoClose: 8000,
      style: { whiteSpace: 'pre-line' }
    });
  }, [shortcuts, formatShortcut]);

  return {
    shortcuts,
    getShortcutsByCategory,
    formatShortcut,
    showShortcutsHelp,
    isEnabled: options.enabled !== false
  };
};