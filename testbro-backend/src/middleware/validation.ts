import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { formatValidationError } from './errorHandler';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';
import rateLimit from 'express-rate-limit';

// Extend Express Request interface to include multer file properties
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

declare global {
  namespace Express {
    interface Request {
      file?: MulterFile;
      files?: { [fieldname: string]: MulterFile[] } | MulterFile[];
    }
  }
}

// Security configuration for validation
const SECURITY_LIMITS = {
  MAX_STRING_LENGTH: 10000,
  MAX_ARRAY_LENGTH: 1000,
  MAX_OBJECT_DEPTH: 10,
  MAX_REQUEST_SIZE: '10mb',
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
};

// Custom Joi extensions for enhanced security
const customJoi = Joi.extend({
  type: 'string',
  base: Joi.string(),
  rules: {
    sanitized: {
      validate(value: string, helpers: any) {
        // HTML sanitization
        const sanitized = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
        if (sanitized !== value) {
          return helpers.error('string.sanitized');
        }
        return sanitized;
      },
    },
    xssSafe: {
      validate(value: string, helpers: any) {
        // Check for common XSS patterns
        const xssPatterns = [
          /<script[^>]*>.*?<\/script>/gi,
          /javascript:/gi,
          /on\w+=/gi,
          /<iframe[^>]*>.*?<\/iframe>/gi,
          /<object[^>]*>.*?<\/object>/gi,
          /<embed[^>]*>.*?<\/embed>/gi,
        ];
        
        for (const pattern of xssPatterns) {
          if (pattern.test(value)) {
            return helpers.error('string.xssSafe');
          }
        }
        return value;
      },
    },
    sqlSafe: {
      validate(value: string, helpers: any) {
        // Check for SQL injection patterns
        const sqlPatterns = [
          /('|(\-\-)|(;)|(\||\|)|(\*|\*))/gi,
          /(union|select|insert|delete|update|drop|create|alter|exec|execute)/gi,
        ];
        
        for (const pattern of sqlPatterns) {
          if (pattern.test(value)) {
            return helpers.error('string.sqlSafe');
          }
        }
        return value;
      },
    },
  },
  messages: {
    'string.sanitized': 'Value contains potentially dangerous HTML content',
    'string.xssSafe': 'Value contains potentially dangerous script content',
    'string.sqlSafe': 'Value contains potentially dangerous SQL content',
  },
});

// Enhanced validation schemas with security features
export const schemas = {
  // Authentication validation
  login: customJoi.object({
    email: customJoi.string().email().max(254).sanitized().required(),
    password: customJoi.string().min(8).max(128).required(),
    remember_me: customJoi.boolean().optional(),
    captcha_token: customJoi.string().when('$requireCaptcha', {
      is: true,
      then: customJoi.string().required(),
      otherwise: customJoi.optional(),
    }),
  }),

  signup: customJoi.object({
    email: customJoi.string().email().max(254).sanitized().required(),
    password: customJoi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'password strength')
      .required()
      .messages({
        'string.pattern.name': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      }),
    confirm_password: customJoi.string().valid(customJoi.ref('password')).required().messages({
      'any.only': 'Passwords do not match',
    }),
    user_metadata: customJoi.object({
      full_name: customJoi.string().max(100).sanitized().optional(),
      company: customJoi.string().max(100).sanitized().optional(),
      phone: customJoi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    }).optional(),
    terms_accepted: customJoi.boolean().valid(true).required(),
    marketing_consent: customJoi.boolean().optional(),
  }),

  // Project validation with enhanced security
  createProject: customJoi.object({
    name: customJoi.string().min(1).max(100).sanitized().xssSafe().required(),
    description: customJoi.string().max(1000).sanitized().xssSafe().optional(),
    settings: customJoi.object({
      default_browser: customJoi.string().valid('chromium', 'firefox', 'webkit').optional(),
      timeout_seconds: customJoi.number().min(1).max(300).optional(),
      retries: customJoi.number().min(0).max(5).optional(),
      parallel_execution: customJoi.boolean().optional(),
      max_concurrent_executions: customJoi.number().min(1).max(10).optional(),
      notifications: customJoi.object({
        email: customJoi.boolean().optional(),
        slack: customJoi.boolean().optional(),
        webhook: customJoi.string().uri().max(2048).optional(),
      }).optional(),
      security: customJoi.object({
        require_approval: customJoi.boolean().optional(),
        allowed_domains: customJoi.array().items(customJoi.string().domain()).max(100).optional(),
        ip_whitelist: customJoi.array().items(customJoi.string().ip()).max(50).optional(),
      }).optional(),
    }).optional(),
    tags: customJoi.array().items(customJoi.string().max(50).sanitized()).max(20).optional(),
  }),

  updateProject: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional(),
    settings: Joi.object({
      default_browser: Joi.string().valid('chromium', 'firefox', 'webkit').optional(),
      timeout_seconds: Joi.number().min(1).max(300).optional(),
      retries: Joi.number().min(0).max(5).optional(),
      parallel_execution: Joi.boolean().optional(),
      notifications: Joi.object({
        email: Joi.boolean().optional(),
        slack: Joi.boolean().optional(),
        webhook: Joi.string().uri().optional(),
      }).optional(),
    }).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }),

  // Test Target validation
  createTestTarget: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    url: Joi.string().uri().required(),
    platform: Joi.string().valid('web', 'mobile-web', 'mobile-app').required(),
    environment: Joi.string().valid('production', 'staging', 'development').required(),
    project_id: Joi.string().uuid().required(),
    auth_config: Joi.object({
      type: Joi.string().valid('basic', 'oauth', 'api-key').optional(),
      credentials: Joi.object().optional(),
    }).optional(),
  }),

  // Test Case validation
  createTestCase: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).optional(),
    project_id: Joi.string().uuid().required(),
    suite_id: Joi.string().uuid().optional(),
    target_id: Joi.string().uuid().required(),
    steps: Joi.array().items(
      Joi.object({
        id: Joi.string().optional(),
        order: Joi.number().min(0).required(),
        action: Joi.string().valid('click', 'type', 'navigate', 'wait', 'verify', 'upload', 'select', 'scroll').required(),
        element: Joi.string().optional(),
        value: Joi.string().optional(),
        description: Joi.string().required(),
        timeout: Joi.number().min(1000).max(60000).optional(),
        screenshot: Joi.boolean().optional(),
        ai_context: Joi.string().optional(),
      })
    ).min(1).required(),
    tags: Joi.array().items(Joi.string()).optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  }),

  // Test Step validation for updates
  updateTestStep: Joi.object({
    action: Joi.string().valid('click', 'type', 'navigate', 'wait', 'verify', 'upload', 'select', 'scroll').optional(),
    element: Joi.string().optional(),
    value: Joi.string().optional(),
    description: Joi.string().optional(),
    timeout: Joi.number().min(1000).max(60000).optional(),
    screenshot: Joi.boolean().optional(),
    ai_context: Joi.string().optional(),
  }).min(1), // At least one field must be provided for update

  // Test Step validation for creation
  createTestStep: Joi.object({
    action: Joi.string().valid('click', 'type', 'navigate', 'wait', 'verify', 'upload', 'select', 'scroll').required(),
    element: Joi.string().optional(),
    value: Joi.string().optional(),
    description: Joi.string().required(),
    timeout: Joi.number().min(1000).max(60000).optional(),
    screenshot: Joi.boolean().optional(),
    ai_context: Joi.string().optional(),
  }),

  // Test Suite validation
  createTestSuite: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).optional(),
    project_id: Joi.string().uuid().required(),
    test_case_ids: Joi.array().items(Joi.string().uuid()).optional(),
    target_id: Joi.string().uuid().required(),
    execution_config: Joi.object({
      parallel: Joi.boolean().optional(),
      max_concurrent: Joi.number().min(1).max(10).optional(),
      fail_fast: Joi.boolean().optional(),
      retry_failed: Joi.boolean().optional(),
      retry_count: Joi.number().min(0).max(3).optional(),
    }).optional(),
    schedule: Joi.object({
      enabled: Joi.boolean().required(),
      cron_expression: Joi.string().when('enabled', {
        is: true,
        then: Joi.string().required(),
        otherwise: Joi.optional(),
      }),
      timezone: Joi.string().optional(),
    }).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }),

  // Test Execution validation
  executeTest: Joi.object({
    test_case_id: Joi.string().uuid().optional(),
    suite_id: Joi.string().uuid().optional(),
    target_id: Joi.string().uuid().required(),
    browser: Joi.string().valid('chromium', 'firefox', 'webkit').optional(),
    environment: Joi.string().optional(),
    parallel: Joi.boolean().optional(),
  }).or('test_case_id', 'suite_id'),

  // AI Test Generation validation
  generateTest: Joi.object({
    prompt: Joi.string().min(10).max(2000).required(),
    target_url: Joi.string().uri().required(),
    project_id: Joi.string().uuid().required(),
    target_id: Joi.string().uuid().required(),
    model: Joi.string().valid('openai/gpt-4', 'openai/gpt-3.5-turbo', 'anthropic/claude-3-haiku', 'anthropic/claude-3-sonnet').optional(),
  }),

  // Organization validation
  createOrganization: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    settings: Joi.object({
      max_users: Joi.number().min(1).max(1000).optional(),
      max_projects: Joi.number().min(1).max(100).optional(),
      max_tests_per_month: Joi.number().min(0).optional(),
      features: Joi.array().items(Joi.string()).optional(),
    }).optional(),
  }),

  // User invitation validation
  inviteUser: Joi.object({
    email: Joi.string().email().required(),
    role: Joi.string().valid('admin', 'editor', 'viewer').required(),
    organization_id: Joi.string().uuid().required(),
  }),

  // Webhook validation
  createWebhook: Joi.object({
    url: Joi.string().uri().required(),
    events: Joi.array().items(
      Joi.string().valid('execution_complete', 'execution_failed', 'test_created', 'project_updated')
    ).min(1).required(),
    secret: Joi.string().min(16).max(128).optional(),
    active: Joi.boolean().optional(),
  }),

  // API Key validation
  createApiKey: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    permissions: Joi.array().items(
      Joi.string().valid('read', 'write', 'delete', 'execute')
    ).min(1).required(),
    expires_at: Joi.date().greater('now').optional(),
  }),

  // Pagination validation
  pagination: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    sort_by: Joi.string().optional(),
    sort_order: Joi.string().valid('asc', 'desc').optional(),
  }),

  // Filter validation
  testFilters: Joi.object({
    project_id: Joi.string().uuid().optional(),
    suite_id: Joi.string().uuid().optional(),
    target_id: Joi.string().uuid().optional(),
    status: Joi.string().valid('draft', 'active', 'archived').optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    ai_generated: Joi.boolean().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    search: Joi.string().min(1).max(100).optional(),
  }),

  executionFilters: Joi.object({
    project_id: Joi.string().uuid().optional(),
    target_id: Joi.string().uuid().optional(),
    status: Joi.string().valid('queued', 'running', 'completed', 'failed', 'cancelled').optional(),
    browser: Joi.string().valid('chromium', 'firefox', 'webkit').optional(),
    environment: Joi.string().optional(),
    initiated_by: Joi.string().uuid().optional(),
    date_from: Joi.date().iso().optional(),
    date_to: Joi.date().iso().greater(Joi.ref('date_from')).optional(),
  }),
};

