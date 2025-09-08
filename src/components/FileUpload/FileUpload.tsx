// File Upload Component with Drag & Drop
// Sprint 1 - File Attachments

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { FileMetadata, FileUploadEvents, FileUploadConfig } from '../../types/FileTypes';
import { FileValidator } from '../../utils/fileValidation';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  onFileRemove?: (file: File) => void;
  uploadedFiles?: FileMetadata[];
  disabled?: boolean;
  config?: Partial<FileUploadConfig>;
  events?: FileUploadEvents;
  showPreview?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  onFileRemove,
  uploadedFiles = [],
  disabled = false,
  config,
  events,
  showPreview = true
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize file validator
  const validator = new FileValidator(config);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setValidationErrors([]);

    try {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejectionErrors = rejectedFiles.map(({ file, errors }) => {
          const errorMessages = errors.map((e: any) => e.message).join(', ');
          return `${file.name}: ${errorMessages}`;
        });
        
        setValidationErrors(rejectionErrors);
        rejectionErrors.forEach(error => {
          toast.error(error);
        });
      }

      // Validate accepted files
      if (acceptedFiles.length > 0) {
        const validation = validator.validateFiles(acceptedFiles);
        
        // Show validation errors
        if (validation.errors.length > 0) {
          const errorMessages = validation.errors.map(({ file, error }) => `${file.name}: ${error}`);
          setValidationErrors(errorMessages);
          
          validation.errors.forEach(({ file, error }) => {
            toast.error(`${file.name}: ${error}`);
            events?.onValidationError?.(file, error);
          });
        }

        // Process valid files
        if (validation.validFiles.length > 0) {
          validation.validFiles.forEach(file => {
            events?.onUploadStart?.(file);
            
            // Show file warnings if any
            const fileValidation = validator.validateFile(file);
            fileValidation.warnings?.forEach(warning => {
              toast.warn(`${file.name}: ${warning}`);
            });
          });

          onFilesSelected(validation.validFiles);
          toast.success(`Wybrano ${validation.validFiles.length} plików do przesłania`);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      setValidationErrors([errorMessage]);
      toast.error(errorMessage);
    }
  }, [onFilesSelected, validator, events]);

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    disabled,
    multiple: true,
    maxFiles: config?.maxFiles || 10,
    maxSize: (config?.maxFileSize || 512) * 1024 * 1024, // Convert MB to bytes
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    }
  });

  // Handle manual file selection
  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file removal
  const handleFileRemove = (file: FileMetadata) => {
    if (onFileRemove) {
      // Create a File object for the callback (limited info available)
      const fileObj = new File([''], file.filename, { 
        type: file.mimeType,
        lastModified: file.uploadedAt.getTime()
      });
      onFileRemove(fileObj);
    }
  };

  // Get status display for uploaded files
  const getStatusDisplay = (status: FileMetadata['status'], progress: number) => {
    switch (status) {
      case 'uploading':
        return `Przesyłanie... ${progress}%`;
      case 'processing':
        return 'Przetwarzanie...';
      case 'ready':
        return 'Gotowy';
      case 'error':
        return 'Błąd';
      default:
        return 'Nieznany';
    }
  };

  // Get status icon
  const getStatusIcon = (status: FileMetadata['status']) => {
    switch (status) {
      case 'uploading':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'ready':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  return (
    <div className={`file-upload-container ${disabled ? 'disabled' : ''}`}>
      {/* Drag & Drop Area */}
      <div 
        {...getRootProps()} 
        className={`file-upload-dropzone ${isDragActive || dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        
        <div className="upload-content">
          {isDragActive ? (
            <div className="drag-active-content">
              <div className="upload-icon">📁</div>
              <h3>Upuść pliki tutaj</h3>
              <p>Obsługujemy: PDF, DOCX, XLSX, TXT, MD</p>
            </div>
          ) : (
            <div className="default-content">
              <div className="upload-icon">📎</div>
              <h3>Przeciągnij i upuść pliki</h3>
              <p>lub</p>
              <button 
                type="button" 
                onClick={handleFileInputClick}
                disabled={disabled}
                className="browse-button"
              >
                Wybierz pliki
              </button>
              <div className="upload-info">
                <small>
                  Obsługujemy: PDF, DOCX, XLSX, TXT, MD<br/>
                  Maksymalny rozmiar: {config?.maxFileSize || 512}MB na plik
                </small>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="validation-errors">
          <h4>❌ Błędy walidacji:</h4>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index} className="error-message">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Uploaded Files Preview */}
      {showPreview && uploadedFiles.length > 0 && (
        <div className="uploaded-files-preview">
          <h4>📁 Przesłane pliki:</h4>
          <div className="files-list">
            {uploadedFiles.map((file, index) => (
              <div key={file.fileId || index} className={`file-item status-${file.status}`}>
                <div className="file-info">
                  <span className="file-icon">
                    {FileValidator.getFileIcon(file.filename)}
                  </span>
                  <div className="file-details">
                    <div className="file-name" title={file.filename}>
                      {file.filename}
                    </div>
                    <div className="file-meta">
                      {FileValidator.formatFileSize(file.size)} • {FileValidator.getFileTypeDescription(file.filename)}
                    </div>
                    <div className="file-status">
                      <span className="status-icon">
                        {getStatusIcon(file.status)}
                      </span>
                      <span className="status-text">
                        {getStatusDisplay(file.status, file.progress)}
                      </span>
                    </div>
                    {file.error && (
                      <div className="file-error">
                        ⚠️ {file.error}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar for uploading files */}
                {file.status === 'uploading' && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}

                {/* Remove button */}
                {(file.status === 'ready' || file.status === 'error') && onFileRemove && (
                  <button
                    type="button"
                    onClick={() => handleFileRemove(file)}
                    className="remove-button"
                    title="Usuń plik"
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Statistics */}
      {uploadedFiles.length > 0 && (
        <div className="upload-stats">
          <small>
            Przesłano: {uploadedFiles.filter(f => f.status === 'ready').length}/{uploadedFiles.length} plików • 
            Łączny rozmiar: {FileValidator.formatFileSize(
              uploadedFiles.reduce((total, file) => total + file.size, 0)
            )}
          </small>
        </div>
      )}
    </div>
  );
};

export default FileUpload;