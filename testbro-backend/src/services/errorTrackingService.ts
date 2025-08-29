import { Request, Response, NextFunction } from 'express';
import { logger, LogCategory } from './loggingService';
import { APMService } from './apmService';
import Redis from 'ioredis';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Error interfaces
export interface TrackedError {
  id: string;
  fingerprint: string;
  message: string;
  type: string;
  stack?: string;
  timestamp: Date;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  status: 'new' | 'acknowledged' | 'resolved' | 'ignored';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: ErrorContext;
  tags: Record<string, string>;
}

export interface ErrorContext {
  environment: string;
  user?: { id: string; email?: string };
  request?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    ip: string;
    userAgent?: string;
  };
  server?: {
    name: string;
    version: string;
    runtime: string;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    errorRate?: { threshold: number; timeWindow: number };
    errorCount?: { threshold: number; timeWindow: number };
    severity?: ('low' | 'medium' | 'high' | 'critical')[];
  };
  actions: AlertAction[];
  cooldown: number; // minutes
  lastTriggered?: Date;
}

export interface AlertAction {
  type: 'email' | 'webhook';
  configuration: {
    recipients?: string[];
    url?: string;
    method?: 'POST' | 'PUT';
  };
}

export interface Alert {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  status: 'active' | 'resolved';
  context: {
    errorIds: string[];
    errorCount: number;
    triggerCondition: string;
  };
}

interface ErrorTrackingConfig {
  enabled: boolean;
  environment: string;
  sampleRate: number;
  ignoredErrors: string[];
  sensitiveDataKeys: string[];
  email: {
    enabled: boolean;
    smtp?: {
      host: string;
      port: number;
      secure: boolean;
      auth?: { user: string; pass: string };
    };
    from: string;
  };
}

export class ErrorTrackingService {
  private redis: Redis;
  private apmService: APMService;
  private config: ErrorTrackingConfig;
  private errors: Map<string, TrackedError> = new Map();
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private emailTransporter?: nodemailer.Transporter;
  private errorBuffer: {
    timestamps: number[];
    counts: Map<string, number>;
  };

  constructor(redis: Redis, apmService: APMService, config?: Partial<ErrorTrackingConfig>) {
    this.redis = redis;
    this.apmService = apmService;
    this.config = {
      enabled: true,
      environment: process.env.NODE_ENV || 'development',
      sampleRate: parseFloat(process.env.ERROR_SAMPLE_RATE || '1.0'),
      ignoredErrors: ['ValidationError', 'UnauthorizedError', 'NotFoundError'],
      sensitiveDataKeys: ['password', 'token', 'key', 'secret', 'authorization'],
      email: {
        enabled: !!process.env.SMTP_HOST,
        smtp: process.env.SMTP_HOST ? {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: process.env.SMTP_USER ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || '',
          } : undefined,
        } : undefined,
        from: process.env.EMAIL_FROM || 'alerts@testbro.ai',
      },
      ...config,
    };

    this.errorBuffer = {
      timestamps: [],
      counts: new Map(),
    };

