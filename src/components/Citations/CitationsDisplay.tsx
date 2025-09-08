// Citations Display Component
// Sprint 2 - Citations Display System

import React, { useState } from 'react';
import { Citation, CitationsParser, ParsedContent } from '../../utils/citationsParser';

interface CitationsDisplayProps {
  citations: Citation[];
  onCitationClick?: (citation: Citation) => void;
  compact?: boolean;
}

export const CitationsDisplay: React.FC<CitationsDisplayProps> = ({
  citations,
  onCitationClick,
  compact = false
}) => {
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);

  if (citations.length === 0) {
    return null;
  }

  const handleCitationClick = (citation: Citation) => {
    // Toggle expanded state
    setExpandedCitation(prev => 
      prev === citation.id ? null : citation.id
    );
    
    // Call external handler
    onCitationClick?.(citation);
  };

  return (
    <div className={`citations-container ${compact ? 'compact' : ''}`}>
      <div className="citations-header">
        <h4>📚 Źródła ({citations.length})</h4>
      </div>
      
      <div className="citations-list">
        {citations.map((citation, index) => (
          <div 
            key={citation.id}
            className={`citation-item ${citation.type} ${expandedCitation === citation.id ? 'expanded' : ''}`}
            onClick={() => handleCitationClick(citation)}
          >
            <div className="citation-header">
              <span className="citation-number">[{index + 1}]</span>
              <span className="citation-icon">
                {CitationsParser.getCitationIcon(citation.type)}
              </span>
              <span className="citation-title">
                {CitationsParser.formatCitation(citation)}
              </span>
              <span className="citation-expand">
                {expandedCitation === citation.id ? '▼' : '▶'}
              </span>
            </div>
            
            {expandedCitation === citation.id && (
              <div className="citation-details">
                <div className="citation-meta">
                  <strong>Typ:</strong> {citation.type === 'document' ? 'Dokument' : 
                                        citation.type === 'url' ? 'Link' :
                                        citation.type === 'regulation' ? 'Przepis prawny' : 'Referencja'}
                </div>
                
                {citation.source && (
                  <div className="citation-source">
                    <strong>Źródło:</strong> {citation.source}
                  </div>
                )}
                
                {citation.page && (
                  <div className="citation-page">
                    <strong>Strona:</strong> {citation.page}
                  </div>
                )}
                
                {citation.excerpt && (
                  <div className="citation-excerpt">
                    <strong>Fragment:</strong>
                    <blockquote>"{citation.excerpt}"</blockquote>
                  </div>
                )}
                
                {citation.url && (
                  <div className="citation-url">
                    <strong>URL:</strong> 
                    <a 
                      href={citation.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="external-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {citation.url}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {!compact && (
        <div className="citations-footer">
          <small>
            💡 Kliknij na cytowanie aby zobaczyć szczegóły
          </small>
        </div>
      )}
    </div>
  );
};

// Enhanced Message Component with Citations
interface MessageWithCitationsProps {
  content: string;
  timestamp: Date;
  role: 'user' | 'assistant';
  userId?: string;
  showCitations?: boolean;
}

export const MessageWithCitations: React.FC<MessageWithCitationsProps> = ({
  content,
  timestamp,
  role,
  userId,
  showCitations = true
}) => {
  const [parsedContent, setParsedContent] = useState<ParsedContent | null>(null);
  const [showCitationsPanel, setShowCitationsPanel] = useState(false);

  React.useEffect(() => {
    if (role === 'assistant' && showCitations) {
      const parsed = CitationsParser.parseResponse(content);
      setParsedContent(parsed);
    }
  }, [content, role, showCitations]);

  const handleCitationClick = (citation: Citation) => {
    console.info('Citation clicked:', citation);
    
    // Handle different citation types
    switch (citation.type) {
      case 'url':
        if (citation.url) {
          window.open(citation.url, '_blank', 'noopener,noreferrer');
        }
        break;
        
      case 'document':
        // Could integrate with file viewer in future
        console.info('Document citation:', citation.title);
        break;
        
      case 'regulation':
        // Could search for regulation online
        console.info('Legal regulation:', citation.title);
        break;
        
      default:
        console.info('General citation:', citation);
    }
  };

  const displayContent = parsedContent ? parsedContent.content : content;
  const citations = parsedContent ? parsedContent.citations : [];

  return (
    <div className={`message ${role} ${citations.length > 0 ? 'has-citations' : ''}`}>
      <div className="message-content">
        <strong>{role === 'user' ? 'Ty' : 'Agent'}:</strong>
        
        <div 
          className="message-text"
          dangerouslySetInnerHTML={{
            __html: CitationsParser.highlightCitations(displayContent, citations)
          }}
        />
        
        <div className="message-meta">
          <small>{timestamp.toLocaleTimeString()}</small>
          
          {citations.length > 0 && (
            <button
              className="citations-toggle"
              onClick={() => setShowCitationsPanel(!showCitationsPanel)}
              title={`${citations.length} źródeł`}
            >
              📚 {citations.length}
            </button>
          )}
        </div>
        
        {showCitationsPanel && citations.length > 0 && (
          <CitationsDisplay 
            citations={citations}
            onCitationClick={handleCitationClick}
            compact={true}
          />
        )}
      </div>
    </div>
  );
};

export default CitationsDisplay;