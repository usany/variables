#!/usr/bin/env node

/**
 * Secure secret storage CLI
 * Manages encrypted storage of environment variables
 */

import { SecureEnvDB } from './storage/db.js';
import { SecureEncryption } from './storage/encryption.js';
import { parseArgs } from './utils/parser.js';
import { logError, logSuccess, logInfo, table } from './utils/logger.js';
import fs from 'fs';

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const dbFile = args.options.db || args.options.d || 'env-secrets.db';
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    if (!args.command || args.options.help || args.options.h) {
      showHelp();
      return;
    }

    if (args.options.version || args.options.v) {
      console.log('envman-store 1.0.0');
      return;
    }

    const db = new SecureEnvDB(dbFile, encryptionKey);
    await db.init();

    const user = args.options.user || process.env.USER || 'system';

    switch (args.command) {
      case 'set':
        if (args.params.length < 2) throw new Error('Usage: set <key> <value>');
        const description = args.options.description || args.options.d || '';
        await db.set(args.params[0], args.params[1], user, description);
        logSuccess(`Secret stored: ${args.params[0]}`);
        break;

      case 'get':
        if (args.params.length < 1) throw new Error('Usage: get <key>');
        const value = await db.get(args.params[0], user);
        if (value) {
          console.log(value);
        } else {
          throw new Error(`Secret not found: ${args.params[0]}`);
        }
        break;

      case 'list':
      case 'ls':
        const keys = await db.listKeys();
        if (keys.length === 0) {
          console.log('No secrets found');
        } else {
          const formatted = keys.map(k => ({
            'Key': k.key,
            'Created': new Date(k.created_at).toLocaleString(),
            'Updated': new Date(k.updated_at).toLocaleString(),
            'By': k.created_by,
            'Description': k.description || '-'
          }));
          table(Object.fromEntries(
            formatted.map((f, i) => [`${i + 1}. ${f.Key}`, f.Description])
          ));
        }
        break;

      case 'delete':
      case 'del':
      case 'rm':
        if (args.params.length < 1) throw new Error('Usage: delete <key>');
        const deleted = await db.delete(args.params[0], user);
        if (deleted) {
          logSuccess(`Secret deleted: ${args.params[0]}`);
        } else {
          throw new Error(`Secret not found: ${args.params[0]}`);
        }
        break;

      case 'verify':
        if (args.params.length < 2) throw new Error('Usage: verify <key> <value>');
        const isValid = await db.verify(args.params[0], args.params[1]);
        if (isValid) {
          logSuccess('Secret verified - integrity OK');
        } else {
          logError('Secret verification failed - value mismatch');
        }
        break;

      case 'logs':
        if (args.options.all || args.options.a) {
          const allLogs = await db.getAllAccessLogs(
            parseInt(args.options.limit || 100)
          );
          const logTable = allLogs.map(l => ({
            'Time': l.timestamp,
            'Action': l.action,
            'Secret': l.key,
            'User': l.user
          }));
          console.log('Access Logs:');
          logTable.forEach(l => {
            console.log(`  ${l.Time} | ${l.Action} | ${l.Secret} | ${l.User}`);
          });
        } else if (args.params.length >= 1) {
          const key = args.params[0];
          const secretLogs = await db.getAccessLogs(
            key,
            parseInt(args.options.limit || 50)
          );
          console.log(`Access logs for '${key}':`);
          secretLogs.forEach(l => {
            console.log(`  ${l.timestamp} | ${l.action} by ${l.user}`);
          });
        } else {
          throw new Error('Usage: logs <key> | logs --all');
        }
        break;

      case 'export':
        if (args.params.length < 1) throw new Error('Usage: export <filename>');
        const exportKey = args.options.key || SecureEncryption.generateKey();
        const exported = await db.exportToFile(args.params[0], exportKey);
        fs.writeFileSync(args.params[0], exported.encryptedExport);
        logSuccess(`Exported ${Object.keys(exported.secrets).length} secrets to ${args.params[0]}`);
        console.log(`Export key (save this safely): ${exportKey}`);
        break;

      case 'import':
        if (args.params.length < 1) throw new Error('Usage: import <filename>');
        if (!args.options.key) throw new Error('--key required for import');
        const encryptedData = fs.readFileSync(args.params[0], 'utf-8');
        const imported = await db.importFromFile(encryptedData, args.options.key, user);
        logSuccess(`Imported ${imported} secrets from ${args.params[0]}`);
        break;

      case 'generate-key':
        const newKey = SecureEncryption.generateKey();
        console.log('New encryption key:');
        console.log(newKey);
        console.log('\nSet as environment variable:');
        console.log(`export ENCRYPTION_KEY="${newKey}"`);
        break;

      case 'help':
        showHelp();
        break;

      default:
        throw new Error(`Unknown command: ${args.command}`);
    }

    await db.close();

  } catch (error) {
    logError(error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
envman-store - Secure Secrets Storage CLI

Usage:
  envman-store <command> [options]

Commands:
  set <key> <value>          Store a secret
  get <key>                  Retrieve and decrypt a secret
  list (ls)                  List all stored secret keys
  delete <key> (del, rm)     Delete a secret
  verify <key> <value>       Verify secret integrity
  logs [key]                 View access logs
  export <file>              Export secrets (encrypted)
  import <file>              Import secrets (encrypted)
  generate-key               Generate new encryption key
  help                       Show this help

Options:
  --db, -d <path>            Database file (default: env-secrets.db)
  --user <name>              User name for access logs (default: $USER)
  --description, -d <text>   Description for set command
  --key <key>                Encryption key for export/import
  --all, -a                  Show all logs (with logs command)
  --limit <number>           Limit results (default: 50 for logs, 100 for --all)
  --help, -h                 Show help
  --version, -v              Show version

Environment Variables:
  ENCRYPTION_KEY             Master encryption key (required)
  USER                       Default user name

Examples:
  # Set a secret with description
  envman-store set DATABASE_URL "postgresql://..." --description "Prod DB"

  # Get a secret
  envman-store get DATABASE_URL

  # List all secrets
  envman-store list

  # Check access logs
  envman-store logs DATABASE_URL
  envman-store logs --all --limit 50

  # Export and import
  envman-store export backup.enc --key <export-key>
  envman-store import backup.enc --key <export-key>

  # Generate encryption key
  envman-store generate-key

Security:
  ✓ All secrets encrypted with AES-256-GCM
  ✓ Each access logged for audit trail
  ✓ Integrity verification with PBKDF2 hashes
  ✓ Never logs secret values

See SECURITY.md for detailed security documentation.
`);
}

main();