// Enhanced validation middleware factory with security features
export const validate = (schema: Joi.ObjectSchema, options: {
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  sanitize?: boolean;
  context?: Record<string, any>;
} = {}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Pre-validation security checks
      const requestSize = JSON.stringify(req.body).length;
      if (requestSize > 1024 * 1024) { // 1MB limit for request body
        res.status(413).json({
          error: 'PAYLOAD_TOO_LARGE',
          message: 'Request body exceeds maximum allowed size',
          code: 'REQUEST_SIZE_LIMIT',
        });
        return;
      }

      // Content-Type validation for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.headers['content-type'];
        if (!contentType || (!contentType.includes('application/json') && !contentType.includes('multipart/form-data'))) {
          res.status(415).json({
            error: 'UNSUPPORTED_MEDIA_TYPE',
            message: 'Content-Type must be application/json or multipart/form-data',
            code: 'INVALID_CONTENT_TYPE',
          });
          return;
        }
      }

      // Deep object validation to prevent prototype pollution
      if (hasProtoProperty(req.body)) {
        res.status(400).json({
          error: 'SECURITY_ERROR',
          message: 'Request contains potentially dangerous properties',
          code: 'PROTOTYPE_POLLUTION',
        });
        return;
      }

      // Validate against schema
      const validationOptions = {
        abortEarly: false,
        allowUnknown: options.allowUnknown || false,
        stripUnknown: options.stripUnknown || true,
        context: options.context || {},
      };

      const { error, value } = schema.validate(req.body, validationOptions);

      if (error) {
        const securityError = checkForSecurityViolations(error);
        if (securityError) {
          res.status(400).json({
            error: 'SECURITY_VIOLATION',
            message: securityError,
            code: 'VALIDATION_SECURITY_ERROR',
          });
          return;
        }

        res.status(400).json(formatValidationError(error));
        return;
      }

      // Additional sanitization if requested
      if (options.sanitize) {
        req.body = await deepSanitize(value);
      } else {
        req.body = value;
      }

      // Log validation success for audit (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`✓ Validation passed for ${req.method} ${req.path}`);
      }

      next();
    } catch (validationError) {
      console.error('Validation middleware error:', validationError);
      res.status(500).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        code: 'VALIDATION_SYSTEM_ERROR',
      });
    }
  };
};

