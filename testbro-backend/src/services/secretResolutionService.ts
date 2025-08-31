import { Page, Browser } from 'playwright';
import { supabaseAdmin, TABLES } from '../config/database';
import { secretsEncryption, SecretValue, DecryptedSecret } from './secretsEncryptionService';
import { logger, LogCategory } from './loggingService';
import { otpManager, IOtpProvider, OtpRequestOptions } from './otpProviderService';

/**
 * Secret Resolution Service for Playwright Test Execution
 * 
 * This service handles secure injection of authentication credentials
 * into test execution at runtime. It provides methods for resolving
 * secret placeholders and performing authentication flows.
 */
export class SecretResolutionService {
  private secretsCache = new Map<string, { secret: DecryptedSecret; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Resolves secret placeholders in test steps and returns actual values
   */
  async resolveSecretsInStep(
    projectId: string,
    stepValue: string,
    userId: string
  ): Promise<string> {
    if (!stepValue || typeof stepValue !== 'string') {
      return stepValue;
    }

    // Find secret placeholders in the format {{secret.key.field}}
    const secretPattern = /\\{\\{secret\\.([^.]+)\\.([^}]+)\\}\\}/g;
    let resolvedValue = stepValue;
    const matches = [...stepValue.matchAll(secretPattern)];

    for (const match of matches) {
      const [placeholder, secretKey, field] = match;
      
      try {
        const secretValue = await this.getSecretField(projectId, secretKey, field, userId);
        resolvedValue = resolvedValue.replace(placeholder, secretValue);
        
        logger.debug('Secret placeholder resolved', LogCategory.SECURITY, {
          projectId,
          secretKey,
          field,
          placeholder: placeholder.substring(0, 20) + '...'
        });
      } catch (error) {
        logger.error('Failed to resolve secret placeholder', LogCategory.SECURITY, {
          projectId,
          secretKey,
          field,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Don't replace the placeholder if resolution fails
        // This allows the test to fail gracefully with a clear error
      }
    }

    return resolvedValue;
  }

  /**
   * Gets a specific field from a secret
   */
  private async getSecretField(
    projectId: string,
    secretKey: string,
    field: string,
    userId: string
  ): Promise<string> {
    const cacheKey = `${projectId}:${secretKey}`;
    const now = Date.now();
    
    // Check cache first
    const cached = this.secretsCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      const value = this.extractFieldFromSecret(cached.secret.value, field);
      if (value) {
        await this.logSecretUsage(cached.secret.id, projectId, userId);
        return value;
      }
    }

    // Fetch from database
    const secret = await this.fetchSecret(projectId, secretKey);
    
    // Update cache
    this.secretsCache.set(cacheKey, {
      secret,
      timestamp: now
    });

    // Log usage
    await this.logSecretUsage(secret.id, projectId, userId);

    const value = this.extractFieldFromSecret(secret.value, field);
    if (!value) {
      throw new Error(`Field '${field}' not found in secret '${secretKey}'`);
    }

    return value;
  }

  /**
   * Fetches and decrypts a secret from the database
   */
  private async fetchSecret(projectId: string, secretKey: string): Promise<DecryptedSecret> {
    const { data: secret, error } = await supabaseAdmin
      .from(TABLES.PROJECT_SECRETS)
      .select('*')
      .eq('project_id', projectId)
      .eq('secret_key', secretKey)
      .eq('is_active', true)
      .single();

    if (error || !secret) {
      throw new Error(`Secret '${secretKey}' not found or inactive`);
    }

    // Decrypt the secret value
    const decryptedValue = secretsEncryption.decryptObject(
      secret.encrypted_value,
      `${projectId}:${secretKey}`
    );

    const decryptedMetadata = secretsEncryption.decryptObject(
      secret.encrypted_metadata,
      `${projectId}:${secretKey}:meta`
    );

    return {
      id: secret.id,
      projectId: secret.project_id,
      secretKey: secret.secret_key,
      secretType: secret.secret_type,
      value: decryptedValue,
      metadata: decryptedMetadata,
      description: secret.description,
      isActive: secret.is_active,
      lastUsedAt: secret.last_used_at,
      usedCount: secret.used_count,
      createdBy: secret.created_by,
      createdAt: secret.created_at,
      updatedAt: secret.updated_at
    };
  }

  /**
   * Extracts a specific field from a secret value object
   */
  private extractFieldFromSecret(secretValue: SecretValue, field: string): string | null {
    switch (field) {
      case 'username':
        return secretValue.username || null;
      case 'password':
        return secretValue.password || null;
      case 'phone':
        return secretValue.phone || null;
      case 'apiKey':
        return secretValue.apiKey || null;
      default:
        // Check custom fields
        if (secretValue.custom && typeof secretValue.custom === 'object') {
          return secretValue.custom[field] || null;
        }
        return null;
    }
  }

  /**
   * Logs secret usage for audit trail
   */
  private async logSecretUsage(
    secretId: string,
    projectId: string,
    userId: string
  ): Promise<void> {
    try {
      await supabaseAdmin.rpc('log_secret_usage', {
        p_secret_id: secretId,
        p_project_id: projectId,
        p_operation: 'USE',
        p_ip_address: null, // Runtime usage doesn't have IP
        p_user_agent: 'TestBro-Playwright-Runner',
        p_metadata: { context: 'test_execution' }
      });
    } catch (error) {
      logger.error('Failed to log secret usage', LogCategory.SECURITY, {
        secretId,
        projectId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Performs username/password authentication flow
   */
  async performUsernamePasswordAuth(
    page: Page,
    projectId: string,
    secretKey: string,
    selectors: {
      usernameField: string;
      passwordField: string;
      submitButton: string;
    },
    userId: string,
    options: {
      waitForNavigation?: boolean;
      timeout?: number;
    } = {}
  ): Promise<void> {
    const { timeout = 30000, waitForNavigation = true } = options;

    try {
      logger.info('Starting username/password authentication', LogCategory.SECURITY, {
        projectId,
        secretKey,
        selectors: Object.keys(selectors)
      });

      // Get credentials
      const username = await this.getSecretField(projectId, secretKey, 'username', userId);
      const password = await this.getSecretField(projectId, secretKey, 'password', userId);

      // Fill username
      await page.fill(selectors.usernameField, username, { timeout });
      await page.waitForTimeout(500); // Small delay for UX

      // Fill password
      await page.fill(selectors.passwordField, password, { timeout });
      await page.waitForTimeout(500);

      // Click submit and optionally wait for navigation
      if (waitForNavigation) {
        await Promise.all([
          page.waitForNavigation({ timeout }),
          page.click(selectors.submitButton)
        ]);
      } else {
        await page.click(selectors.submitButton);
      }

      logger.info('Username/password authentication completed', LogCategory.SECURITY, {
        projectId,
        secretKey
      });
    } catch (error) {
      logger.error('Username/password authentication failed', LogCategory.SECURITY, {
        projectId,
        secretKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Performs phone/OTP authentication flow with enhanced provider support
   */
  async performPhoneOtpAuth(
    page: Page,
    projectId: string,
    secretKey: string,
    selectors: {
      phoneField: string;
      phoneSubmitButton: string;
      otpField: string;
      otpSubmitButton: string;
    },
    userId: string,
    options: {
      timeout?: number;
      otpWaitTime?: number;
      otpProvider?: string; // Provider name (optional, uses default if not specified)
      retries?: number;
      customOtpMessage?: string;
    } = {}
  ): Promise<void> {
    const { timeout = 30000, otpWaitTime = 60000 } = options;

    try {
      logger.info('Starting phone/OTP authentication', LogCategory.SECURITY, {
        projectId,
        secretKey
      });

      // Get phone number
      const phone = await this.getSecretField(projectId, secretKey, 'phone', userId);

      // Fill phone number
      await page.fill(selectors.phoneField, phone, { timeout });
      await page.waitForTimeout(500);

      // Submit phone number
      await page.click(selectors.phoneSubmitButton);
      await page.waitForTimeout(2000); // Wait for OTP to be sent

      // Get OTP from provider (using the manager)
      const otpRequestOptions: OtpRequestOptions = {
        timeout: otpWaitTime,
        customMessage: options.customOtpMessage,
        retries: options.retries || 3
      };
      
      const otp = await otpManager.getOtp(phone, otpRequestOptions, options.otpProvider);

      // Fill OTP
      await page.fill(selectors.otpField, otp, { timeout });
      await page.waitForTimeout(500);

      // Submit OTP
      await page.click(selectors.otpSubmitButton);

      logger.info('Phone/OTP authentication completed', LogCategory.SECURITY, {
        projectId,
        secretKey
      });
    } catch (error) {
      logger.error('Phone/OTP authentication failed', LogCategory.SECURITY, {
        projectId,
        secretKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Clears the secrets cache (useful for testing or when secrets are updated)
   */
  clearCache(): void {
    this.secretsCache.clear();
    logger.debug('Secrets cache cleared', LogCategory.SECURITY);
  }

  /**
   * Gets cache statistics for monitoring
   */
  getCacheStats(): { size: number; entries: Array<{ key: string; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.secretsCache.entries()).map(([key, value]) => ({
      key,
      age: now - value.timestamp
    }));

    return {
      size: this.secretsCache.size,
      entries
    };
  }
}

// Export singleton instance
export const secretResolution = new SecretResolutionService();

// For backward compatibility, re-export OTP types and provider manager
export { otpManager, type IOtpProvider, type OtpRequestOptions } from './otpProviderService';

// Types for auth step configuration
export interface AuthStepConfig {
  type: 'username_password' | 'phone_otp';
  secretKey: string;
  selectors: {
    usernameField?: string;
    passwordField?: string;
    phoneField?: string;
    otpField?: string;
    submitButton?: string;
    phoneSubmitButton?: string;
    otpSubmitButton?: string;
  };
  options?: {
    timeout?: number;
    waitForNavigation?: boolean;
    otpWaitTime?: number;
    retries?: number;
    otpProvider?: string;
  };
}

export interface AuthStepResult {
  success: boolean;
  error?: string;
  duration: number;
  secretsUsed: string[];
}
