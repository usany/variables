# Security Guide - Storing Secrets Safely

## Overview

This guide explains how to safely store environment variable secrets in a database. We use **AES-256-GCM encryption** with secure key management.

## Security Principles

### 1. **Encryption at Rest**
- All secrets are encrypted with AES-256-GCM
- Each secret gets a unique IV (initialization vector)
- Includes authentication tag to detect tampering
- Values are never stored in plaintext

### 2. **Encryption Key Management**
```bash
# Generate a strong encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Store in environment variable (never in code)
export ENCRYPTION_KEY="your-base64-encoded-32-byte-key"

# Or use environment management tools:
# - AWS Secrets Manager
# - HashiCorp Vault
# - Azure Key Vault
# - 1Password
```

### 3. **Access Logging**
Every access to a secret is logged:
- WHO: User/process name
- WHAT: Secret key accessed
- WHEN: Timestamp
- ACTION: READ/DELETE/WRITE
- WHERE: IP address (optional)

View logs to detect unauthorized access:
```bash
node cli-store.js logs --key DATABASE_URL
node cli-store.js logs --all
```

### 4. **Hash Verification**
Secrets are also stored with PBKDF2 hashes for integrity:
- Detect if a secret has been modified
- Verify secret hasn't drifted during encryption/decryption

```bash
node cli-store.js verify --key API_KEY --value "sk-12345"
```

## Storage Architecture

```
┌─────────────────────────────────────────┐
│  .env / Environment Variables           │
│  (For non-critical config)              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Database (Encrypted Secrets)           │
│  ├─ AES-256-GCM encrypted values        │
│  ├─ PBKDF2 hashes for verification      │
│  ├─ Access logs for audit trail         │
│  └─ Metadata (created_by, description)  │
└─────────────────────────────────────────┘
         ↑
         │ (Encryption key from KMS)
┌─────────────────────────────────────────┐
│  Key Management System (KMS)            │
│  - AWS KMS / Azure Key Vault / Vault    │
│  - Managed encryption keys              │
│  - Rotation policies                    │
└─────────────────────────────────────────┘
```

## Best Practices

### ✅ DO

1. **Store encryption key in KMS**
   ```javascript
   // Use AWS Secrets Manager for key
   import AWS from 'aws-sdk';
   const client = new AWS.SecretsManager();
   const secret = await client.getSecretValue({ SecretId: 'encryption-key' }).promise();
   const key = JSON.parse(secret.SecretString).ENCRYPTION_KEY;
   ```

2. **Rotate encryption keys periodically**
   ```bash
   # Generate new key, re-encrypt all secrets
   node cli-store.js rotate-key --new-key <new-base64-key>
   ```

3. **Use strong, random keys**
   ```javascript
   const key = SecureEncryption.generateKey(); // 32 bytes, base64
   ```

4. **Separate read and write access**
   ```bash
   # Read-only access for applications
   # Write access only for admins
   ```

5. **Enable database encryption**
   ```sql
   -- SQLite with encryption (use SQLCipher)
   -- PostgreSQL: encrypt_password, ssl
   -- MySQL: ssl, native_password
   ```

6. **Monitor access logs**
   ```bash
   node cli-store.js logs --since "2024-01-01" --action READ
   ```

### ❌ DON'T

1. **Never commit encryption keys to git**
   ```bash
   echo "ENCRYPTION_KEY=*" >> .gitignore
   ```

2. **Never log secret values**
   ```javascript
   // ❌ BAD
   console.log('SECRET:', secret);
   
   // ✅ GOOD
   console.log('Stored secret:', key); // Just show the key name
   ```

3. **Never hardcode secrets**
   ```javascript
   // ❌ BAD
   const API_KEY = "sk-12345";
   
   // ✅ GOOD
   const API_KEY = await db.get('API_KEY');
   ```

4. **Never use weak encryption**
   ```javascript
   // ❌ BAD - AES-128 or ECB mode
   
   // ✅ GOOD - AES-256-GCM
   ```

5. **Don't ignore access logs**
   - Review periodically
   - Set up alerts for suspicious patterns
   - Keep logs for compliance

## Implementation Examples

### Setup Database
```javascript
import { SecureEnvDB } from './src/storage/db.js';
import { SecureEncryption } from './src/storage/encryption.js';

// Get encryption key from environment
const key = process.env.ENCRYPTION_KEY;
if (!key) {
  throw new Error('ENCRYPTION_KEY environment variable required');
}

// Initialize
const db = new SecureEnvDB('secrets.db', key);
await db.init();
```

### Store Secrets
```javascript
// Store with metadata
await db.set(
  'DATABASE_URL',
  'postgresql://user:pass@localhost/db',
  'admin',                    // created_by
  'Production database'       // description
);
```

### Retrieve Secrets
```javascript
// Retrieve and decrypt
const dbUrl = await db.get('DATABASE_URL', 'app-process');

// Automatic access logging
// Access logged: "app-process READ DATABASE_URL"
```

### Verify Secrets
```javascript
// Verify integrity
const isValid = await db.verify('DATABASE_URL', dbUrl);
if (!isValid) {
  throw new Error('Secret has been modified!');
}
```

### Export/Import
```javascript
// Export (encrypted with separate key)
const exportKey = SecureEncryption.generateKey();
const exported = await db.exportToFile('backup.json', exportKey);

// Import
await db.importFromFile(encryptedData, exportKey, 'admin');
```

## Compliance & Auditing

### PCI DSS (Payment Card Industry)
- ✅ Encrypt all secrets at rest
- ✅ Maintain access logs (audit trail)
- ✅ Control access (users/roles)
- ✅ Rotate keys regularly

### HIPAA (Healthcare)
- ✅ Encrypt sensitive data
- ✅ Maintain audit logs
- ✅ Access controls

### SOC 2
- ✅ Encryption and key management
- ✅ Audit trail/logging
- ✅ Access controls

### GDPR
- ✅ Data protection (encryption)
- ✅ Audit rights (access logs)
- ✅ Data deletion capability

## Troubleshooting

### "Decryption failed"
- Wrong encryption key
- Corrupted encrypted data
- Check database integrity

### "Invalid encrypted data format"
- Database was corrupted
- Use backup or re-import

### "Master key is required"
- ENCRYPTION_KEY environment variable not set
- Database initialization failed

## Emergency Recovery

### If encryption key is lost:
1. Use backups from last known good key
2. Database is unrecoverable without key
3. Import from encrypted export if available

### If database is corrupted:
1. Stop all access
2. Restore from backup
3. Review access logs for unauthorized activity

## Additional Resources

- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [AWS KMS](https://aws.amazon.com/kms/)
- [HashiCorp Vault](https://www.vaultproject.io/)
