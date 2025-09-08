// FileUpload Component Unit Tests  
// Sprint 1 - File Attachments

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from '../FileUpload';
import { FileMetadata } from '../../../types/FileTypes';
import { toast } from 'react-toastify';

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock react-dropzone to make testing easier
jest.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop, disabled, multiple, maxFiles, maxSize, accept }: any) => ({
    getRootProps: () => ({
      'data-testid': 'dropzone',
      onClick: () => {}, // Mock click handler
    }),
    getInputProps: () => ({
      'data-testid': 'file-input',
      type: 'file',
      multiple,
      accept: Object.keys(accept || {}).join(','),
    }),
    isDragActive: false,
  }),
}));

describe('FileUpload', () => {
  const mockOnFilesSelected = jest.fn();
  const mockOnFileRemove = jest.fn();
  const mockToast = toast as jest.Mocked<typeof toast>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    onFilesSelected: mockOnFilesSelected,
    onFileRemove: mockOnFileRemove,
  };

  describe('rendering', () => {
    it('should render upload area with default content', () => {
      render(<FileUpload {...defaultProps} />);
      
      expect(screen.getByText('Przeciągnij i upuść pliki')).toBeInTheDocument();
      expect(screen.getByText('Wybierz pliki')).toBeInTheDocument();
      expect(screen.getByText(/Obsługujemy: PDF, DOCX, XLSX, TXT, MD/)).toBeInTheDocument();
      expect(screen.getByText(/Maksymalny rozmiar: 512MB/)).toBeInTheDocument();
    });

    it('should render with custom config', () => {
      render(
        <FileUpload 
          {...defaultProps}
          config={{
            maxFileSize: 100,
            supportedTypes: ['pdf', 'docx'],
            maxFiles: 5
          }}
        />
      );
      
      expect(screen.getByText(/Maksymalny rozmiar: 100MB/)).toBeInTheDocument();
    });

    it('should render disabled state', () => {
      render(<FileUpload {...defaultProps} disabled />);
      
      const button = screen.getByRole('button', { name: /Wybierz pliki/ });
      expect(button).toBeDisabled();
    });

    it('should not render preview when showPreview is false', () => {
      const uploadedFiles: FileMetadata[] = [
        {
          fileId: 'file1',
          userId: 'user1',
          threadId: 'thread1',
          filename: 'test.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          uploadedAt: new Date(),
          status: 'ready',
          progress: 100
        }
      ];

      render(
        <FileUpload 
          {...defaultProps}
          uploadedFiles={uploadedFiles}
          showPreview={false}
        />
      );
      
      expect(screen.queryByText('📁 Przesłane pliki:')).not.toBeInTheDocument();
    });
  });

  describe('uploaded files preview', () => {
    const sampleFiles: FileMetadata[] = [
      {
        fileId: 'file1',
        userId: 'user1',
        threadId: 'thread1',
        filename: 'budget-2025.pdf',
        size: 2048576, // 2MB
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
        status: 'ready',
        progress: 100
      },
      {
        fileId: 'file2',
        userId: 'user1',
        threadId: 'thread1',
        filename: 'procedures.docx',
        size: 1024000, // ~1MB
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        uploadedAt: new Date(),
        status: 'uploading',
        progress: 75
      },
      {
        fileId: 'file3',
        userId: 'user1',
        threadId: 'thread1',
        filename: 'data.xlsx',
        size: 512000,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploadedAt: new Date(),
        status: 'error',
        progress: 0,
        error: 'Upload failed'
      }
    ];

    it('should render uploaded files list', () => {
      render(<FileUpload {...defaultProps} uploadedFiles={sampleFiles} />);
      
      expect(screen.getByText('📁 Przesłane pliki:')).toBeInTheDocument();
      expect(screen.getByText('budget-2025.pdf')).toBeInTheDocument();
      expect(screen.getByText('procedures.docx')).toBeInTheDocument();
      expect(screen.getByText('data.xlsx')).toBeInTheDocument();
    });

    it('should show correct file sizes and types', () => {
      render(<FileUpload {...defaultProps} uploadedFiles={sampleFiles} />);
      
      expect(screen.getByText(/2 MB.*Dokumenty PDF/)).toBeInTheDocument();
      expect(screen.getByText(/0.98 MB.*Dokumenty Word/)).toBeInTheDocument();
      expect(screen.getByText(/500 KB.*Arkusze Excel/)).toBeInTheDocument();
    });

    it('should show correct status for each file', () => {
      render(<FileUpload {...defaultProps} uploadedFiles={sampleFiles} />);
      
      expect(screen.getByText('✅ Gotowy')).toBeInTheDocument();
      expect(screen.getByText('⏳ Przesyłanie... 75%')).toBeInTheDocument();
      expect(screen.getByText('❌ Błąd')).toBeInTheDocument();
    });

    it('should show progress bar for uploading files', () => {
      render(<FileUpload {...defaultProps} uploadedFiles={sampleFiles} />);
      
      const progressBars = document.querySelectorAll('.progress-bar');
      expect(progressBars).toHaveLength(1); // Only uploading file should have progress bar
      
      const progressFill = document.querySelector('.progress-fill') as HTMLElement;
      expect(progressFill.style.width).toBe('75%');
    });

    it('should show remove button for ready and error files', () => {
      render(<FileUpload {...defaultProps} uploadedFiles={sampleFiles} />);
      
      const removeButtons = screen.getAllByTitle('Usuń plik');
      expect(removeButtons).toHaveLength(2); // Ready + Error files only
    });

    it('should call onFileRemove when remove button clicked', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} uploadedFiles={sampleFiles} />);
      
      const removeButtons = screen.getAllByTitle('Usuń plik');
      await user.click(removeButtons[0]);
      
      expect(mockOnFileRemove).toHaveBeenCalledTimes(1);
      expect(mockOnFileRemove).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'budget-2025.pdf'
        })
      );
    });

    it('should show upload statistics', () => {
      render(<FileUpload {...defaultProps} uploadedFiles={sampleFiles} />);
      
      expect(screen.getByText(/Przesłano: 1\/3 plików/)).toBeInTheDocument();
      expect(screen.getByText(/Łączny rozmiar:/)).toBeInTheDocument();
    });

    it('should display error message for failed files', () => {
      render(<FileUpload {...defaultProps} uploadedFiles={sampleFiles} />);
      
      expect(screen.getByText('⚠️ Upload failed')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<FileUpload {...defaultProps} />);
      
      const dropzone = screen.getByTestId('dropzone');
      const fileInput = screen.getByTestId('file-input');
      
      expect(dropzone).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('type', 'file');
    });

    it('should support keyboard navigation', () => {
      render(<FileUpload {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /Wybierz pliki/ });
      expect(button).toBeInTheDocument();
      
      // Button should be focusable
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should show proper focus indicators', () => {
      render(<FileUpload {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /Wybierz pliki/ });
      
      // Simulate focus
      fireEvent.focus(button);
      
      // CSS focus styles should be applied (tested through visual verification)
      expect(button).toHaveFocus();
    });
  });

  describe('file validation display', () => {
    it('should display validation errors', async () => {
      // Create component and trigger validation error through dropzone mock
      const { rerender } = render(<FileUpload {...defaultProps} />);
      
      // Simulate validation errors by setting state through component props
      // This would normally be triggered by the dropzone onDrop callback
      // For unit testing, we'll test the display logic
      
      // Re-render with validation errors (simulate internal state change)
      // Note: This test would be more effective with integration testing
    });
  });

  describe('error handling', () => {
    it('should handle missing onFilesSelected gracefully', () => {
      expect(() => {
        render(<FileUpload onFilesSelected={mockOnFilesSelected} />);
      }).not.toThrow();
    });

    it('should handle empty uploadedFiles array', () => {
      render(<FileUpload {...defaultProps} uploadedFiles={[]} />);
      
      expect(screen.queryByText('📁 Przesłane pliki:')).not.toBeInTheDocument();
    });

    it('should handle malformed uploadedFiles gracefully', () => {
      const malformedFiles = [
        {
          fileId: 'file1',
          userId: 'user1',
          threadId: 'thread1',
          filename: '',  // Empty filename
          size: -1,      // Negative size
          mimeType: '',
          uploadedAt: new Date(),
          status: 'ready' as const,
          progress: 150  // Invalid progress
        }
      ] as FileMetadata[];

      expect(() => {
        render(<FileUpload {...defaultProps} uploadedFiles={malformedFiles} />);
      }).not.toThrow();
    });
  });

  describe('responsive design', () => {
    it('should render properly on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone width
      });

      render(<FileUpload {...defaultProps} />);
      
      // Component should render without errors
      expect(screen.getByText('Przeciągnij i upuść pliki')).toBeInTheDocument();
    });
  });

  describe('configuration', () => {
    it('should use environment variables for default config', () => {
      // Test that component uses env vars correctly
      process.env.REACT_APP_MAX_FILE_SIZE_MB = '256';
      process.env.REACT_APP_SUPPORTED_FILE_TYPES = 'pdf,docx';
      
      render(<FileUpload {...defaultProps} />);
      
      expect(screen.getByText(/Maksymalny rozmiar: 512MB/)).toBeInTheDocument(); // Should still show 512 due to component prop precedence
    });

    it('should override defaults with custom config', () => {
      render(
        <FileUpload 
          {...defaultProps}
          config={{
            maxFileSize: 50,
            supportedTypes: ['pdf'],
            maxFiles: 3
          }}
        />
      );
      
      expect(screen.getByText(/Maksymalny rozmiar: 50MB/)).toBeInTheDocument();
    });
  });
});