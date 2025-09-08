// Logger Utility
// Warunkowe logowanie dla development/production

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  // Store recent logs for debugging
  private recentLogs: LogEntry[] = [];
  private maxLogs = 100;

  private log(level: LogLevel, message: any, ...args: any[]) {
    const entry: LogEntry = {
      level,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      timestamp: new Date()
    };

    // Store in memory for debugging
    this.recentLogs.push(entry);
    if (this.recentLogs.length > this.maxLogs) {
      this.recentLogs.shift();
    }

    // Only log to console in development
    if (this.isDevelopment) {
      const timestamp = entry.timestamp.toISOString().substring(11, 23);
      const prefix = `[${timestamp}]`;
      
      switch (level) {
        case 'debug':
          console.debug(prefix, message, ...args);
          break;
        case 'info':
          console.info(prefix, message, ...args);
          break;
        case 'warn':
          console.warn(prefix, message, ...args);
          break;
        case 'error':
          console.error(prefix, message, ...args);
          break;
      }
    }
  }

  debug(message: any, ...args: any[]) {
    this.log('debug', message, ...args);
  }

  info(message: any, ...args: any[]) {
    this.log('info', message, ...args);
  }

  warn(message: any, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  error(message: any, ...args: any[]) {
    this.log('error', message, ...args);
  }

  // Get recent logs for debugging
  getRecentLogs(): LogEntry[] {
    return [...this.recentLogs];
  }

  // Clear logs
  clear() {
    this.recentLogs = [];
  }

  // Export logs as string
  export(): string {
    return this.recentLogs
      .map(log => `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message}`)
      .join('\n');
  }
}

// Create singleton instance
export const logger = new Logger();

// Export individual methods for easier migration
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);

// Default export
export default logger;