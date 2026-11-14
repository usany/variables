import { exec } from 'child_process';
import { promisify } from 'util';
import { SecureEncryption } from './encryption.js';

const execAsync = promisify(exec);

/**
 * SSH-based file storage for encrypted secrets
 * 
 * Stores encrypted database file on remote server via SSH
 * 
 * Setup:
 * export SSH_HOST="134.185.111.151"
 * export SSH_USER="ubuntu"
 * export SSH_KEY="/Users/user/.ssh/id_rsa"
 * export REMOTE_DB_PATH="/home/ubuntu/env-secrets.json"
 */
export class SSHFileDB {
  constructor(encryptionKey, sshConfig = {}) {
    if (!encryptionKey) {
      throw new Error('Encryption key is required');
    }

    this.encryption = new SecureEncryption(encryptionKey);
    
    // SSH Configuration
    this.ssh = {
      host: sshConfig.host || process.env.SSH_HOST || '134.185.111.151',
      user: sshConfig.user || process.env.SSH_USER || 'ubuntu',
      keyPath: sshConfig.keyPath || process.env.SSH_KEY || '/Users/user/.ssh/id_rsa',
      port: sshConfig.port || process.env.SSH_PORT || 22,
      remoteDbPath: sshConfig.remoteDbPath || process.env.REMOTE_DB_PATH || '/home/ubuntu/env-secrets.json'
    };

    // Local cache
    this.localCache = { secrets: {}, logs: [] };
    this.cacheValid = false;
  }

  /**
   * Build SSH command
   */
  _sshCmd(remoteCommand) {
    return `ssh -i ${this.ssh.keyPath} -p ${this.ssh.port} ${this.ssh.user}@${this.ssh.host} "${remoteCommand}"`;
  }

  /**
   * Initialize - test SSH connection
   */
  async init() {
    try {
      await this._testSSHConnection();
      await this._ensureRemoteFileExists();
      await this._loadFromRemote();
      console.log('✓ SSH file database initialized');
    } catch (error) {
      throw new Error(`SSH init failed: ${error.message}`);
    }
  }

  /**
   * Test SSH connection
   */
  async _testSSHConnection() {
    const cmd = this._sshCmd('echo OK');
    try {
      const { stdout } = await execAsync(cmd, { timeout: 10000 });
      if (!stdout.includes('OK')) {
        throw new Error('SSH connection test failed');
      }
    } catch (error) {
      throw new Error(`SSH connection failed: ${error.message}`);
    }
  }

  /**
   * Ensure remote file exists
   */
  async _ensureRemoteFileExists() {
    const initCmd = `test -f ${this.ssh.remoteDbPath} || echo '{"secrets":{},"logs":[]}' > ${this.ssh.remoteDbPath}`;
    const cmd = this._sshCmd(initCmd);
    
    try {
      await execAsync(cmd, { timeout: 10000 });
    } catch (error) {
      throw new Error(`Failed to ensure remote file: ${error.message}`);
    }
  }

  /**
   * Load database from remote server
   */
  async _loadFromRemote() {
    const cmd = this._sshCmd(`cat ${this.ssh.remoteDbPath}`);
    
    try {
      const { stdout } = await execAsync(cmd, { timeout: 10000 });
      this.localCache = JSON.parse(stdout);
      this.cacheValid = true;
    } catch (error) {
      throw new Error(`Failed to load from remote: ${error.message}`);
    }
  }

  /**
   * Save database to remote server
   */
  async _saveToRemote() {
    if (!this.localCache) {
      throw new Error('Database not initialized');
    }

    const jsonData = JSON.stringify(this.localCache, null, 2);
    
    // Use heredoc to safely pass data with special characters
    const cmd = `ssh -i ${this.ssh.keyPath} -p ${this.ssh.port} ${this.ssh.user}@${this.ssh.host} 'cat > ${this.ssh.remoteDbPath} << 'EOF'\n${jsonData}\nEOF'`;
    
    try {
      await execAsync(cmd, { timeout: 10000 });
      this.cacheValid = true;
    } catch (error) {
      throw new Error(`Failed to save to remote: ${error.message}`);
    }
  }

