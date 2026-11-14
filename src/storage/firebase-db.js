import admin from 'firebase-admin';
import { SecureEncryption } from './encryption.js';

/**
 * Firebase Firestore implementation for secure secret storage
 * 
 * Benefits:
 * - No infrastructure to manage
 * - Auto-scaling
 * - Built-in backups
 * - Global distribution
 * - Audit logging
 * 
 * Setup:
 * 1. npm install firebase-admin
 * 2. export FIREBASE_PROJECT_ID="your-project"
 * 3. export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
 */
export class FirebaseEnvDB {
  constructor(encryptionKey, projectId = null) {
    if (!encryptionKey) {
      throw new Error('Encryption key is required');
    }

    this.encryption = new SecureEncryption(encryptionKey);
    
    // Initialize Firebase if not already initialized
    if (!admin.apps.length) {
      const config = {
        credential: admin.credential.applicationDefault(),
      };

      // Use provided projectId or from environment
      const projectId_ = projectId || process.env.FIREBASE_PROJECT_ID;
      if (projectId_) {
        config.projectId = projectId_;
      }

      admin.initializeApp(config);
    }

    this.db = admin.firestore();
  }

  /**
   * Set a secret value
   */
  async set(key, value, createdBy = 'unknown', description = '') {
    const encryptedValue = this.encryption.encrypt(value);
    const valueHash = SecureEncryption.hash(value);

    await this.db.collection('secrets').doc(key).set({
      key,
      encrypted_value: encryptedValue,
      value_hash: valueHash,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: createdBy,
      description
    });

    return key;
  }

  /**
   * Get and decrypt a secret value
   */
  async get(key, user = 'unknown') {
    const doc = await this.db.collection('secrets').doc(key).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    
    try {
      const decrypted = this.encryption.decrypt(data.encrypted_value);
      
      // Log access
      await this._logAccess(key, 'READ', user);

      return decrypted;
    } catch (error) {
      throw new Error(`Failed to decrypt secret: ${error.message}`);
    }
  }

  /**
   * List all secret keys (values encrypted)
   */
  async listKeys() {
    const snapshot = await this.db.collection('secrets')
      .orderBy('key')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      key: doc.data().key,
      created_at: doc.data().created_at,
      updated_at: doc.data().updated_at,
      created_by: doc.data().created_by,
      description: doc.data().description
    }));
  }

  /**
   * Delete a secret
   */
  async delete(key, user = 'unknown') {
    const doc = await this.db.collection('secrets').doc(key).get();

    if (!doc.exists) {
      return false;
    }

    await this.db.collection('secrets').doc(key).delete();
    await this._logAccess(key, 'DELETE', user);

    return true;
  }

  /**
   * Verify secret integrity
   */
  async verify(key, value) {
    const doc = await this.db.collection('secrets').doc(key).get();

    if (!doc.exists) {
      return false;
    }

    const data = doc.data();
    return SecureEncryption.verify(value, data.value_hash);
  }

  /**
   * Get access logs for a specific secret
   */
  async getAccessLogs(key, limit = 50) {
    const snapshot = await this.db.collection('access_logs')
      .where('secret_id', '==', key)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Get all access logs
   */
  async getAllAccessLogs(limit = 100) {
    const snapshot = await this.db.collection('access_logs')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Export to encrypted JSON
   */
  async exportToFile(exportKey) {
    const keys = await this.listKeys();
    const secrets = {};

    for (const k of keys) {
      const value = await this.get(k.key);
      secrets[k.key] = value;
    }

    const exportEncryption = new SecureEncryption(exportKey);
    const encryptedExport = exportEncryption.encrypt(JSON.stringify(secrets));

    return { secrets, encryptedExport };
  }

  /**
   * Import from encrypted JSON
   */
  async importFromFile(encryptedData, exportKey, importedBy = 'unknown') {
    const exportEncryption = new SecureEncryption(exportKey);
    const decrypted = exportEncryption.decrypt(encryptedData);
    const secrets = JSON.parse(decrypted);

    let count = 0;
    for (const [key, value] of Object.entries(secrets)) {
      await this.set(key, value, importedBy, 'Imported');
      count++;
    }

    return count;
  }

  /**
   * Create database indexes (run once)
   * Firestore requires composite indexes for complex queries
   */
  async createIndexes() {
    console.log('Firestore indexes are auto-managed.');
    console.log('If needed, visit: https://console.firebase.google.com');
    return true;
  }

  /**
   * Check connection
   */
  async health() {
    try {
      await this.db.collection('secrets').limit(1).get();
      return { status: 'healthy', database: 'Firebase Firestore' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Internal: Log access to a secret
   */
  async _logAccess(secretId, action, user, ipAddress = null) {
    try {
      await this.db.collection('access_logs').add({
        secret_id: secretId,
        action,
        user,
        timestamp: new Date(),
        ip_address: ipAddress || null
      });
    } catch (error) {
      console.error('Failed to log access:', error.message);
    }
  }
}