// Enhanced query parameter validation with security
export const validateQuery = (schema: Joi.ObjectSchema, options: {
  sanitize?: boolean;
  maxQueryParams?: number;
} = {}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Limit number of query parameters
      const queryKeys = Object.keys(req.query);
      if (queryKeys.length > (options.maxQueryParams || 50)) {
        res.status(400).json({
          error: 'TOO_MANY_PARAMS',
          message: 'Too many query parameters',
          code: 'QUERY_PARAM_LIMIT',
        });
        return;
      }

      // Check for suspicious query parameter names
      const suspiciousParams = queryKeys.filter(key => 
        /(__proto__|constructor|prototype)/i.test(key) ||
        key.length > 100 ||
        /<script|javascript:|data:/i.test(key)
      );

      if (suspiciousParams.length > 0) {
        res.status(400).json({
          error: 'SUSPICIOUS_PARAMS',
          message: 'Query contains suspicious parameter names',
          code: 'SECURITY_QUERY_ERROR',
        });
        return;
      }

      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        res.status(400).json(formatValidationError(error));
        return;
      }

      // Sanitize query values if requested
      if (options.sanitize) {
        req.query = sanitizeObject(value);
      } else {
        req.query = value;
      }

      next();
    } catch (error) {
      console.error('Query validation error:', error);
      res.status(500).json({
        error: 'QUERY_VALIDATION_ERROR',
        message: 'Query validation failed',
      });
    }
  };
};