  /**
   * Set a secret value
   */
  async set(key, value, createdBy = 'unknown', description = '') {
    try {
      await this._loadFromRemote();

      const encryptedValue = this.encryption.encrypt(value);
      const valueHash = SecureEncryption.hash(value);

      if (!this.localCache.secrets) {
        this.localCache.secrets = {};
      }

      this.localCache.secrets[key] = {
        key,
        encrypted_value: encryptedValue,
        value_hash: valueHash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: createdBy,
        description
      };

      await this._saveToRemote();
      return key;
    } catch (error) {
      throw new Error(`Failed to set secret: ${error.message}`);
    }
  }

  /**
   * Get and decrypt a secret value
   */
  async get(key, user = 'unknown') {
    try {
      await this._loadFromRemote();

      if (!this.localCache.secrets || !this.localCache.secrets[key]) {
        return null;
      }

      const secretData = this.localCache.secrets[key];
      const decrypted = this.encryption.decrypt(secretData.encrypted_value);

      // Log access
      this._logAccess(key, 'READ', user);
      await this._saveToRemote();

      return decrypted;
    } catch (error) {
      throw new Error(`Failed to get secret: ${error.message}`);
    }
  }

  /**
   * List all secret keys
   */
  async listKeys() {
    try {
      await this._loadFromRemote();

      if (!this.localCache.secrets) {
        return [];
      }

      return Object.values(this.localCache.secrets).map(s => ({
        key: s.key,
        created_at: s.created_at,
        updated_at: s.updated_at,
        created_by: s.created_by,
        description: s.description
      }));
    } catch (error) {
      throw new Error(`Failed to list keys: ${error.message}`);
    }
  }

  /**
   * Delete a secret
   */
  async delete(key, user = 'unknown') {
    try {
      await this._loadFromRemote();

      if (!this.localCache.secrets || !this.localCache.secrets[key]) {
        return false;
      }

      delete this.localCache.secrets[key];
      this._logAccess(key, 'DELETE', user);
      await this._saveToRemote();

      return true;
    } catch (error) {
      throw new Error(`Failed to delete secret: ${error.message}`);
    }
  }

  /**
   * Verify secret integrity
   */
  async verify(key, value) {
    try {
      await this._loadFromRemote();

      if (!this.localCache.secrets || !this.localCache.secrets[key]) {
        return false;
      }

      const valueHash = this.localCache.secrets[key].value_hash;
      return SecureEncryption.verify(value, valueHash);
    } catch (error) {
      throw new Error(`Failed to verify secret: ${error.message}`);
    }
  }

  /**
   * Get access logs for a specific secret
   */
  async getAccessLogs(key, limit = 50) {
    try {
      await this._loadFromRemote();

      if (!this.localCache.logs) {
        return [];
      }

      return this.localCache.logs
        .filter(log => log.secret_id === key)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get logs: ${error.message}`);
    }
  }

  /**
   * Get all access logs
   */
  async getAllAccessLogs(limit = 100) {
    try {
      await this._loadFromRemote();

      if (!this.localCache.logs) {
        return [];
      }

      return this.localCache.logs
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get all logs: ${error.message}`);
    }
  }

  /**
   * Export to encrypted file
   */
  async exportToFile(exportKey) {
    try {
      await this._loadFromRemote();

      const secrets = {};
      for (const [key, data] of Object.entries(this.localCache.secrets || {})) {
        const decrypted = this.encryption.decrypt(data.encrypted_value);
        secrets[key] = decrypted;
      }

      const exportEncryption = new SecureEncryption(exportKey);
      const encryptedExport = exportEncryption.encrypt(JSON.stringify(secrets));

      return { secrets, encryptedExport };
    } catch (error) {
      throw new Error(`Failed to export: ${error.message}`);
    }
  }

  /**
   * Import from encrypted file
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
      throw new Error(`Failed to import: ${error.message}`);
    }
  }

  /**
   * Internal: Log access
   */
  _logAccess(secretId, action, user, ipAddress = null) {
    if (!this.localCache.logs) {
      this.localCache.logs = [];
    }

    this.localCache.logs.push({
      secret_id: secretId,
      action,
      user,
      timestamp: new Date().toISOString(),
      ip_address: ipAddress
    });
  }

  /**
   * Health check
   */
  async health() {
    try {
      await this._testSSHConnection();
      return { status: 'healthy', database: 'SSH File' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}
