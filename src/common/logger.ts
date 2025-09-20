/**
 * Simple structured logging utility
 * In production, this could be replaced with Winston, Pino, or similar
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogContext {
  [key: string]: unknown;
  module?: string;
  operation?: string;
  duration?: number;
  error?: Error;
}

class Logger {
  private isDevelopment: boolean;
  private isTest: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    this.isTest = process.env.NODE_ENV === 'test';
  }

  private serializeError(error: Error): Record<string, unknown> {
    const result: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };

    // Add any custom properties (like responseStatus, responseBody)
    for (const [key, value] of Object.entries(error)) {
      if (key !== 'name' && key !== 'message' && key !== 'stack') {
        result[key] = value;
      }
    }

    return result;
  }

  private transformContext(context?: LogContext): Record<string, unknown> | undefined {
    if (!context) return undefined;

    const transformed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      if (value instanceof Error) {
        transformed[key] = this.serializeError(value);
      } else {
        transformed[key] = value;
      }
    }

    return transformed;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const transformedContext = this.transformContext(context);
    const logEntry = {
      timestamp,
      level,
      message,
      ...transformedContext,
    };

    if (this.isDevelopment) {
      // Pretty formatting for development
      const contextStr = transformedContext ? ` ${JSON.stringify(transformedContext, null, 2)}` : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
    }

    // JSON format for production
    return JSON.stringify(logEntry);
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    // Suppress logs in test environment unless explicitly enabled
    if (this.isTest && !process.env.ENABLE_TEST_LOGS) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, context);

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formattedMessage);
        }
        break;
    }
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an error with unknown type handling
   */
  errorWithUnknown(message: string, error: unknown, context?: Omit<LogContext, 'error'>): void {
    this.error(message, {
      ...context,
      error: error instanceof Error ? error : new Error(String(error))
    });
  }

  /**
   * Create a child logger with default context
   */
  child(defaultContext: LogContext): Logger {
    const childLogger = new Logger();
    const originalLog = childLogger.log.bind(childLogger);

    childLogger.log = (level: LogLevel, message: string, context?: LogContext) => {
      originalLog(level, message, { ...defaultContext, ...context });
    };

    return childLogger;
  }

  /**
   * Time an operation and log the duration
   */
  async time<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`Failed ${operation}`, {
        ...context,
        duration,
        operation,
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw error;
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export factory for module-specific loggers
export const createLogger = (module: string): Logger => {
  return logger.child({ module });
};