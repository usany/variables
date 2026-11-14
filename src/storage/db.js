import sqlite3 from 'sqlite3';
import { SecureEncryption } from './encryption.js';
import { logError, logSuccess, logInfo } from '../utils/logger.js';

/**
 * Secure database storage for environment variables
 * - Encrypts all secret values
 * - Maintains access logs
 * - Supports access control
 */
export class SecureEnvDB {
  constructor(dbFile = 'env-store.db', encryptionKey = null) {
    this.dbFile = dbFile;
    this.db = null;
    
    if (!encryptionKey) {
      throw new Error('Encryption key required. Generate one with: SecureEncryption.generateKey()');
    }
    
    this.encryption = new SecureEncryption(encryptionKey);
  }

  /**
   * Initialize the database with required tables
   */
  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbFile, (err) => {
        if (err) reject(err);
      });

      // Enable foreign keys
      this.db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) reject(err);
      });

      // Create tables
      this.db.serialize(() => {
        // Secrets table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS secrets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            encrypted_value TEXT NOT NULL,
            value_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT,
            description TEXT
          )
        `);

        // Access log table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS access_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            secret_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            user TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            FOREIGN KEY (secret_id) REFERENCES secrets(id) ON DELETE CASCADE
          )
        `);

        // Create indexes
        this.db.run('CREATE INDEX IF NOT EXISTS idx_secrets_key ON secrets(key)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_access_logs_secret ON access_logs(secret_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp)');

        resolve();
      });
    });
  }

  /**
   * Set a secret value
   */
  async set(key, value, createdBy = 'unknown', description = '') {
    return new Promise((resolve, reject) => {
      const encryptedValue = this.encryption.encrypt(value);
      const valueHash = SecureEncryption.hash(value);

      this.db.run(
        `INSERT OR REPLACE INTO secrets 
         (key, encrypted_value, value_hash, created_by, description, updated_at) 
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [key, encryptedValue, valueHash, createdBy, description],
        function(err) {
          if (err) {
            reject(new Error(`Failed to set secret: ${err.message}`));
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  /**
   * Get a decrypted secret value
   */
  async get(key, user = 'unknown') {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id, encrypted_value FROM secrets WHERE key = ?',
        [key],
        (err, row) => {
          if (err) {
            reject(new Error(`Failed to get secret: ${err.message}`));
          } else if (!row) {
            resolve(null);
          } else {
            try {
              const decryptedValue = this.encryption.decrypt(row.encrypted_value);
              this._logAccess(row.id, 'READ', user);
              resolve(decryptedValue);
            } catch (error) {
              reject(error);
            }
          }
        }
      );
    });
  }

  /**
   * List all keys (values remain encrypted in DB)
   */
  async listKeys() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT id, key, created_at, updated_at, created_by, description FROM secrets ORDER BY key',
        (err, rows) => {
          if (err) {
            reject(new Error(`Failed to list keys: ${err.message}`));
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  /**
   * Delete a secret
   */
  async delete(key, user = 'unknown') {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM secrets WHERE key = ?',
        [key],
        function(err) {
          if (err) {
            reject(new Error(`Failed to delete secret: ${err.message}`));
          } else {
            if (this.changes > 0) {
              resolve(true);
            } else {
              resolve(false);
            }
          }
        }
      );
    });
  }

  /**
   * Get access logs for a secret
   */
  async getAccessLogs(key, limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT l.* FROM access_logs l
         JOIN secrets s ON l.secret_id = s.id
         WHERE s.key = ?
         ORDER BY l.timestamp DESC
         LIMIT ?`,
        [key, limit],
        (err, rows) => {
          if (err) {
            reject(new Error(`Failed to get access logs: ${err.message}`));
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  /**
   * Get all access logs
   */
  async getAllAccessLogs(limit = 100) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT l.id, s.key, l.action, l.user, l.timestamp, l.ip_address 
         FROM access_logs l
         JOIN secrets s ON l.secret_id = s.id
         ORDER BY l.timestamp DESC
         LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) {
            reject(new Error(`Failed to get access logs: ${err.message}`));
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  /**
   * Verify a secret hasn't changed (using hash)
   */
  async verify(key, value) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT value_hash FROM secrets WHERE key = ?',
        [key],
        (err, row) => {
          if (err) {
            reject(new Error(`Failed to verify secret: ${err.message}`));
          } else if (!row) {
            resolve(false);
          } else {
            const isValid = SecureEncryption.verify(value, row.value_hash);
            resolve(isValid);
          }
        }
      );
    });
  }

  /**
   * Export to encrypted JSON file
   */
  async exportToFile(filename, exportKey) {
    try {
      const keys = await this.listKeys();
      const secrets = {};

      for (const k of keys) {
        const value = await this.get(k.key);
        secrets[k.key] = value;
      }

      const exportEncryption = new SecureEncryption(exportKey);
      const encryptedExport = exportEncryption.encrypt(JSON.stringify(secrets));

      return { secrets, encryptedExport };
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * Import from encrypted JSON
   */
  async importFromFile(encryptedData, exportKey, importedBy = 'unknown') {
    try {
      const exportEncryption = new SecureEncryption(exportKey);
      const decrypted = exportEncryption.decrypt(encryptedData);
      const secrets = JSON.parse(decrypted);

      let count = 0;
      for (const [key, value] of Object.entries(secrets)) {
        await this.set(key, value, importedBy, 'Imported');
        count++;
      }

      return count;
    } catch (error) {
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  /**
   * Close database connection
   */
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Internal: Log access to a secret
   */
  _logAccess(secretId, action, user, ipAddress = null) {
    this.db.run(
      'INSERT INTO access_logs (secret_id, action, user, ip_address) VALUES (?, ?, ?, ?)',
      [secretId, action, user, ipAddress],
      (err) => {
        if (err) {
          console.error('Failed to log access:', err.message);
        }
      }
    );
  }
}