// Enhanced params validation
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Security check for parameter names
      const paramKeys = Object.keys(req.params);
      const suspiciousParams = paramKeys.filter(key => 
        /(__proto__|constructor|prototype)/i.test(key) ||
        key.length > 50
      );

      if (suspiciousParams.length > 0) {
        res.status(400).json({
          error: 'SUSPICIOUS_PARAMS',
          message: 'URL parameters contain suspicious names',
          code: 'SECURITY_PARAM_ERROR',
        });
        return;
      }

      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        res.status(400).json(formatValidationError(error));
        return;
      }

      req.params = value;
      next();
    } catch (error) {
      console.error('Params validation error:', error);
      res.status(500).json({
        error: 'PARAM_VALIDATION_ERROR',
        message: 'Parameter validation failed',
      });
    }
  };
};

// Security utility functions
function hasProtoProperty(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  
  for (const key in obj) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return true;
    }
    if (typeof obj[key] === 'object' && hasProtoProperty(obj[key])) {
      return true;
    }
  }
  return false;
}

function checkForSecurityViolations(error: Joi.ValidationError): string | null {
  for (const detail of error.details) {
    if (detail.type.includes('sanitized') || 
        detail.type.includes('xssSafe') || 
        detail.type.includes('sqlSafe')) {
      return `Security violation detected: ${detail.message}`;
    }
  }
  return null;
}

