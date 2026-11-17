#!/usr/bin/env node

/**
 * Example: SSH File Storage for Encrypted Secrets
 * 
 * Stores database on remote server at: 134.185.111.151
 * Access locally via SSH
 * 
 * Setup:
 * export SSH_HOST="134.185.111.151"
 * export SSH_USER="ubuntu"
 * export SSH_KEY="/Users/user/.ssh/id_rsa"
 * export ENCRYPTION_KEY="your-key"
 */

import { SSHFileDB } from '../src/storage/ssh-file-db.js';
import { SecureEncryption } from '../src/storage/encryption.js';

async function main() {
  console.log('🔐 SSH File Storage Example\n');

  try {
    // Step 1: Get encryption key
    console.log('Step 1: Setting up encryption key');
    let encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      console.log('Generating new encryption key...');
      encryptionKey = SecureEncryption.generateKey();
      console.log(`Save this key: ${encryptionKey}\n`);
    }

    // Step 2: Configure SSH
    console.log('Step 2: Configuring SSH connection');
    const sshConfig = {
      host: process.env.SSH_HOST || '134.185.111.151',
      user: process.env.SSH_USER || 'ubuntu',
      keyPath: process.env.SSH_KEY || '/Users/user/.ssh/id_rsa',
      remoteDbPath: process.env.REMOTE_DB_PATH || '/home/ubuntu/env-secrets.json'
    };

    console.log(`   Host: ${sshConfig.host}`);
    console.log(`   User: ${sshConfig.user}`);
    console.log(`   Key: ${sshConfig.keyPath}`);
    console.log(`   DB: ${sshConfig.remoteDbPath}\n`);

    // Step 3: Initialize SSH database
    console.log('Step 3: Initializing SSH file database');
    const db = new SSHFileDB(encryptionKey, sshConfig);
    
    const health = await db.health();
    if (health.status !== 'healthy') {
      throw new Error(`SSH connection failed: ${health.error}`);
    }
    
    await db.init();
    console.log('✓ Connected to remote database\n');

    // Step 4: Store secrets
    console.log('Step 4: Storing secrets');
    await db.set('DATABASE_URL', 'postgresql://user:pass@localhost/db', 'admin', 'Production database');
    await db.set('API_KEY', 'sk-1234567890abcdef', 'admin', 'Third-party API');
    await db.set('JWT_SECRET', 'your-jwt-secret-key', 'admin', 'JWT signing key');
    console.log('✓ Secrets stored on remote server\n');

    // Step 5: List all keys
    console.log('Step 5: Listing stored keys');
    const keys = await db.listKeys();
    console.log(`Found ${keys.length} secrets:`);
    keys.forEach(k => {
      console.log(`  - ${k.key} (${k.description})`);
    });
    console.log();

    // Step 6: Retrieve a secret
    console.log('Step 6: Retrieving a secret');
    const dbUrl = await db.get('DATABASE_URL', 'app-process');
    console.log(`✓ Retrieved DATABASE_URL: ${dbUrl}\n`);

    // Step 7: Verify integrity
    console.log('Step 7: Verifying secret integrity');
    const isValid = await db.verify('API_KEY', 'sk-1234567890abcdef');
    console.log(`✓ API_KEY verified: ${isValid}\n`);

    // Step 8: View access logs
    console.log('Step 8: Viewing access logs');
    const logs = await db.getAccessLogs('DATABASE_URL', 10);
    console.log(`Access logs for DATABASE_URL:`);
    if (logs.length === 0) {
      console.log('  (No logs yet)');
    } else {
      logs.forEach(log => {
        console.log(`  ${log.timestamp} - ${log.action} by ${log.user}`);
      });
    }
    console.log();

    // Step 9: Export secrets
    console.log('Step 9: Exporting secrets (encrypted)');
    const exportKey = SecureEncryption.generateKey();
    const exported = await db.exportToFile(exportKey);
    console.log(`✓ Exported ${Object.keys(exported.secrets).length} secrets`);
    console.log(`Export key: ${exportKey}\n`);

    // Step 10: Delete a secret
    console.log('Step 10: Deleting a secret');
    const deleted = await db.delete('API_KEY', 'admin');
    console.log(`✓ Deleted API_KEY: ${deleted}\n`);

    // Step 11: View all access logs
    console.log('Step 11: All access logs');
    const allLogs = await db.getAllAccessLogs(5);
    console.log('Recent activity:');
    if (allLogs.length === 0) {
      console.log('  (No logs yet)');
    } else {
      allLogs.forEach(log => {
        console.log(`  ${log.timestamp} - ${log.action} on ${log.secret_id} by ${log.user}`);
      });
    }

    console.log('\n✓ SSH file storage example completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nSetup troubleshooting:');
    console.error('1. Test SSH connection:');
    console.error('   ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "echo OK"');
    console.error('\n2. Verify environment variables:');
    console.error('   echo $SSH_HOST');
    console.error('   echo $SSH_USER');
    console.error('   echo $SSH_KEY');
    console.error('   echo $ENCRYPTION_KEY');
    console.error('\n3. Check remote directory:');
    console.error('   ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "ls -la /home/ubuntu/"');
    process.exit(1);
  }
}

main();
