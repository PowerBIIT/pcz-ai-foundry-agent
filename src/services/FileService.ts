// Azure AI Foundry File Service
// Sprint 1 - File Attachments Integration

import { 
  FileMetadata, 
  FileUploadResult, 
  FileUploadError,
  FileValidationError 
} from '../types/FileTypes';
import { agentConfig } from '../authConfig';
import { userSessionService } from './UserSessionService';

export interface FileUploadOptions {
  onProgress?: (fileId: string, progress: number) => void;
  onStatusChange?: (fileId: string, status: FileMetadata['status']) => void;
}

export class FileService {
  private endpoint: string;
  private readonly STORAGE_KEY = 'pcz-agent-file-metadata';

  constructor(endpoint: string = agentConfig.endpoint) {
    this.endpoint = endpoint;
  }

  /**
   * Upload file to Azure AI Foundry
   */
  async uploadFile(
    file: File, 
    userId: string, 
    token: string,
    options?: FileUploadOptions
  ): Promise<FileUploadResult> {
    try {
      // Get user thread for file association
      const threadId = await userSessionService.getUserThread(userId);
      
      // Authorize user access
      const authorized = await userSessionService.authorizeThreadAccess(userId, threadId);
      if (!authorized) {
        throw new FileUploadError(file.name, 'Unauthorized access to user thread');
      }

      // Generate temporary file ID for progress tracking
      const tempFileId = this.generateTempFileId();
      
      // Initialize file metadata
      const metadata: FileMetadata = {
        fileId: tempFileId,
        userId,
        threadId,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date(),
        status: 'uploading',
        progress: 0
      };

      // Store initial metadata
      this.storeFileMetadata(metadata);
      options?.onStatusChange?.(tempFileId, 'uploading');

      // Step 1: Upload file to Azure AI Foundry
      const azureFileId = await this.uploadToAzure(file, token, (progress) => {
        metadata.progress = progress;
        this.storeFileMetadata(metadata);
        options?.onProgress?.(tempFileId, progress);
      });

      // Step 2: Remove temp metadata and create new with real Azure file ID
      this.removeFileMetadataById(tempFileId);
      
      metadata.fileId = azureFileId;
      metadata.status = 'processing';
      metadata.progress = 100;
      this.storeFileMetadata(metadata);
      options?.onStatusChange?.(azureFileId, 'processing');

      // Step 3: Wait for Azure processing completion
      const processingResult = await this.waitForProcessing(azureFileId, token, options);
      
      if (processingResult.status === 'ready') {
        metadata.status = 'ready';
        this.storeFileMetadata(metadata);
        options?.onStatusChange?.(azureFileId, 'ready');
        
        console.info(`File upload successful: ${file.name} → ${azureFileId}`);
      } else {
        metadata.status = 'error';
        metadata.error = processingResult.error || 'Processing failed';
        this.storeFileMetadata(metadata);
        options?.onStatusChange?.(azureFileId, 'error');
      }

      return {
        fileId: azureFileId,
        status: metadata.status,
        progress: metadata.progress,
        error: metadata.error
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
      console.error(`File upload failed for ${file.name}:`, error);
      
      return {
        fileId: '',
        status: 'error',
        progress: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Upload file to Azure AI Foundry service
   */
  private async uploadToAzure(
    file: File, 
    token: string, 
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'assistants');

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress?.(progress);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response.id);
          } catch (error) {
            reject(new FileUploadError(file.name, 'Invalid response from server'));
          }
        } else {
          reject(new FileUploadError(file.name, `Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new FileUploadError(file.name, 'Network error during upload'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new FileUploadError(file.name, 'Upload timeout'));
      });

      // Configure request
      xhr.open('POST', `${this.endpoint}/files?api-version=2025-05-01`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.timeout = 300000; // 5 minutes timeout

      // Start upload
      xhr.send(formData);
    });
  }

  /**
   * Wait for Azure AI Foundry file processing completion
   */
  private async waitForProcessing(
    fileId: string, 
    token: string,
    options?: FileUploadOptions
  ): Promise<{ status: 'ready' | 'error'; error?: string }> {
    const maxAttempts = 30; // 30 seconds max wait
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${this.endpoint}/files/${fileId}?api-version=2025-05-01`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const fileData = await response.json();
          
          // Check if file is ready for use
          if (fileData.status === 'processed' || fileData.status === 'uploaded') {
            return { status: 'ready' };
          } else if (fileData.status === 'error' || fileData.status === 'failed') {
            return { status: 'error', error: 'File processing failed' };
          }
          
          // Still processing, continue waiting
          console.debug(`File ${fileId} still processing, attempt ${attempts + 1}`);
        } else {
          console.warn(`File status check failed: ${response.status}`);
        }

      } catch (error) {
        console.warn(`Error checking file status:`, error);
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    // Timeout reached
    return { status: 'error', error: 'Processing timeout' };
  }

  /**
   * Get files for a specific user
   */
  async getUserFiles(userId: string): Promise<FileMetadata[]> {
    try {
      const allFiles = this.loadFileMetadata();
      const userFiles = allFiles.filter(file => file.userId === userId);
      
      // Sort by upload date (newest first)
      return userFiles.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
      
    } catch (error) {
      console.error(`Failed to get user files for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get files for a specific thread
   */
  async getThreadFiles(userId: string, threadId: string): Promise<FileMetadata[]> {
    try {
      // Authorize access to thread
      const authorized = await userSessionService.authorizeThreadAccess(userId, threadId);
      if (!authorized) {
        throw new FileValidationError('thread access', 'Unauthorized access to thread');
      }

      const allFiles = this.loadFileMetadata();
      return allFiles.filter(file => file.threadId === threadId && file.userId === userId);
      
    } catch (error) {
      console.error(`Failed to get thread files for ${threadId}:`, error);
      return [];
    }
  }

  /**
   * Remove file metadata (doesn't delete from Azure)
   */
  async removeFileMetadata(fileId: string, userId: string): Promise<void> {
    try {
      const allFiles = this.loadFileMetadata();
      const fileToRemove = allFiles.find(f => f.fileId === fileId);
      
      if (!fileToRemove) {
        throw new Error('File not found');
      }

      // Verify user owns the file
      if (fileToRemove.userId !== userId) {
        throw new FileValidationError(fileId, 'Unauthorized access to file');
      }

      // Remove from metadata
      const updatedFiles = allFiles.filter(f => f.fileId !== fileId);
      this.saveFileMetadata(updatedFiles);
      
      console.info(`Removed file metadata: ${fileId} for user ${userId}`);
    } catch (error) {
      console.error(`Failed to remove file metadata ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Update file status
   */
  updateFileStatus(
    fileId: string, 
    status: FileMetadata['status'], 
    progress?: number,
    error?: string
  ): void {
    try {
      const allFiles = this.loadFileMetadata();
      const fileIndex = allFiles.findIndex(f => f.fileId === fileId);
      
      if (fileIndex !== -1) {
        allFiles[fileIndex].status = status;
        if (progress !== undefined) {
          allFiles[fileIndex].progress = progress;
        }
        if (error) {
          allFiles[fileIndex].error = error;
        }
        
        this.saveFileMetadata(allFiles);
      }
    } catch (error) {
      console.error(`Failed to update file status for ${fileId}:`, error);
    }
  }

  /**
   * Get file upload statistics
   */
  getUploadStats(userId: string): {
    totalFiles: number;
    readyFiles: number;
    totalSize: number;
    errorFiles: number;
  } {
    try {
      const userFiles = this.loadFileMetadata().filter(f => f.userId === userId);
      
      return {
        totalFiles: userFiles.length,
        readyFiles: userFiles.filter(f => f.status === 'ready').length,
        totalSize: userFiles.reduce((total, file) => total + file.size, 0),
        errorFiles: userFiles.filter(f => f.status === 'error').length
      };
    } catch (error) {
      console.error(`Failed to get upload stats for ${userId}:`, error);
      return { totalFiles: 0, readyFiles: 0, totalSize: 0, errorFiles: 0 };
    }
  }

  /**
   * Load file metadata from localStorage
   */
  private loadFileMetadata(): FileMetadata[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);
      
      // Convert date strings back to Date objects
      return parsed.map((file: any) => ({
        ...file,
        uploadedAt: new Date(file.uploadedAt)
      }));
      
    } catch (error) {
      console.error('Error loading file metadata:', error);
      return [];
    }
  }

  /**
   * Save file metadata to localStorage
   */
  private saveFileMetadata(files: FileMetadata[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(files));
    } catch (error) {
      console.error('Error saving file metadata:', error);
      
      // Handle quota exceeded - remove oldest files
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, cleaning up old files');
        const sortedFiles = files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
        const recentFiles = sortedFiles.slice(0, 50); // Keep only 50 most recent
        
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentFiles));
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError);
        }
      }
    }
  }

  /**
   * Store single file metadata
   */
  private storeFileMetadata(metadata: FileMetadata): void {
    const allFiles = this.loadFileMetadata();
    const existingIndex = allFiles.findIndex(f => f.fileId === metadata.fileId);
    
    if (existingIndex !== -1) {
      allFiles[existingIndex] = metadata;
    } else {
      allFiles.push(metadata);
    }
    
    this.saveFileMetadata(allFiles);
  }

  /**
   * Generate temporary file ID for progress tracking
   */
  private generateTempFileId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `temp_${timestamp}_${random}`;
  }

  /**
   * Remove file metadata by file ID
   */
  private removeFileMetadataById(fileId: string): void {
    try {
      const allFiles = this.loadFileMetadata();
      const updatedFiles = allFiles.filter(f => f.fileId !== fileId);
      this.saveFileMetadata(updatedFiles);
      console.debug(`Removed file metadata: ${fileId}`);
    } catch (error) {
      console.error(`Failed to remove file metadata ${fileId}:`, error);
    }
  }

  /**
   * Cleanup old file metadata
   */
  async cleanupOldFiles(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const allFiles = this.loadFileMetadata();
      const cutoffDate = new Date(Date.now() - maxAge);
      
      const recentFiles = allFiles.filter(file => file.uploadedAt > cutoffDate);
      
      if (recentFiles.length !== allFiles.length) {
        this.saveFileMetadata(recentFiles);
        console.info(`Cleaned up ${allFiles.length - recentFiles.length} old file metadata entries`);
      }
      
    } catch (error) {
      console.error('Error during file cleanup:', error);
    }
  }

  /**
   * Validate file before upload
   */
  private validateFileForUpload(file: File): void {
    // Basic validation
    if (!file || file.size === 0) {
      throw new FileValidationError(file.name || 'unknown', 'File is empty or invalid');
    }

    // Size validation (Azure AI Foundry limit: 512MB)
    const maxSize = 512 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new FileValidationError(
        file.name, 
        `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds limit (512MB)`
      );
    }

    // Type validation
    const allowedTypes = ['pdf', 'docx', 'xlsx', 'txt', 'md'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (!extension || !allowedTypes.includes(extension)) {
      throw new FileValidationError(
        file.name, 
        `File type ${extension} not supported. Allowed: ${allowedTypes.join(', ')}`
      );
    }
  }

  /**
   * Get file information from Azure AI Foundry
   */
  async getFileInfo(fileId: string, token: string): Promise<any> {
    try {
      const response = await fetch(`${this.endpoint}/files/${fileId}?api-version=2025-05-01`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get file info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error getting file info for ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Delete file from Azure AI Foundry  
   */
  async deleteFile(fileId: string, userId: string, token: string): Promise<void> {
    try {
      // Verify user owns the file
      const allFiles = this.loadFileMetadata();
      const file = allFiles.find(f => f.fileId === fileId);
      
      if (!file || file.userId !== userId) {
        throw new FileValidationError(fileId, 'Unauthorized access to file');
      }

      // Delete from Azure AI Foundry
      const response = await fetch(`${this.endpoint}/files/${fileId}?api-version=2025-05-01`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.warn(`Azure file deletion failed: ${response.status} (continuing with metadata cleanup)`);
      }

      // Remove metadata regardless of Azure deletion result
      await this.removeFileMetadata(fileId, userId);
      
      console.info(`File deleted: ${fileId} for user ${userId}`);
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Get storage usage information
   */
  getStorageUsage(): { 
    fileCount: number; 
    totalSize: number; 
    storagePercentage: number;
  } {
    try {
      const allFiles = this.loadFileMetadata();
      const totalSize = allFiles.reduce((total, file) => total + file.size, 0);
      
      // Estimate localStorage usage (rough approximation)
      const metadataSize = JSON.stringify(allFiles).length;
      const maxStorage = 5 * 1024 * 1024; // 5MB typical limit
      const storagePercentage = (metadataSize / maxStorage) * 100;

      return {
        fileCount: allFiles.length,
        totalSize,
        storagePercentage: Math.round(storagePercentage * 100) / 100
      };
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return { fileCount: 0, totalSize: 0, storagePercentage: 0 };
    }
  }
}

// Export singleton instance
export const fileService = new FileService();