async function deepSanitize(obj: any): Promise<any> {
  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj, { ALLOWED_TAGS: [] });
  }
  
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => deepSanitize(item)));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
        sanitized[key] = await deepSanitize(value);
      }
    }
    return sanitized;
  }
  
  return obj;
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return validator.escape(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }
  
  return obj;
}

// File upload validation middleware
export const validateFileUpload = (options: {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  maxFiles?: number;
} = {}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.file && !req.files) {
        return next();
      }

      const files: any[] = [];
      if (req.file) {
        files.push(req.file);
      } else if (req.files) {
        if (Array.isArray(req.files)) {
          files.push(...req.files);
        } else {
          // Handle multer's files object format
          Object.values(req.files).forEach(fileArray => {
            if (Array.isArray(fileArray)) {
              files.push(...fileArray);
            } else {
              files.push(fileArray);
            }
          });
        }
      }

      const maxSize = options.maxFileSize || SECURITY_LIMITS.MAX_FILE_SIZE;
      const allowedTypes = options.allowedMimeTypes || SECURITY_LIMITS.ALLOWED_FILE_TYPES;
      const maxFiles = options.maxFiles || 10;

      if (files.length > maxFiles) {
        res.status(400).json({
          error: 'TOO_MANY_FILES',
          message: `Maximum ${maxFiles} files allowed`,
          code: 'FILE_COUNT_LIMIT',
        });
        return;
      }

      for (const file of files) {
        // Check file size
        if (file.size && file.size > maxSize) {
          res.status(400).json({
            error: 'FILE_TOO_LARGE',
            message: `File size exceeds ${maxSize} bytes`,
            code: 'FILE_SIZE_LIMIT',
          });
          return;
        }

        // Check MIME type
        if (file.mimetype && !allowedTypes.includes(file.mimetype)) {
          res.status(400).json({
            error: 'INVALID_FILE_TYPE',
            message: `File type ${file.mimetype} is not allowed`,
            code: 'FILE_TYPE_ERROR',
          });
          return;
        }

        // Check filename for suspicious patterns
        const filename = file.originalname || file.filename || file.name || '';
        if (/\.\.|[<>:"|?*\x00-\x1f\x80-\x9f]/g.test(filename)) {
          res.status(400).json({
            error: 'INVALID_FILENAME',
            message: 'Filename contains invalid characters',
            code: 'FILENAME_ERROR',
          });
          return;
        }
      }

      next();
    } catch (error) {
      console.error('File validation error:', error);
      res.status(500).json({
        error: 'FILE_VALIDATION_ERROR',
        message: 'File validation failed',
      });
    }
  };
};



// Common param schemas
export const paramSchemas = {
  id: Joi.object({
    id: Joi.string().uuid().required(),
  }),
  idAndStepId: Joi.object({
    id: Joi.string().uuid().required(),
    stepId: Joi.string().required(),
  }),
};