    this.initializeEmailTransporter();
    this.loadAlertRules();
    this.startPeriodicProcessing();
  }

  // Error tracking
  trackError(error: Error, context?: Partial<ErrorContext>, tags?: Record<string, string>): string | null {
    if (!this.config.enabled || !this.shouldSample()) {
      return null;
    }

    if (this.config.ignoredErrors.includes(error.name)) {
      return null;
    }

    const fingerprint = this.generateFingerprint(error);
    const errorId = crypto.randomUUID();
    const now = new Date();

    let trackedError = this.errors.get(fingerprint);
    
    if (trackedError) {
      trackedError.count++;
      trackedError.lastSeen = now;
    } else {
      trackedError = {
        id: errorId,
        fingerprint,
        message: error.message,
        type: error.name,
        stack: error.stack,
        timestamp: now,
        count: 1,
        firstSeen: now,
        lastSeen: now,
        status: 'new',
        severity: this.determineSeverity(error),
        context: this.sanitizeContext({
          environment: this.config.environment,
          server: {
            name: 'testbro-backend',
            version: '1.0.0',
            runtime: `Node.js ${process.version}`,
          },
          ...context,
        }),
        tags: tags || {},
      };
      
      this.errors.set(fingerprint, trackedError);
    }

    this.errorBuffer.timestamps.push(Date.now());
    const currentCount = this.errorBuffer.counts.get(error.name) || 0;
    this.errorBuffer.counts.set(error.name, currentCount + 1);

    this.apmService?.recordError(error, { tags });
    this.storeError(trackedError);
    this.checkAlertRules(trackedError);

    logger.debug('Error tracked', LogCategory.SYSTEM, {
      errorStack: error.stack,
      metadata: { errorId, fingerprint, severity: trackedError.severity }
    });

    return errorId;
  }

  // Express middleware
  errorTrackingMiddleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      const context: Partial<ErrorContext> = {
        request: {
          method: req.method,
          url: req.originalUrl,
          headers: this.sanitizeHeaders(req.headers as Record<string, string>),
          ip: req.ip || 'unknown',
          userAgent: req.get('User-Agent'),
        },
        user: req.user ? { id: req.user.id, email: req.user.email } : undefined,
      };

      const tags = {
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode?.toString() || 'unknown',
      };

      this.trackError(error, context, tags);
      next(error);
    };
  }

  // Alert management
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const ruleId = crypto.randomUUID();
    const alertRule: AlertRule = { id: ruleId, ...rule };
    
    this.alertRules.push(alertRule);
    this.saveAlertRules();
    
    return ruleId;
  }

  // Error management
  getErrors(filters?: {
    status?: TrackedError['status'];
    severity?: TrackedError['severity'];
    limit?: number;
  }): TrackedError[] {
    let filteredErrors = Array.from(this.errors.values());

    if (filters?.status) {
      filteredErrors = filteredErrors.filter(error => error.status === filters.status);
    }
    
    if (filters?.severity) {
      filteredErrors = filteredErrors.filter(error => error.severity === filters.severity);
    }

    filteredErrors.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
    
    return filteredErrors.slice(0, filters?.limit || 100);
  }

  getErrorStats() {
    const errors = Array.from(this.errors.values());
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const recentErrors = this.errorBuffer.timestamps.filter(ts => ts > oneHourAgo);
    
    return {
      total: errors.length,
      byStatus: this.groupBy(errors, 'status'),
      bySeverity: this.groupBy(errors, 'severity'),
      byType: this.groupBy(errors, 'type'),
      recentCount: recentErrors.length,
      errorRate: recentErrors.length / 1000 * 100, // Simplified calculation
    };
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => alert.status === 'active');
  }

  // Private methods
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  private generateFingerprint(error: Error): string {
    const content = `${error.name}:${error.message}`;
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private determineSeverity(error: Error): TrackedError['severity'] {
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return 'critical';
    }
    if (error.name === 'DatabaseError') {
      return 'high';
    }
    return 'medium';
  }

  private sanitizeContext(context: ErrorContext): ErrorContext {
    const sanitized = JSON.parse(JSON.stringify(context));
    this.removeSensitiveData(sanitized, this.config.sensitiveDataKeys);
    return sanitized;
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    this.config.sensitiveDataKeys.forEach(key => {
      Object.keys(sanitized).forEach(headerKey => {
        if (headerKey.toLowerCase().includes(key.toLowerCase())) {
          sanitized[headerKey] = '[REDACTED]';
        }
      });
    });
    return sanitized;
  }

  private removeSensitiveData(obj: any, sensitiveKeys: string[]): void {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      const isSensitive = sensitiveKeys.some(sensitiveKey => 
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      );
      
      if (isSensitive) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        this.removeSensitiveData(obj[key], sensitiveKeys);
      }
    });
  }

  private async storeError(error: TrackedError): Promise<void> {
    try {
      await this.redis.setex(
        `error:${error.fingerprint}`,
        86400,
        JSON.stringify(error)
      );
    } catch (err) {
      logger.error('Failed to store error', LogCategory.SYSTEM);
    }
  }

  private async checkAlertRules(error: TrackedError): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;
      
      if (rule.lastTriggered) {
        const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
        if (timeSinceLastTrigger < rule.cooldown * 60000) continue;
      }
      
      const shouldTrigger = await this.evaluateAlertRule(rule, error);
      if (shouldTrigger) {
        await this.triggerAlert(rule, error);
        rule.lastTriggered = new Date();
      }
    }
  }

  private async evaluateAlertRule(rule: AlertRule, error: TrackedError): Promise<boolean> {
    if (rule.conditions.severity && !rule.conditions.severity.includes(error.severity)) {
      return false;
    }

    if (rule.conditions.errorCount) {
      const windowStart = Date.now() - (rule.conditions.errorCount.timeWindow * 60000);
      const recentErrors = this.errorBuffer.timestamps.filter(ts => ts > windowStart);
      if (recentErrors.length < rule.conditions.errorCount.threshold) {
        return false;
      }
    }

    return true;
  }

  private async triggerAlert(rule: AlertRule, error: TrackedError): Promise<void> {
    const alert: Alert = {
      id: crypto.randomUUID(),
      ruleId: rule.id,
      title: `Alert: ${rule.name}`,
      message: `Error detected: ${error.message}`,
      severity: error.severity,
      timestamp: new Date(),
      status: 'active',
      context: {
        errorIds: [error.id],
        errorCount: error.count,
        triggerCondition: rule.name,
      },
    };
    
    this.alerts.push(alert);
    
    for (const action of rule.actions) {
      try {
        await this.executeAlertAction(action, alert, error);
      } catch (err) {
        logger.error('Alert action failed', LogCategory.SYSTEM);
      }
    }
    
    logger.info('Alert triggered', LogCategory.SYSTEM, {
      metadata: { alertId: alert.id, ruleId: rule.id }
    });
  }

  private async executeAlertAction(action: AlertAction, alert: Alert, error: TrackedError): Promise<void> {
    switch (action.type) {
      case 'email':
        await this.sendEmailAlert(action, alert, error);
        break;
      case 'webhook':
        await this.sendWebhookAlert(action, alert, error);
        break;
    }
  }

  private async sendEmailAlert(action: AlertAction, alert: Alert, error: TrackedError): Promise<void> {
    if (!this.emailTransporter || !action.configuration.recipients) return;
    
    const html = `
      <h2>${alert.title}</h2>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Error:</strong> ${error.message}</p>
      <p><strong>Type:</strong> ${error.type}</p>
      <p><strong>Count:</strong> ${error.count}</p>
      <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
    `;
    
    await this.emailTransporter.sendMail({
      from: this.config.email.from,
      to: action.configuration.recipients.join(', '),
      subject: `TestBro Alert: ${alert.title}`,
      html,
    });
  }

  private async sendWebhookAlert(action: AlertAction, alert: Alert, error: TrackedError): Promise<void> {
    if (!action.configuration.url) return;
    
    const payload = { alert, error };
    
    await fetch(action.configuration.url, {
      method: action.configuration.method || 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  private groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, number> {
    return array.reduce((result, item) => {
      const group = String(item[key]);
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {} as Record<string, number>);
  }

  private initializeEmailTransporter(): void {
    if (!this.config.email.enabled || !this.config.email.smtp) return;
    
    this.emailTransporter = nodemailer.createTransport(this.config.email.smtp);
    logger.info('Email transporter initialized', LogCategory.SYSTEM);
  }

  private async loadAlertRules(): Promise<void> {
    try {
      const rulesData = await this.redis.get('error_tracking:alert_rules');
      if (rulesData) {
        this.alertRules = JSON.parse(rulesData);
      }
    } catch (error) {
      logger.error('Failed to load alert rules', LogCategory.SYSTEM);
    }
  }

  private async saveAlertRules(): Promise<void> {
    try {
      await this.redis.set('error_tracking:alert_rules', JSON.stringify(this.alertRules));
    } catch (error) {
      logger.error('Failed to save alert rules', LogCategory.SYSTEM);
    }
  }

  private startPeriodicProcessing(): void {
    setInterval(() => {
      // Clean up old errors and alerts
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      this.errorBuffer.timestamps = this.errorBuffer.timestamps.filter(ts => ts > oneWeekAgo);
      
      if (this.alerts.length > 1000) {
        this.alerts = this.alerts.slice(-500);
      }
    }, 300000); // Every 5 minutes
  }
}

export default ErrorTrackingService;