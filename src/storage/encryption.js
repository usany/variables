import crypto from 'crypto';

/**
 * Encryption utilities for storing secrets safely
 */
export class SecureEncryption {
  constructor(masterKey) {
    // Master key should be 32 bytes for AES-256
    if (!masterKey) {
      throw new Error('Master key is required');
    }
    
    // If string, hash it to 32 bytes
    if (typeof masterKey === 'string') {
      this.masterKey = crypto
        .createHash('sha256')
        .update(masterKey)
        .digest();
    } else {
      this.masterKey = masterKey;
    }
  }

  /**
   * Encrypt a secret value
   * Returns: iv:encryptedData:authTag (all base64 encoded)
   */
  encrypt(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV, encrypted data, and auth tag
    return [
      iv.toString('base64'),
      encrypted,
      authTag.toString('base64')
    ].join(':');
  }

  /**
   * Decrypt a secret value
   */
  decrypt(encryptedData) {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'base64');
      const encrypted = parts[1];
      const authTag = Buffer.from(parts[2], 'base64');

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash a value using PBKDF2 (one-way, for verification)
   */
  static hash(value, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16);
    }

    const hash = crypto.pbkdf2Sync(value, salt, 100000, 64, 'sha256');
    return salt.toString('base64') + ':' + hash.toString('base64');
  }

  /**
   * Verify a hashed value
   */
  static verify(value, storedHash) {
    const [saltBase64, hashBase64] = storedHash.split(':');
    const salt = Buffer.from(saltBase64, 'base64');
    const hash = crypto.pbkdf2Sync(value, salt, 100000, 64, 'sha256');
    return hash.toString('base64') === hashBase64;
  }

  /**
   * Generate a random encryption key
   */
  static generateKey() {
    return crypto.randomBytes(32).toString('base64');
  }
}
