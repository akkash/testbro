import crypto from 'crypto';
import { logger, LogCategory } from './loggingService';

/**
 * Secure AES-256 Encryption Service for Project Secrets
 * 
 * This service provides enterprise-grade encryption for sensitive authentication
 * credentials including usernames, passwords, phone numbers, and API keys.
 * 
 * Features:
 * - AES-256-GCM encryption with random IVs
 * - Base64 encoding for database storage
 * - Secure key derivation from master key
 * - Authentication tag verification
 * - Comprehensive error handling and logging
 */
export class SecretsEncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits
  private static readonly SALT_LENGTH = 32; // 256 bits

  private readonly masterKey: Buffer;

  constructor() {
    // Get master key from environment variable
    const masterKeyHex = process.env.SECRETS_MASTER_KEY;
    
    if (!masterKeyHex) {
      throw new Error('SECRETS_MASTER_KEY environment variable is required for secrets encryption');
    }

    if (masterKeyHex.length !== 64) { // 32 bytes = 64 hex characters
      throw new Error('SECRETS_MASTER_KEY must be exactly 64 hex characters (32 bytes)');
    }

    try {
      this.masterKey = Buffer.from(masterKeyHex, 'hex');
    } catch (error) {
      throw new Error('SECRETS_MASTER_KEY must be a valid hex string');
    }

    logger.info('SecretsEncryptionService initialized', LogCategory.SECURITY, {
      algorithm: SecretsEncryptionService.ALGORITHM,
      keyLength: SecretsEncryptionService.KEY_LENGTH
    });
  }

  /**
   * Derives an encryption key from the master key using PBKDF2
   */
  private deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      100000, // iterations
      SecretsEncryptionService.KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * Encrypts a secret value using AES-256-GCM
   * 
   * @param plaintext - The secret value to encrypt
   * @param additionalData - Optional additional authenticated data
   * @returns Base64 encoded encrypted data with salt, IV, and auth tag
   */
  encrypt(plaintext: string, additionalData?: string): string {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty or null value');
    }

    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(SecretsEncryptionService.SALT_LENGTH);
      const iv = crypto.randomBytes(SecretsEncryptionService.IV_LENGTH);

      // Derive encryption key from master key and salt
      const key = this.deriveKey(salt);

      // Create cipher
      const cipher = crypto.createCipher(SecretsEncryptionService.ALGORITHM, key);
      cipher.setAAD(Buffer.from(additionalData || '', 'utf8'));

      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine salt + IV + authTag + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        authTag,
        encrypted
      ]);

      const result = combined.toString('base64');

      logger.debug('Secret encrypted successfully', LogCategory.SECURITY, {
        dataLength: plaintext.length,
        encryptedLength: result.length,
        hasAdditionalData: !!additionalData
      });

      return result;
    } catch (error) {
      logger.error('Failed to encrypt secret', LogCategory.SECURITY, {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypts a secret value using AES-256-GCM
   * 
   * @param encryptedData - Base64 encoded encrypted data
   * @param additionalData - Optional additional authenticated data (must match encryption)
   * @returns Decrypted plaintext value
   */
  decrypt(encryptedData: string, additionalData?: string): string {
    if (!encryptedData) {
      throw new Error('Cannot decrypt empty or null value');
    }

    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');

      // Verify minimum length
      const minLength = SecretsEncryptionService.SALT_LENGTH + 
                       SecretsEncryptionService.IV_LENGTH + 
                       SecretsEncryptionService.TAG_LENGTH;
      
      if (combined.length < minLength) {
        throw new Error('Invalid encrypted data format');
      }

      // Extract components
      let offset = 0;
      const salt = combined.subarray(offset, offset + SecretsEncryptionService.SALT_LENGTH);
      offset += SecretsEncryptionService.SALT_LENGTH;

      const iv = combined.subarray(offset, offset + SecretsEncryptionService.IV_LENGTH);
      offset += SecretsEncryptionService.IV_LENGTH;

      const authTag = combined.subarray(offset, offset + SecretsEncryptionService.TAG_LENGTH);
      offset += SecretsEncryptionService.TAG_LENGTH;

      const encrypted = combined.subarray(offset);

      // Derive the same key used for encryption
      const key = this.deriveKey(salt);

      // Create decipher
      const decipher = crypto.createDecipher(SecretsEncryptionService.ALGORITHM, key);
      decipher.setAuthTag(authTag);
      decipher.setAAD(Buffer.from(additionalData || '', 'utf8'));

      // Decrypt the data
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      const result = decrypted.toString('utf8');

      logger.debug('Secret decrypted successfully', LogCategory.SECURITY, {
        encryptedLength: encryptedData.length,
        decryptedLength: result.length,
        hasAdditionalData: !!additionalData
      });

      return result;
    } catch (error) {
      logger.error('Failed to decrypt secret', LogCategory.SECURITY, {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Encrypts a JSON object containing multiple secret fields
   * 
   * @param secretsObject - Object containing secret fields
   * @param additionalData - Optional additional authenticated data
   * @returns Base64 encoded encrypted JSON
   */
  encryptObject(secretsObject: Record<string, any>, additionalData?: string): string {
    try {
      const jsonString = JSON.stringify(secretsObject);
      return this.encrypt(jsonString, additionalData);
    } catch (error) {
      logger.error('Failed to encrypt secrets object', LogCategory.SECURITY, {
        error: error instanceof Error ? error.message : 'Unknown error',
        fieldCount: Object.keys(secretsObject || {}).length
      });
      throw new Error('Object encryption failed');
    }
  }

  /**
   * Decrypts a JSON object containing multiple secret fields
   * 
   * @param encryptedData - Base64 encoded encrypted JSON
   * @param additionalData - Optional additional authenticated data
   * @returns Decrypted object
   */
  decryptObject<T = Record<string, any>>(encryptedData: string, additionalData?: string): T {
    try {
      const jsonString = this.decrypt(encryptedData, additionalData);
      return JSON.parse(jsonString) as T;
    } catch (error) {
      logger.error('Failed to decrypt secrets object', LogCategory.SECURITY, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Object decryption failed');
    }
  }

  /**
   * Generates a cryptographically secure master key
   * This should only be used for initial setup
   */
  static generateMasterKey(): string {
    const key = crypto.randomBytes(32);
    return key.toString('hex');
  }

  /**
   * Validates that a master key is properly formatted
   */
  static validateMasterKey(keyHex: string): boolean {
    if (!keyHex || keyHex.length !== 64) {
      return false;
    }

    try {
      Buffer.from(keyHex, 'hex');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Securely compares two values to prevent timing attacks
   */
  static secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Masks a secret value for safe display in UI
   */
  static maskSecret(secret: string, visibleChars: number = 4): string {
    if (!secret || secret.length <= visibleChars) {
      return '•'.repeat(8); // Always show 8 dots for short secrets
    }

    const prefix = secret.substring(0, Math.floor(visibleChars / 2));
    const suffix = secret.substring(secret.length - Math.floor(visibleChars / 2));
    const maskLength = Math.max(8, secret.length - visibleChars);

    return `${prefix}${'•'.repeat(maskLength)}${suffix}`;
  }
}

// Export singleton instance
export const secretsEncryption = new SecretsEncryptionService();

// Types for secret management
export interface SecretValue {
  username?: string;
  password?: string;
  phone?: string;
  apiKey?: string;
  custom?: Record<string, string>;
}

export interface EncryptedSecret {
  id: string;
  projectId: string;
  secretKey: string;
  secretType: 'username_password' | 'phone_otp' | 'api_key' | 'custom';
  encryptedValue: string;
  encryptedMetadata: string;
  description?: string;
  isActive: boolean;
  lastUsedAt?: string;
  usedCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DecryptedSecret extends Omit<EncryptedSecret, 'encryptedValue' | 'encryptedMetadata'> {
  value: SecretValue;
  metadata: Record<string, any>;
}

export interface SecretAuditLog {
  id: string;
  secretId?: string;
  projectId: string;
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'USE';
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  metadata: Record<string, any>;
}