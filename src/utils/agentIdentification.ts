// Agent Identification and Visual Indicators
// Sprint 2B - Visual Indicators Implementation - ENHANCED

export interface AgentInfo {
  name: string;
  iconName: string; // Changed from emoji to iconName
  color: string;
  description: string;
  category: 'financial' | 'legal' | 'audit' | 'strategic';
}

export class AgentIdentificationService {
  
  // Agent mapping based on Connected Agents from CLAUDE.md - NO EMOJI VERSION
  private static readonly AGENTS: Record<string, AgentInfo> = {
    'Audytor_Tool': {
      name: 'Audytor Wewnętrzny',
      iconName: 'Audit',
      color: '#dc3545',
      description: 'Kontrola wewnętrzna i wykrywanie nieprawidłowości',
      category: 'audit'
    },
    'Ekspert_Zamowien_Tool': {
      name: 'Ekspert Zamówień Publicznych', 
      iconName: 'Procurement',
      color: '#0066cc',
      description: 'Zamówienia publiczne i procedury PZP',
      category: 'legal'
    },
    'Ekspert_Budzetu_Tool': {
      name: 'Ekspert Budżetu',
      iconName: 'Budget',
      color: '#28a745',
      description: 'Planowanie budżetowe i analiza finansowa',
      category: 'financial'
    },
    'Ekspert_Rachunkowosci_Tool': {
      name: 'Ekspert Rachunkowości',
      iconName: 'Accounting',
      color: '#6f42c1',
      description: 'Księgowość i ewidencja finansowa',
      category: 'financial'
    },
    'Ekspert_Plynnosci_Tool': {
      name: 'Ekspert Płynności Finansowej',
      iconName: 'Liquidity',
      color: '#17a2b8',
      description: 'Cash flow i płynność finansowa',
      category: 'financial'
    },
    'Ekspert_Majatku_Tool': {
      name: 'Ekspert Majątku',
      iconName: 'Assets',
      color: '#fd7e14',
      description: 'Środki trwałe i zarządzanie majątkiem',
      category: 'financial'
    },
    'Ekspert_Zarzadzen_Tool': {
      name: 'Ekspert Zarządzeń',
      iconName: 'Regulations',
      color: '#6c757d',
      description: 'Procedury i zarządzenia wewnętrzne',
      category: 'legal'
    },
    'Prawnik_Compliance_Tool': {
      name: 'Prawnik Compliance',
      iconName: 'Legal', 
      color: '#343a40',
      description: 'Aspekty prawne i zgodność z przepisami',
      category: 'legal'
    },
    'Strateg_Tool': {
      name: 'Strateg Finansowy',
      iconName: 'Strategy',
      color: '#e83e8c',
      description: 'Strategia finansowa i planowanie długoterminowe',
      category: 'strategic'
    },
    'Mentor_Tool': {
      name: 'Mentor CFO',
      iconName: 'Mentor',
      color: '#20c997',
      description: 'Onboarding i rozwój kompetencji CFO',
      category: 'strategic'
    }
  };

  /**
   * Get agent info from tool name or response text
   */
  static getAgentInfo(input: string): AgentInfo | null {
    // Try exact tool name match first
    const directMatch = this.AGENTS[input];
    if (directMatch) {
      return directMatch;
    }

    // Try to detect from response text
    const detectedAgent = this.detectAgentFromText(input);
    return detectedAgent ? this.AGENTS[detectedAgent] : null;
  }

  /**
   * Detect agent from response text
   */
  private static detectAgentFromText(text: string): string | null {
    // Updated patterns to detect both emoji (legacy) and professional names
    const patterns = [
      { pattern: /(?:🔍\s*)?audytor|audit/i, agent: 'Audytor_Tool' },
      { pattern: /(?:🔍\s*)?ekspert\s*zamów|procurement/i, agent: 'Ekspert_Zamowien_Tool' },
      { pattern: /(?:🔍\s*)?ekspert\s*budż|budget/i, agent: 'Ekspert_Budzetu_Tool' },
      { pattern: /(?:🔍\s*)?ekspert\s*rachunk|accounting/i, agent: 'Ekspert_Rachunkowosci_Tool' },
      { pattern: /(?:🔍\s*)?ekspert\s*płynn|liquidity/i, agent: 'Ekspert_Plynnosci_Tool' },
      { pattern: /(?:🔍\s*)?ekspert\s*majątk|assets/i, agent: 'Ekspert_Majatku_Tool' },
      { pattern: /(?:🔍\s*)?ekspert\s*zarządz|regulations/i, agent: 'Ekspert_Zarzadzen_Tool' },
      { pattern: /(?:🔍\s*)?prawnik|legal|compliance/i, agent: 'Prawnik_Compliance_Tool' },
      { pattern: /(?:🔍\s*)?strateg|strategy/i, agent: 'Strateg_Tool' },
      { pattern: /(?:🔍\s*)?mentor/i, agent: 'Mentor_Tool' }
    ];

    for (const { pattern, agent } of patterns) {
      if (pattern.test(text)) {
        return agent;
      }
    }

    return null;
  }

  /**
   * Get all agents by category
   */
  static getAgentsByCategory(category?: AgentInfo['category']): AgentInfo[] {
    const allAgents = Object.values(this.AGENTS);
    
    if (!category) {
      return allAgents;
    }

    return allAgents.filter(agent => agent.category === category);
  }

  /**
   * Get agent avatar component props
   */
  static getAgentAvatarProps(agentInfo: AgentInfo) {
    return {
      iconName: agentInfo.iconName,
      name: agentInfo.name,
      color: agentInfo.color,
      category: agentInfo.category,
      description: agentInfo.description
    };
  }

  /**
   * Generate agent status message
   */
  static generateStatusMessage(agentInfo: AgentInfo, status: 'thinking' | 'responding' | 'complete'): string {
    const statusMessages = {
      thinking: `${agentInfo.name} analizuje...`,
      responding: `${agentInfo.name} odpowiada...`,
      complete: `${agentInfo.name} ukończył analizę`
    };

    return statusMessages[status];
  }

  /**
   * Check if text contains agent identification
   */
  static hasAgentIdentification(text: string): boolean {
    // Updated to detect both emoji and professional patterns
    return /(?:🔍\s*\w+.*odpowiada|\w+\s+odpowiada|ekspert\s+\w+)/i.test(text);
  }

  /**
   * Extract agent name from response
   */
  static extractAgentName(text: string): string | null {
    // Try emoji pattern first (legacy support)
    let match = text.match(/🔍\s*(.+?)\s+odpowiada/i);
    if (match) return match[1].trim();
    
    // Try professional pattern
    match = text.match(/(\w+\s+\w+)\s+odpowiada/i);
    if (match) return match[1].trim();
    
    // Try expert pattern
    match = text.match(/(ekspert\s+\w+)/i);
    if (match) return match[1].trim();
    
    return null;
  }
}