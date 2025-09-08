// Slash Commands Hook - Power User Features  
// Sprint 3 - Professional Tools

import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

export interface SlashCommand {
  command: string;
  description: string;
  action: (args?: string[]) => void;
  category: 'navigation' | 'export' | 'help' | 'data';
  aliases?: string[];
  usage?: string;
}

export interface UseSlashCommandsOptions {
  onNewConversation?: () => void;
  onExport?: () => void;
  onShowSavedResponses?: () => void;
  onShowHistory?: () => void;
  onHelp?: () => void;
  onClear?: () => void;
  enabled?: boolean;
}

export const useSlashCommands = (options: UseSlashCommandsOptions) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [filteredCommands, setFilteredCommands] = useState<SlashCommand[]>([]);

  // Define slash commands
  const commands: SlashCommand[] = [
    {
      command: '/clear',
      description: 'Rozpocznij nową rozmowę',
      action: () => options.onNewConversation?.(),
      category: 'navigation',
      aliases: ['/new', '/reset'],
      usage: '/clear'
    },
    {
      command: '/export',
      description: 'Eksportuj bieżącą rozmowę',
      action: () => options.onExport?.(),
      category: 'export',
      aliases: ['/download', '/save'],
      usage: '/export'
    },
    {
      command: '/saved',
      description: 'Pokaż zapisane odpowiedzi',
      action: () => options.onShowSavedResponses?.(),
      category: 'data',
      aliases: ['/bookmarks', '/favorites'],
      usage: '/saved'
    },
    {
      command: '/history',
      description: 'Pokaż historię rozmów',
      action: () => options.onShowHistory?.(),
      category: 'navigation',
      aliases: ['/hist', '/conversations'],
      usage: '/history'
    },
    {
      command: '/help',
      description: 'Pokaż pomoc i skróty klawiszowe',
      action: () => options.onHelp?.(),
      category: 'help',
      aliases: ['/h', '/?'],
      usage: '/help'
    }
  ];

  // Process input and detect slash commands
  const processInput = useCallback((input: string): { isCommand: boolean; processedInput: string } => {
    if (!options.enabled || !input.startsWith('/')) {
      setShowSuggestions(false);
      return { isCommand: false, processedInput: input };
    }

    const parts = input.trim().split(' ');
    const commandPart = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Find matching command
    const command = commands.find(cmd => 
      cmd.command === commandPart || 
      (cmd.aliases && cmd.aliases.includes(commandPart))
    );

    if (command) {
      // Execute command
      command.action(args);
      toast.success(`✨ Wykonano: ${command.description}`);
      
      return { isCommand: true, processedInput: '' };
    } else {
      // Show suggestions for partial matches
      const suggestions = commands.filter(cmd =>
        cmd.command.startsWith(commandPart) ||
        (cmd.aliases && cmd.aliases.some(alias => alias.startsWith(commandPart)))
      );

      setFilteredCommands(suggestions);
      setShowSuggestions(suggestions.length > 0);
      
      if (commandPart.length > 1 && suggestions.length === 0) {
        toast.warn(`❌ Nieznana komenda: ${commandPart}. Wpisz /help aby zobaczyć dostępne komendy.`);
      }

      return { isCommand: false, processedInput: input };
    }
  }, [options, commands]);

  // Handle input change for auto-complete
  const handleInputChange = useCallback((input: string) => {
    setCurrentInput(input);

    if (!input.startsWith('/') || input.length < 2) {
      setShowSuggestions(false);
      return;
    }

    const commandPart = input.split(' ')[0].toLowerCase();
    const suggestions = commands.filter(cmd =>
      cmd.command.startsWith(commandPart) ||
      (cmd.aliases && cmd.aliases.some(alias => alias.startsWith(commandPart)))
    );

    setFilteredCommands(suggestions);
    setShowSuggestions(suggestions.length > 0);
  }, [commands]);

  // Select suggestion
  const selectSuggestion = useCallback((command: SlashCommand): string => {
    setShowSuggestions(false);
    return command.command + ' ';
  }, []);

  // Get all commands by category
  const getCommandsByCategory = useCallback((category?: SlashCommand['category']) => {
    if (!category) return commands;
    return commands.filter(cmd => cmd.category === category);
  }, [commands]);

  // Get command help text
  const getHelpText = useCallback((): string => {
    const categories = ['navigation', 'export', 'data', 'help'] as const;
    
    let helpText = '🚀 PCZ Agent - Slash Commands:\n\n';
    
    categories.forEach(category => {
      const categoryCommands = getCommandsByCategory(category);
      if (categoryCommands.length > 0) {
        const categoryNames = {
          navigation: '🧭 Nawigacja',
          export: '📤 Export',
          data: '💾 Dane',
          help: '❓ Pomoc'
        };
        
        helpText += `${categoryNames[category]}:\n`;
        categoryCommands.forEach(cmd => {
          helpText += `  ${cmd.command} - ${cmd.description}\n`;
          if (cmd.aliases && cmd.aliases.length > 0) {
            helpText += `    Aliasy: ${cmd.aliases.join(', ')}\n`;
          }
        });
        helpText += '\n';
      }
    });

    helpText += '💡 Wskazówki:\n';
    helpText += '• Wpisz / aby zobaczyć dostępne komendy\n';
    helpText += '• Użyj Tab dla auto-complete\n';
    helpText += '• Dostępne są też skróty klawiszowe (Ctrl+N, Ctrl+E, etc.)\n';

    return helpText;
  }, [getCommandsByCategory]);

  return {
    // Core functions
    processInput,
    handleInputChange,
    selectSuggestion,
    
    // Data
    commands,
    filteredCommands,
    showSuggestions,
    
    // Helpers
    getCommandsByCategory,
    getHelpText,
    
    // State
    isEnabled: options.enabled !== false
  };
};