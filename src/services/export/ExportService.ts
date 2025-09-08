// Export Service - Professional Reporting Tools
// Sprint 3 - Professional Tools

import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import * as XLSX from 'xlsx';
import { ChatMessage } from '../ChatService';
import { ConversationMetadata } from '../ChatHistoryService';
import { FileMetadata } from '../../types/FileTypes';

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'xlsx';
  includeHeader?: boolean;
  includeTimestamps?: boolean;
  includeFileAttachments?: boolean;
  companyLogo?: string;
  watermark?: string;
  metadata?: {
    author?: string;
    title?: string;
    subject?: string;
    keywords?: string[];
  };
}

export interface ExportData {
  conversation: ConversationMetadata;
  messages: ChatMessage[];
  attachments?: FileMetadata[];
  exportOptions: ExportOptions;
}

export class ExportService {
  
  /**
   * Export conversation to specified format
   */
  async exportConversation(data: ExportData): Promise<void> {
    try {
      switch (data.exportOptions.format) {
        case 'pdf':
          await this.exportToPDF(data);
          break;
        case 'docx':
          await this.exportToWord(data);
          break;
        case 'xlsx':
          await this.exportToExcel(data);
          break;
        default:
          throw new Error(`Unsupported export format: ${data.exportOptions.format}`);
      }
      
      console.info(`Export completed: ${data.exportOptions.format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export to PDF format
   */
  private async exportToPDF(data: ExportData): Promise<void> {
    const doc = new jsPDF();
    let yPosition = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 6;

    // Header with logo
    if (data.exportOptions.includeHeader) {
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Politechnika Częstochowska', margin, yPosition);
      
      yPosition += 10;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('PCZ Agent - Raport Konwersacji', margin, yPosition);
      
      yPosition += 15;
    }

    // Conversation metadata
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rozmowa: ${data.conversation.title}`, margin, yPosition);
    yPosition += lineHeight + 2;
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${data.conversation.lastActivity.toLocaleDateString('pl-PL')}`, margin, yPosition);
    yPosition += lineHeight;
    
    doc.text(`Wiadomości: ${data.conversation.messageCount}`, margin, yPosition);
    yPosition += lineHeight;
    
    if (data.conversation.agentType) {
      doc.text(`Expert: ${data.conversation.agentType}`, margin, yPosition);
      yPosition += lineHeight;
    }
    
    yPosition += 10;

    // Messages
    data.messages.forEach((message, index) => {
      // Check for page break
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = margin;
      }

      // Message header
      doc.setFont('helvetica', 'bold');
      const sender = message.role === 'user' ? 'Użytkownik' : 'Agent';
      const timestamp = data.exportOptions.includeTimestamps 
        ? ` (${message.timestamp.toLocaleTimeString('pl-PL')})`
        : '';
      
      doc.text(`${sender}${timestamp}:`, margin, yPosition);
      yPosition += lineHeight + 2;

      // Message content
      doc.setFont('helvetica', 'normal');
      const content = message.content.substring(0, 1000); // Truncate very long messages
      const lines = doc.splitTextToSize(content, doc.internal.pageSize.width - 2 * margin);
      
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
      
      yPosition += 5; // Space between messages
    });

    // Attachments summary
    if (data.attachments && data.attachments.length > 0 && data.exportOptions.includeFileAttachments) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }

      yPosition += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Załączniki:', margin, yPosition);
      yPosition += lineHeight + 2;

      doc.setFont('helvetica', 'normal');
      data.attachments.forEach(file => {
        doc.text(`• ${file.filename} (${this.formatFileSize(file.size)})`, margin + 5, yPosition);
        yPosition += lineHeight;
      });
    }

    // Footer
    if (data.exportOptions.watermark) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(data.exportOptions.watermark, margin, pageHeight - 10);
    }

    // Save file
    const filename = `${data.conversation.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }

  /**
   * Export to Word format  
   */
  private async exportToWord(data: ExportData): Promise<void> {
    const children: any[] = [];

    // Header
    if (data.exportOptions.includeHeader) {
      children.push(
        new Paragraph({
          text: 'Politechnika Częstochowska',
          heading: HeadingLevel.HEADING_1
        }),
        new Paragraph({
          text: 'PCZ Agent - Raport Konwersacji',
          heading: HeadingLevel.HEADING_2
        }),
        new Paragraph({ text: '' }) // Empty line
      );
    }

    // Conversation metadata
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Rozmowa: ', bold: true }),
          new TextRun({ text: data.conversation.title })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Data: ', bold: true }),
          new TextRun({ text: data.conversation.lastActivity.toLocaleDateString('pl-PL') })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Wiadomości: ', bold: true }),
          new TextRun({ text: data.conversation.messageCount.toString() })
        ]
      })
    );

    if (data.conversation.agentType) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Expert: ', bold: true }),
            new TextRun({ text: data.conversation.agentType })
          ]
        })
      );
    }

    children.push(new Paragraph({ text: '' })); // Empty line

    // Messages
    data.messages.forEach((message) => {
      const sender = message.role === 'user' ? 'Użytkownik' : 'Agent';
      const timestamp = data.exportOptions.includeTimestamps 
        ? ` (${message.timestamp.toLocaleTimeString('pl-PL')})`
        : '';

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${sender}${timestamp}:`, bold: true })
          ]
        }),
        new Paragraph({
          text: message.content,
          spacing: { after: 200 }
        })
      );
    });

    // Attachments
    if (data.attachments && data.attachments.length > 0 && data.exportOptions.includeFileAttachments) {
      children.push(
        new Paragraph({ text: '' }),
        new Paragraph({
          text: 'Załączniki:',
          heading: HeadingLevel.HEADING_3
        })
      );

      data.attachments.forEach(file => {
        children.push(
          new Paragraph({
            text: `• ${file.filename} (${this.formatFileSize(file.size)})`
          })
        );
      });
    }

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children
      }],
      creator: data.exportOptions.metadata?.author || 'PCZ Agent',
      title: data.exportOptions.metadata?.title || data.conversation.title,
      description: data.exportOptions.metadata?.subject || 'Conversation export from PCZ Agent'
    });

    // Generate and download
    const blob = await Packer.toBlob(doc);
    this.downloadBlob(blob, `${data.conversation.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.docx`);
  }

  /**
   * Export to Excel format
   */
  private async exportToExcel(data: ExportData): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Conversation sheet
    const conversationData = [
      ['Rozmowa', data.conversation.title],
      ['Data', data.conversation.lastActivity.toLocaleDateString('pl-PL')],
      ['Wiadomości', data.conversation.messageCount],
      ['Expert', data.conversation.agentType || 'N/A'],
      [''], // Empty row
      ['Nadawca', 'Wiadomość', 'Czas']
    ];

    // Add messages
    data.messages.forEach(message => {
      conversationData.push([
        message.role === 'user' ? 'Użytkownik' : 'Agent',
        message.content.substring(0, 500), // Truncate for Excel
        data.exportOptions.includeTimestamps ? message.timestamp.toLocaleTimeString('pl-PL') : ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(conversationData);
    
    // Set column widths
    ws['!cols'] = [
      { width: 15 },
      { width: 80 },
      { width: 12 }
    ];

    XLSX.utils.book_append_sheet(workbook, ws, 'Konwersacja');

    // Attachments sheet
    if (data.attachments && data.attachments.length > 0 && data.exportOptions.includeFileAttachments) {
      const attachmentData = [
        ['Nazwa pliku', 'Rozmiar', 'Typ', 'Data przesłania', 'Status'],
        ...data.attachments.map(file => [
          file.filename,
          this.formatFileSize(file.size),
          file.mimeType,
          file.uploadedAt.toLocaleDateString('pl-PL'),
          file.status
        ])
      ];

      const attachmentWs = XLSX.utils.aoa_to_sheet(attachmentData);
      attachmentWs['!cols'] = [
        { width: 30 },
        { width: 12 },
        { width: 20 },
        { width: 15 },
        { width: 10 }
      ];

      XLSX.utils.book_append_sheet(workbook, attachmentWs, 'Załączniki');
    }

    // Save file
    const filename = `${data.conversation.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Export multiple conversations (batch)
   */
  async exportMultipleConversations(
    conversations: ConversationMetadata[],
    messages: Record<string, ChatMessage[]>,
    format: ExportOptions['format']
  ): Promise<void> {
    if (format === 'xlsx') {
      await this.exportMultipleToExcel(conversations, messages);
    } else {
      // For PDF/Word, create separate files
      for (const conversation of conversations) {
        const conversationMessages = messages[conversation.threadId] || [];
        await this.exportConversation({
          conversation,
          messages: conversationMessages,
          exportOptions: { format, includeHeader: true, includeTimestamps: true }
        });
      }
    }
  }

  /**
   * Export multiple conversations to Excel (all in one file)
   */
  private async exportMultipleToExcel(
    conversations: ConversationMetadata[],
    messages: Record<string, ChatMessage[]>
  ): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Podsumowanie eksportu'],
      ['Data eksportu', new Date().toLocaleString('pl-PL')],
      ['Liczba rozmów', conversations.length],
      ['Łączna liczba wiadomości', Object.values(messages).flat().length],
      [''],
      ['Rozmowa', 'Wiadomości', 'Ostatnia aktywność', 'Expert']
    ];

    conversations.forEach(conv => {
      summaryData.push([
        conv.title,
        conv.messageCount,
        conv.lastActivity.toLocaleDateString('pl-PL'),
        conv.agentType || 'N/A'
      ]);
    });

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWs, 'Podsumowanie');

    // Individual conversation sheets
    conversations.forEach((conv, index) => {
      const conversationMessages = messages[conv.threadId] || [];
      const sheetData = [
        ['Nadawca', 'Wiadomość', 'Czas'],
        ...conversationMessages.map(msg => [
          msg.role === 'user' ? 'Użytkownik' : 'Agent',
          msg.content.substring(0, 1000),
          msg.timestamp.toLocaleString('pl-PL')
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws['!cols'] = [
        { width: 15 },
        { width: 80 },
        { width: 20 }
      ];

      const sheetName = `Rozmowa_${index + 1}`.substring(0, 31); // Excel limit
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    });

    // Save file
    const filename = `PCZ_Agent_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Generate email-ready export
   */
  async exportForEmail(data: ExportData): Promise<{ 
    subject: string; 
    body: string; 
    attachmentName: string 
  }> {
    const subject = `PCZ Agent - Raport: ${data.conversation.title}`;
    
    const body = `
Dzień dobry,

W załączniku raport z rozmowy z PCZ Agent:

Tytuł: ${data.conversation.title}
Data: ${data.conversation.lastActivity.toLocaleDateString('pl-PL')}
Liczba wiadomości: ${data.conversation.messageCount}
Expert: ${data.conversation.agentType || 'Multi-Agent'}

Raport został wygenerowany automatycznie przez PCZ Agent.

Pozdrawiam,
System PCZ Agent
    `.trim();

    const attachmentName = `${data.conversation.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.${data.exportOptions.format}`;

    return { subject, body, attachmentName };
  }

  /**
   * Check export feasibility
   */
  checkExportFeasibility(data: ExportData): { 
    canExport: boolean; 
    warnings: string[]; 
    estimatedSize: string;
  } {
    const warnings: string[] = [];
    let estimatedSize = 0;

    // Check message count
    if (data.messages.length > 1000) {
      warnings.push('Duża liczba wiadomości może wpłynąć na jakość eksportu');
    }

    // Estimate size
    const textSize = data.messages.reduce((size, msg) => size + msg.content.length, 0);
    estimatedSize = Math.ceil(textSize / 1024); // Rough KB estimate

    if (estimatedSize > 5000) { // > 5MB
      warnings.push('Duży rozmiar eksportu - może zająć więcej czasu');
    }

    // Check for very long messages
    const hasLongMessages = data.messages.some(msg => msg.content.length > 10000);
    if (hasLongMessages) {
      warnings.push('Niektóre wiadomości są bardzo długie - mogą być skrócone');
    }

    return {
      canExport: true,
      warnings,
      estimatedSize: `~${estimatedSize}KB`
    };
  }

  /**
   * Format file size helper
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Download blob helper
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get supported export formats
   */
  static getSupportedFormats(): Array<{
    format: ExportOptions['format'];
    name: string;
    description: string;
    icon: string;
  }> {
    return [
      {
        format: 'pdf',
        name: 'PDF',
        description: 'Portable Document Format - idealny dla raportów',
        icon: '📄'
      },
      {
        format: 'docx',
        name: 'Word',
        description: 'Microsoft Word - edytowalny dokument',
        icon: '📝'
      },
      {
        format: 'xlsx',
        name: 'Excel',
        description: 'Microsoft Excel - dane tabelaryczne', 
        icon: '📊'
      }
    ];
  }
}

// Export singleton instance
export const exportService = new ExportService();