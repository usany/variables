#!/usr/bin/env node

/**
 * Example: Secure Storage with Firebase Firestore
 * 
 * Setup:
 * 1. Create Firebase project: https://console.firebase.google.com
 * 2. Create Firestore database
 * 3. Generate service account key
 * 4. Set environment variable: export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"
 * 5. npm install firebase-admin
 */

import { FirebaseEnvDB } from '../src/storage/firebase-db.js';
import { SecureEncryption } from '../src/storage/encryption.js';

async function main() {
  console.log('🔐 Firebase Firestore Secure Storage Example\n');

  try {
    // Step 1: Get encryption key
    console.log('Step 1: Setting up encryption key');
    let encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      console.log('Generating new encryption key...');
      encryptionKey = SecureEncryption.generateKey();
      console.log(`Save this key: ${encryptionKey}\n`);
    }

    // Step 2: Initialize Firebase
    console.log('Step 2: Initializing Firebase Firestore');
    const projectId = process.env.FIREBASE_PROJECT_ID || 'my-secrets-project';
    const db = new FirebaseEnvDB(encryptionKey, projectId);
    
    const health = await db.health();
    if (health.status === 'error') {
      throw new Error(`Firebase connection failed: ${health.error}`);
    }
    console.log(`✓ Connected to Firebase Firestore (${projectId})\n`);

    // Step 3: Store secrets
    console.log('Step 3: Storing secrets');
    await db.set('DATABASE_URL', 'postgresql://user:pass@localhost/db', 'admin', 'Production database');
    await db.set('API_KEY', 'sk-1234567890abcdef', 'admin', 'Third-party API');
    await db.set('JWT_SECRET', 'your-jwt-secret-key', 'admin', 'JWT signing key');
    console.log('✓ Secrets stored\n');

    // Step 4: List all keys
    console.log('Step 4: Listing stored keys');
    const keys = await db.listKeys();
    console.log(`Found ${keys.length} secrets:`);
    keys.forEach(k => {
      console.log(`  - ${k.key} (${k.description})`);
    });
    console.log();

    // Step 5: Retrieve a secret
    console.log('Step 5: Retrieving a secret');
    const dbUrl = await db.get('DATABASE_URL', 'app-process');
    console.log(`✓ Retrieved DATABASE_URL: ${dbUrl}\n`);

    // Step 6: Verify integrity
    console.log('Step 6: Verifying secret integrity');
    const isValid = await db.verify('API_KEY', 'sk-1234567890abcdef');
    console.log(`✓ API_KEY verified: ${isValid}\n`);

    // Step 7: View access logs
    console.log('Step 7: Viewing access logs');
    const logs = await db.getAccessLogs('DATABASE_URL', 10);
    console.log(`Access logs for DATABASE_URL:`);
    if (logs.length === 0) {
      console.log('  (No logs yet)');
    } else {
      logs.forEach(log => {
        const timestamp = log.timestamp.toDate ? log.timestamp.toDate() : log.timestamp;
        console.log(`  ${timestamp} - ${log.action} by ${log.user}`);
      });
    }
    console.log();

    // Step 8: Export secrets
    console.log('Step 8: Exporting secrets (encrypted)');
    const exportKey = SecureEncryption.generateKey();
    const exported = await db.exportToFile(exportKey);
    console.log(`✓ Exported ${Object.keys(exported.secrets).length} secrets`);
    console.log(`Export key: ${exportKey}\n`);

    // Step 9: Delete a secret
    console.log('Step 9: Deleting a secret');
    const deleted = await db.delete('API_KEY', 'admin');
    console.log(`✓ Deleted API_KEY: ${deleted}\n`);

    // Step 10: View all access logs
    console.log('Step 10: All access logs');
    const allLogs = await db.getAllAccessLogs(5);
    console.log('Recent activity:');
    if (allLogs.length === 0) {
      console.log('  (No logs yet)');
    } else {
      allLogs.forEach(log => {
        const timestamp = log.timestamp.toDate ? log.timestamp.toDate() : log.timestamp;
        console.log(`  ${timestamp} - ${log.action} on ${log.secret_id} by ${log.user}`);
      });
    }

    console.log('\n✓ Firebase Firestore example completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nSetup troubleshooting:');
    console.error('1. Ensure GOOGLE_APPLICATION_CREDENTIALS is set');
    console.error('2. Check Firebase project exists');
    console.error('3. Verify Firestore database is created');
    console.error('4. npm install firebase-admin');
    process.exit(1);
  }
}

main();
