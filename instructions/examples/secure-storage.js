#!/usr/bin/env node

/**
 * Example: Secure Storage of Environment Variables
 * 
 * This demonstrates how to safely store secrets in a database
 */

import { SecureEnvDB } from '../src/storage/db.js';
import { SecureEncryption } from '../src/storage/encryption.js';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🔐 Secure Environment Storage Example\n');

  // Step 1: Generate or load encryption key
  console.log('Step 1: Setting up encryption key');
  let encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    console.log('Generating new encryption key...');
    encryptionKey = SecureEncryption.generateKey();
    console.log('Save this key in a safe location (environment variable or key management system):');
    console.log(`ENCRYPTION_KEY=${encryptionKey}\n`);
  }

  try {
    // Step 2: Initialize secure database
    console.log('Step 2: Initializing secure database');
    const db = new SecureEnvDB('env-secrets.db', encryptionKey);
    await db.init();
    console.log('✓ Database initialized\n');

    // Step 3: Store secrets
    console.log('Step 3: Storing secrets securely');
    await db.set('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db', 'admin', 'Production database');
    await db.set('API_KEY', 'sk-1234567890abcdef', 'admin', 'Third-party API key');
    await db.set('JWT_SECRET', 'your-jwt-secret-key', 'admin', 'JWT signing secret');
    await db.set('STRIPE_SECRET_KEY', 'sk_live_1234567890', 'admin', 'Stripe API key');
    console.log('✓ Secrets stored\n');

    // Step 4: List all keys (without revealing values)
    console.log('Step 4: Listing stored keys');
    const keys = await db.listKeys();
    console.log('Stored secrets:');
    keys.forEach(k => {
      console.log(`  - ${k.key} (created by: ${k.created_by}, updated: ${k.updated_at})`);
      if (k.description) console.log(`    Description: ${k.description}`);
    });
    console.log();

    // Step 5: Retrieve and decrypt a secret
    console.log('Step 5: Retrieving a secret');
    const dbUrl = await db.get('DATABASE_URL', 'app-process');
    console.log(`✓ Retrieved DATABASE_URL: ${dbUrl}\n`);

    // Step 6: Verify a secret hasn't changed
    console.log('Step 6: Verifying secret integrity');
    const isValid = await db.verify('API_KEY', 'sk-1234567890abcdef');
    console.log(`✓ API_KEY verified: ${isValid}\n`);

    // Step 7: View access logs
    console.log('Step 7: Viewing access logs');
    const logs = await db.getAccessLogs('DATABASE_URL', 10);
    console.log(`Access log for DATABASE_URL:`);
    logs.forEach(log => {
      console.log(`  ${log.timestamp} - ${log.action} by ${log.user}`);
    });
    console.log();

    // Step 8: Export secrets (encrypted)
    console.log('Step 8: Exporting secrets');
    const exportKey = SecureEncryption.generateKey();
    const exported = await db.exportToFile('secrets-export.json', exportKey);
    console.log(`✓ Exported ${Object.keys(exported.secrets).length} secrets`);
    console.log(`Keep this export key safe: ${exportKey}\n`);

    // Step 9: Delete a secret
    console.log('Step 9: Deleting a secret');
    const deleted = await db.delete('API_KEY', 'admin');
    console.log(`✓ Deleted API_KEY: ${deleted}\n`);

    // Step 10: View all access logs
    console.log('Step 10: All access logs');
    const allLogs = await db.getAllAccessLogs(5);
    console.log('Recent activity:');
    allLogs.forEach(log => {
      console.log(`  ${log.timestamp} - ${log.action} on ${log.key} by ${log.user}`);
    });

    // Cleanup
    await db.close();
    console.log('\n✓ Database closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
