// File Upload Type Definitions
// Sprint 1 - File Attachments

export interface FileMetadata {
  fileId: string;           // Azure AI Foundry file ID
  userId: string;           // Owner user ID  
  threadId: string;         // Associated thread
  filename: string;         // Original filename
  size: number;             // File size in bytes
  mimeType: string;         // MIME type
  uploadedAt: Date;         // Upload timestamp
  status: 'uploading' | 'processing' | 'ready' | 'error';
  progress: number;         // Upload progress 0-100
  error?: string;           // Error message if failed
}

export interface FileUploadResult {
  fileId: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  progress: number;
  error?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface FileUploadConfig {
  maxFileSize: number;      // Max file size in MB
  supportedTypes: string[]; // Supported file extensions
  maxFiles: number;         // Max files per upload
}

// Supported file types with descriptions
export const SUPPORTED_FILE_TYPES = {
  pdf: { 
    extension: 'pdf', 
    mimeType: 'application/pdf', 
    description: 'Dokumenty PDF' 
  },
  docx: { 
    extension: 'docx', 
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    description: 'Dokumenty Word' 
  },
  xlsx: { 
    extension: 'xlsx', 
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
    description: 'Arkusze Excel' 
  },
  txt: { 
    extension: 'txt', 
    mimeType: 'text/plain', 
    description: 'Pliki tekstowe' 
  },
  md: { 
    extension: 'md', 
    mimeType: 'text/markdown', 
    description: 'Dokumenty Markdown' 
  }
} as const;

export type SupportedFileType = keyof typeof SUPPORTED_FILE_TYPES;

// File upload events for progress tracking
export interface FileUploadEvents {
  onUploadStart?: (file: File) => void;
  onUploadProgress?: (file: File, progress: number) => void;
  onUploadComplete?: (file: File, result: FileUploadResult) => void;
  onUploadError?: (file: File, error: string) => void;
  onValidationError?: (file: File, error: string) => void;
}

// Error classes for file operations
export class FileValidationError extends Error {
  constructor(filename: string, reason: string) {
    super(`File validation failed for ${filename}: ${reason}`);
    this.name = 'FileValidationError';
  }
}

export class FileUploadError extends Error {
  constructor(filename: string, reason: string) {
    super(`File upload failed for ${filename}: ${reason}`);
    this.name = 'FileUploadError';
  }
}

export class FileSizeError extends Error {
  constructor(filename: string, size: number, maxSize: number) {
    super(`File ${filename} (${(size / 1024 / 1024).toFixed(2)}MB) exceeds maximum size of ${maxSize}MB`);
    this.name = 'FileSizeError';
  }
}

export class FileTypeError extends Error {
  constructor(filename: string, type: string, supportedTypes: string[]) {
    super(`File type ${type} not supported for ${filename}. Supported: ${supportedTypes.join(', ')}`);
    this.name = 'FileTypeError';
  }
}