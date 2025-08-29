import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

// Log levels with priorities
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug',
}

// Log categories for better organization
export enum LogCategory {
  AUTH = 'auth',
  API = 'api',
  DATABASE = 'database',
  WEBSOCKET = 'websocket',
  QUEUE = 'queue',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  SYSTEM = 'system',
  BUSINESS = 'business',
  AUDIT = 'audit',
  BROWSER = 'browser',
  CACHE = 'cache',
}

// Structured log interface
export interface LogContext {
  userId?: string;
  sessionId?: string;
  organizationId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  errorCode?: string;
  errorStack?: string;
  error?: string;
  metadata?: Record<string, any>;
  // Allow any additional string properties for flexible logging
  [key: string]: any;
}

// Custom log format for structured logging
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, category, context, ...meta }) => {
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      category: category || LogCategory.SYSTEM,
      message,
      context: context || {},
      ...meta,
    };

    return JSON.stringify(logEntry);
  })
);

// Log aggregation and storage configuration
class LoggingService {
  private logger: winston.Logger;
  private auditLogger: winston.Logger;
  private performanceLogger: winston.Logger;
  private securityLogger: winston.Logger;

  constructor() {
    // Ensure log directories exist
    this.ensureLogDirectories();

    // Main application logger
    this.logger = this.createLogger('app', {
      console: process.env.NODE_ENV !== 'production',
      file: true,
      rotateDaily: true,
    });

    // Specialized loggers
    this.auditLogger = this.createLogger('audit', {
      console: false,
      file: true,
      rotateDaily: true,
      retention: 365, // Keep audit logs for 1 year
    });

    this.performanceLogger = this.createLogger('performance', {
      console: false,
      file: true,
      rotateDaily: true,
    });

    this.securityLogger = this.createLogger('security', {
      console: true,
      file: true,
      rotateDaily: true,
      retention: 90, // Keep security logs for 90 days
    });

    // Handle uncaught exceptions and rejections
    this.setupGlobalErrorHandling();
  }

  private ensureLogDirectories(): void {
    const logDirs = ['logs', 'logs/audit', 'logs/performance', 'logs/security'];
    
    logDirs.forEach(dir => {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  private createLogger(name: string, options: {
    console?: boolean;
    file?: boolean;
    rotateDaily?: boolean;
    retention?: number;
  }): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport for development
    if (options.console) {
      transports.push(
        new winston.transports.Console({
          level: process.env.LOG_LEVEL || 'info',
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        })
      );
    }

    // File transport
    if (options.file) {
      if (options.rotateDaily) {
        // Daily rotating file
        transports.push(
          new DailyRotateFile({
            filename: path.join(process.cwd(), `logs/${name}/%DATE%.log`),
            datePattern: 'YYYY-MM-DD',
            maxSize: '50m',
            maxFiles: options.retention || 30,
            format: customFormat,
            level: process.env.LOG_LEVEL || 'info',
          })
        );

        // Error-only rotating file
        transports.push(
          new DailyRotateFile({
            filename: path.join(process.cwd(), `logs/${name}/%DATE%-error.log`),
            datePattern: 'YYYY-MM-DD',
            maxSize: '50m',
            maxFiles: options.retention || 30,
            format: customFormat,
            level: 'error',
          })
        );
      } else {
        // Simple file transport
        transports.push(
          new winston.transports.File({
            filename: path.join(process.cwd(), `logs/${name}.log`),
            format: customFormat,
            maxsize: 50 * 1024 * 1024, // 50MB
            maxFiles: 5,
          })
        );
      }
    }

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      transports,
      exitOnError: false,
    });
  }

