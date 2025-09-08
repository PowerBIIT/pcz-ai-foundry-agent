// Citations Parser for Agent Responses
// Sprint 2 - Citations Display System

export interface Citation {
  id: string;
  type: 'document' | 'url' | 'regulation' | 'reference';
  title: string;
  source: string;
  page?: string;
  url?: string;
  excerpt?: string;
  position: { start: number; end: number; };
}

export interface ParsedContent {
  content: string;           // Content with citation placeholders replaced
  citations: Citation[];     // Array of found citations
  hasCitations: boolean;     // Quick check if citations exist
}

export class CitationsParser {
  private static readonly CITATION_PATTERNS = [
    // Przesłany dokument pattern
    /Źródła:\s*-?\s*Przesłany dokument\s*[""]([^"""]+)[""]([^.\n]*)/gi,
    
    // Document with page pattern  
    /\[([^,\]]+),\s*str\.?\s*(\d+)\]/gi,
    
    // URL pattern
    /\[(https?:\/\/[^\]]+)\]/gi,
    
    // Regulation pattern
    /(ustawa|rozporządzenie|zarządzenie)[^(]*\([^)]+\)/gi,
    
    // General document reference
    /\[([^[\]]+\.(?:pdf|docx?|xlsx?|txt))[^\]]*\]/gi,
    
    // Source line pattern
    /Źródła:\s*\n?\s*-\s*([^\n]+)/gi
  ];

  /**
   * Parse agent response and extract citations
   */
  static parseResponse(content: string): ParsedContent {
    let processedContent = content;
    const citations: Citation[] = [];
    let citationId = 1;

    // Process each citation pattern
    this.CITATION_PATTERNS.forEach((pattern, patternIndex) => {
      let match;
      pattern.lastIndex = 0; // Reset regex state
      
      while ((match = pattern.exec(content)) !== null) {
        const citation = this.createCitationFromMatch(
          match, 
          patternIndex, 
          citationId.toString()
        );
        
        if (citation) {
          citations.push(citation);
          
          // Replace in content with clickable link
          const placeholder = `[${citationId}]`;
          const matchText = match[0];
          
          processedContent = processedContent.replace(
            matchText, 
            `${matchText} ${placeholder}`
          );
          
          citationId++;
        }
      }
    });

    // Clean up duplicate citations
    const uniqueCitations = this.deduplicateCitations(citations);

    return {
      content: processedContent,
      citations: uniqueCitations,
      hasCitations: uniqueCitations.length > 0
    };
  }

  /**
   * Create citation object from regex match
   */
  private static createCitationFromMatch(
    match: RegExpExecArray, 
    patternIndex: number, 
    id: string
  ): Citation | null {
    const fullMatch = match[0];
    const position = { start: match.index, end: match.index + fullMatch.length };

    switch (patternIndex) {
      case 0: // Przesłany dokument
        return {
          id,
          type: 'document',
          title: match[1] || 'Przesłany dokument',
          source: 'Uploaded file',
          position,
          excerpt: match[2] ? match[2].trim() : undefined
        };

      case 1: // Document with page
        return {
          id,
          type: 'document', 
          title: match[1],
          source: match[1],
          page: match[2],
          position
        };

      case 2: // URL
        return {
          id,
          type: 'url',
          title: this.extractDomainFromUrl(match[1]),
          source: match[1],
          url: match[1],
          position
        };

      case 3: // Regulation
        return {
          id,
          type: 'regulation',
          title: fullMatch,
          source: 'Official regulation',
          position
        };

      case 4: // General document
        return {
          id,
          type: 'document',
          title: match[1],
          source: match[1],
          position
        };

      case 5: // Source line
        return {
          id,
          type: 'reference',
          title: match[1],
          source: 'Reference',
          position
        };

      default:
        return null;
    }
  }

  /**
   * Remove duplicate citations
   */
  private static deduplicateCitations(citations: Citation[]): Citation[] {
    const seen = new Set<string>();
    const unique: Citation[] = [];

    citations.forEach(citation => {
      const key = `${citation.type}-${citation.title}-${citation.source}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(citation);
      }
    });

    return unique;
  }

  /**
   * Extract domain from URL for display
   */
  private static extractDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'External link';
    }
  }

  /**
   * Get icon for citation type
   */
  static getCitationIcon(type: Citation['type']): string {
    const iconMap = {
      document: '📄',
      url: '🔗',
      regulation: '⚖️',
      reference: '📚'
    };
    return iconMap[type] || '📎';
  }

  /**
   * Get color for citation type
   */
  static getCitationColor(type: Citation['type']): string {
    const colorMap = {
      document: '#2196f3',
      url: '#4caf50', 
      regulation: '#ff9800',
      reference: '#9c27b0'
    };
    return colorMap[type] || '#666';
  }

  /**
   * Format citation for display
   */
  static formatCitation(citation: Citation): string {
    switch (citation.type) {
      case 'document':
        return citation.page 
          ? `${citation.title}, str. ${citation.page}`
          : citation.title;
          
      case 'url':
        return `${citation.title} (${citation.url})`;
        
      case 'regulation':
        return citation.title;
        
      case 'reference':
        return citation.title;
        
      default:
        return citation.title;
    }
  }

  /**
   * Highlight citations in text content
   */
  static highlightCitations(content: string, citations: Citation[]): string {
    let highlightedContent = content;

    citations.forEach((citation, index) => {
      // Look for citation number placeholders
      const placeholder = `[${index + 1}]`;
      const highlightedPlaceholder = `<span class="citation-link" data-citation-id="${citation.id}" style="color: ${this.getCitationColor(citation.type)}; cursor: pointer; font-weight: bold;">${placeholder}</span>`;
      
      highlightedContent = highlightedContent.replace(placeholder, highlightedPlaceholder);
    });

    return highlightedContent;
  }

  /**
   * Extract citations from Azure AI Foundry annotations format
   */
  static parseAzureAnnotations(content: string, annotations?: any[]): ParsedContent {
    if (!annotations || annotations.length === 0) {
      // Fallback to pattern-based parsing
      return this.parseResponse(content);
    }

    let processedContent = content;
    const citations: Citation[] = [];

    annotations.forEach((annotation, index) => {
      if (annotation.type === 'file_citation') {
        const citation: Citation = {
          id: (index + 1).toString(),
          type: 'document',
          title: annotation.file_citation.file_id || 'Unknown document',
          source: annotation.file_citation.file_id || '',
          excerpt: annotation.file_citation.quote,
          position: { 
            start: annotation.start_index || 0, 
            end: annotation.end_index || 0 
          }
        };

        citations.push(citation);

        // Replace annotation text with citation link
        if (annotation.text) {
          const placeholder = `[${index + 1}]`;
          processedContent = processedContent.replace(
            annotation.text,
            `${annotation.text} ${placeholder}`
          );
        }
      }
    });

    return {
      content: processedContent,
      citations,
      hasCitations: citations.length > 0
    };
  }
}