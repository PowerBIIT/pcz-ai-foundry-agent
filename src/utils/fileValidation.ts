// File Validation Utilities
// Sprint 1 - File Attachments

import { 
  FileValidationResult, 
  FileUploadConfig, 
  SUPPORTED_FILE_TYPES, 
  SupportedFileType,
  FileValidationError,
  FileSizeError,
  FileTypeError 
} from '../types/FileTypes';

export class FileValidator {
  private config: FileUploadConfig;

  constructor(config?: Partial<FileUploadConfig>) {
    this.config = {
      maxFileSize: parseInt(process.env.REACT_APP_MAX_FILE_SIZE_MB || '512'),
      supportedTypes: (process.env.REACT_APP_SUPPORTED_FILE_TYPES || 'pdf,docx,xlsx,txt,md').split(','),
      maxFiles: 10,
      ...config
    };
  }

  /**
   * Validate a single file
   */
  validateFile(file: File): FileValidationResult {
    try {
      // Check file size
      this.validateFileSize(file);
      
      // Check file type
      this.validateFileType(file);
      
      // Check for potential security issues
      this.validateFileSecurity(file);

      return {
        isValid: true,
        warnings: this.getFileWarnings(file)
      };

    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  /**
   * Validate multiple files
   */
  validateFiles(files: File[]): { validFiles: File[]; errors: Array<{ file: File; error: string }> } {
    const validFiles: File[] = [];
    const errors: Array<{ file: File; error: string }> = [];

    // Check total file count
    if (files.length > this.config.maxFiles) {
      throw new FileValidationError(
        'multiple files', 
        `Too many files (${files.length}). Maximum allowed: ${this.config.maxFiles}`
      );
    }

    // Validate each file
    files.forEach(file => {
      const validation = this.validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push({ file, error: validation.error || 'Unknown error' });
      }
    });

    return { validFiles, errors };
  }

  /**
   * Validate file size
   */
  private validateFileSize(file: File): void {
    const maxSizeBytes = this.config.maxFileSize * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      throw new FileSizeError(file.name, file.size, this.config.maxFileSize);
    }

    if (file.size === 0) {
      throw new FileValidationError(file.name, 'File is empty');
    }
  }

  /**
   * Validate file type
   */
  private validateFileType(file: File): void {
    const extension = this.getFileExtension(file.name);
    
    if (!extension) {
      throw new FileTypeError(file.name, 'no extension', this.config.supportedTypes);
    }

    if (!this.config.supportedTypes.includes(extension)) {
      throw new FileTypeError(file.name, extension, this.config.supportedTypes);
    }

    // Additional MIME type validation
    const expectedMimeType = this.getMimeTypeForExtension(extension);
    if (expectedMimeType && file.type && !this.isMimeTypeCompatible(file.type, expectedMimeType)) {
      console.warn(`MIME type mismatch for ${file.name}: expected ${expectedMimeType}, got ${file.type}`);
      // Don't throw error - browser MIME detection can be inconsistent
    }
  }

  /**
   * Security validation
   */
  private validateFileSecurity(file: File): void {
    // Check for potentially dangerous file extensions
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'com', 'scr', 'pif', 'vbs', 'js', 'jar'];
    const extension = this.getFileExtension(file.name);
    
    if (dangerousExtensions.includes(extension.toLowerCase())) {
      throw new FileValidationError(file.name, 'File type potentially unsafe');
    }

    // Check for suspicious filenames
    const suspiciousPatterns = [
      /\.(exe|bat|cmd)$/i,
      /^\.htaccess$/i,
      /\.\./,  // Directory traversal
      /[<>:"|?*]/  // Invalid filename characters
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      throw new FileValidationError(file.name, 'Filename contains suspicious characters');
    }
  }

  /**
   * Get file warnings (non-blocking issues)
   */
  private getFileWarnings(file: File): string[] {
    const warnings: string[] = [];

    // Large file warning
    const largeSizeThreshold = 50 * 1024 * 1024; // 50MB
    if (file.size > largeSizeThreshold) {
      warnings.push(`Duży plik (${(file.size / 1024 / 1024).toFixed(2)}MB) - upload może potrwać dłużej`);
    }

    // Old file format warnings
    const oldFormats = ['doc', 'xls', 'ppt'];
    const extension = this.getFileExtension(file.name);
    if (oldFormats.includes(extension)) {
      warnings.push(`Starszy format pliku (.${extension}). Zalecamy użycie nowszego formatu (.${extension}x)`);
    }

    return warnings;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Get expected MIME type for file extension
   */
  private getMimeTypeForExtension(extension: string): string | null {
    const fileType = SUPPORTED_FILE_TYPES[extension as SupportedFileType];
    return fileType?.mimeType || null;
  }

  /**
   * Check if MIME type is compatible with expected type
   */
  private isMimeTypeCompatible(actualMimeType: string, expectedMimeType: string): boolean {
    if (actualMimeType === expectedMimeType) {
      return true;
    }

    // Handle common MIME type variations
    const compatibilityMap = new Map([
      ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['application/octet-stream']],
      ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ['application/octet-stream']],
      ['text/plain', ['text/plain', 'application/octet-stream']],
      ['application/pdf', ['application/pdf', 'application/octet-stream']]
    ]);

    const compatible = compatibilityMap.get(expectedMimeType) || [];
    return compatible.includes(actualMimeType);
  }

  /**
   * Get human readable file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file icon based on extension  
   */
  static getFileIcon(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    const iconMap = {
      pdf: '📄',
      docx: '📝', 
      doc: '📝',
      xlsx: '📊',
      xls: '📊', 
      txt: '📄',
      md: '📝'
    } as Record<string, string>;

    return iconMap[extension] || '📎';
  }

  /**
   * Get file type description
   */
  static getFileTypeDescription(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    const fileType = SUPPORTED_FILE_TYPES[extension as SupportedFileType];
    return fileType?.description || 'Nieznany typ pliku';
  }
}