  private setupGlobalErrorHandling(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.error('Uncaught Exception', LogCategory.SYSTEM, {
        errorCode: 'UNCAUGHT_EXCEPTION',
        errorStack: error.stack,
      });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.error('Unhandled Promise Rejection', LogCategory.SYSTEM, {
        errorCode: 'UNHANDLED_REJECTION',
        reason: String(reason),
        errorStack: reason?.stack,
      });
    });
  }

  // Core logging methods
  log(level: LogLevel, message: string, category: LogCategory = LogCategory.SYSTEM, context: LogContext = {}): void {
    this.logger.log(level, message, { category, context });
  }

  error(message: string, category: LogCategory = LogCategory.SYSTEM, context: LogContext = {}): void {
    this.logger.error(message, { category, context });
  }

  warn(message: string, category: LogCategory = LogCategory.SYSTEM, context: LogContext = {}): void {
    this.logger.warn(message, { category, context });
  }

  info(message: string, category: LogCategory = LogCategory.SYSTEM, context: LogContext = {}): void {
    this.logger.info(message, { category, context });
  }

  debug(message: string, category: LogCategory = LogCategory.SYSTEM, context: LogContext = {}): void {
    this.logger.debug(message, { category, context });
  }

  // Specialized logging methods
  logAudit(action: string, userId: string, details: Record<string, any> = {}): void {
    this.auditLogger.info(`Audit: ${action}`, {
      category: LogCategory.AUDIT,
      context: {
        userId,
        action,
        timestamp: new Date().toISOString(),
        ...details,
      },
    });
  }

  logSecurity(event: string, context: LogContext = {}): void {
    this.securityLogger.warn(`Security: ${event}`, {
      category: LogCategory.SECURITY,
      context: {
        event,
        timestamp: new Date().toISOString(),
        ...context,
      },
    });
  }

  logPerformance(operation: string, duration: number, context: LogContext = {}): void {
    this.performanceLogger.info(`Performance: ${operation}`, {
      category: LogCategory.PERFORMANCE,
      context: {
        operation,
        duration,
        timestamp: new Date().toISOString(),
        ...context,
      },
    });
  }

  logAPI(req: Request, res: Response, duration: number): void {
    const context: LogContext = {
      method: req.method,
      endpoint: req.path,
      statusCode: res.statusCode,
      responseTime: duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      sessionId: req.sessionId,
      organizationId: req.organizationId,
    };

    const level = res.statusCode >= 500 ? LogLevel.ERROR : 
                  res.statusCode >= 400 ? LogLevel.WARN : 
                  LogLevel.INFO;

    this.log(level, `${req.method} ${req.path} ${res.statusCode}`, LogCategory.API, context);
  }

  logDatabase(operation: string, table: string, duration: number, context: LogContext = {}): void {
    this.log(LogLevel.INFO, `DB: ${operation} on ${table}`, LogCategory.DATABASE, {
      operation,
      table,
      duration,
      ...context,
    });
  }

  logWebSocket(event: string, context: LogContext = {}): void {
    this.log(LogLevel.INFO, `WebSocket: ${event}`, LogCategory.WEBSOCKET, context);
  }

  logQueue(jobType: string, status: string, context: LogContext = {}): void {
    this.log(LogLevel.INFO, `Queue: ${jobType} ${status}`, LogCategory.QUEUE, {
      jobType,
      status,
      ...context,
    });
  }

  logBusiness(event: string, context: LogContext = {}): void {
    this.log(LogLevel.INFO, `Business: ${event}`, LogCategory.BUSINESS, context);
  }

  // Request correlation ID middleware
  createRequestMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      // Generate request ID for correlation
      req.requestId = req.get('X-Request-ID') || this.generateRequestId();
      res.setHeader('X-Request-ID', req.requestId);

      // Track request start time
      const startTime = Date.now();

      // Log request start
      this.debug(`Request started: ${req.method} ${req.path}`, LogCategory.API, {
        requestId: req.requestId,
        method: req.method,
        endpoint: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Log response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.logAPI(req, res, duration);
      });

      next();
    };
  }

  // Error logging middleware
  createErrorMiddleware() {
    return (error: Error, req: Request, res: Response, next: Function) => {
      this.error(`Request error: ${error.message}`, LogCategory.API, {
        requestId: req.requestId,
        method: req.method,
        endpoint: req.path,
        errorCode: error.name,
        errorStack: error.stack,
        userId: req.user?.id,
        ip: req.ip,
      });

      next(error);
    };
  }

  // Utility methods
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Log aggregation and search
  async searchLogs(query: {
    level?: LogLevel;
    category?: LogCategory;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    limit?: number;
  }): Promise<any[]> {
    // This would typically integrate with a log aggregation service like ELK stack
    // For now, implementing basic file-based search
    
    // In production, this would query Elasticsearch, Splunk, or similar
    console.log('Log search query:', query);
    return []; // Placeholder
  }

  // Log metrics and statistics
  async getLogMetrics(timeRange: { start: Date; end: Date }): Promise<{
    totalLogs: number;
    errorRate: number;
    categories: Record<LogCategory, number>;
    topErrors: Array<{ message: string; count: number }>;
  }> {
    // This would typically aggregate logs from storage
    // Placeholder implementation
    return {
      totalLogs: 0,
      errorRate: 0,
      categories: {} as Record<LogCategory, number>,
      topErrors: [],
    };
  }

  // Health check for logging system
  healthCheck(): { status: string; details: Record<string, any> } {
    const logDir = path.join(process.cwd(), 'logs');
    const logDirExists = fs.existsSync(logDir);
    
    return {
      status: logDirExists ? 'healthy' : 'unhealthy',
      details: {
        logDirectory: logDirExists,
        transports: this.logger.transports.length,
        level: this.logger.level,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// Global logger instance
export const logger = new LoggingService();

// Express request interface extension
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export default logger;