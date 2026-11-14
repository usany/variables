# Quick Start: Secure Storage

## 1. Install Dependencies

```bash
npm install sqlite3
```

## 2. Generate Encryption Key

```bash
# Generate a new key
node src/cli-store.js generate-key

# Output:
# New encryption key:
# abcdefg1234567890... (base64-encoded)
#
# Set as environment variable:
# export ENCRYPTION_KEY="abcdefg1234567890..."
```

## 3. Set Up Environment

```bash
# Set the encryption key in your environment
export ENCRYPTION_KEY="your-base64-encoded-key-here"

# Verify it's set
echo $ENCRYPTION_KEY
```

## 4. Store Your First Secret

```bash
# Store a secret
node src/cli-store.js set DATABASE_URL "postgresql://user:pass@localhost/db" \
  --description "Production database connection"

# Output:
# ✓ Secret stored: DATABASE_URL
```

## 5. Retrieve a Secret

```bash
# Get the secret back (automatically decrypted)
node src/cli-store.js get DATABASE_URL

# Output:
# postgresql://user:pass@localhost/db
```

## 6. List All Secrets

```bash
node src/cli-store.js list

# Output shows keys only (values stay encrypted)
```

## 7. View Access Logs

```bash
# See who accessed what
node src/cli-store.js logs DATABASE_URL

# View all recent activity
node src/cli-store.js logs --all --limit 20
```

## 8. Backup & Export

```bash
# Export secrets with encryption
node src/cli-store.js export secrets-backup.enc

# This saves the export key, store it somewhere safe!
```

## 9. Import Secrets

```bash
# Restore from backup
node src/cli-store.js import secrets-backup.enc --key "export-key-here"
```

## Complete Example

```bash
#!/bin/bash

# Set up
export ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# Store secrets
node src/cli-store.js set API_KEY "sk-1234567890"
node src/cli-store.js set DB_PASSWORD "secure-password" --description "Production database password"
node src/cli-store.js set JWT_SECRET "my-jwt-secret"

# List what we have
node src/cli-store.js list

# Retrieve one
API_KEY=$(node src/cli-store.js get API_KEY)
echo "Using API key: $API_KEY"

# Check who accessed what
node src/cli-store.js logs --all

# Export for backup
node src/cli-store.js export backup.enc
```

## Integration with Your Application

```javascript
import { SecureEnvDB } from './src/storage/db.js';

// Initialize on startup
const db = new SecureEnvDB('env-secrets.db', process.env.ENCRYPTION_KEY);
await db.init();

// Get a secret when needed
const dbUrl = await db.get('DATABASE_URL', 'my-app');

// Use it
const connection = await connectDB(dbUrl);
```

## Common Tasks

### Change a Secret
```bash
node src/cli-store.js set API_KEY "new-key-value"
# (overwrites existing value)
```

### Delete a Secret
```bash
node src/cli-store.js delete API_KEY
```

### Verify Integrity
```bash
node src/cli-store.js verify API_KEY "expected-value"
# Returns success if value hasn't changed
```

### View User Activity
```bash
# See all actions by a specific user
node src/cli-store.js logs --all | grep "admin"
```

## Troubleshooting

**Error: "ENCRYPTION_KEY environment variable is required"**
```bash
# Set the encryption key
export ENCRYPTION_KEY="your-key-here"
```

**Error: "Decryption failed"**
- Wrong encryption key set
- Try with the correct key

**Error: "Secret not found"**
- Key doesn't exist
- Check spelling with `node src/cli-store.js list`

## Security Reminders

✅ **DO:**
- Store ENCRYPTION_KEY in a KMS or password manager
- Rotate keys periodically
- Monitor access logs regularly
- Use unique keys for different environments

❌ **DON'T:**
- Commit ENCRYPTION_KEY to git
- Log secret values
- Use weak keys
- Share encryption keys in chat/email

## Production Deployment

```bash
# On production server
export ENCRYPTION_KEY=$(aws secretsmanager get-secret-value \
  --secret-id encryption-key \
  --query SecretString \
  --output text)

# Start application
node app.js
```

## Next Steps

1. Read `SECURITY.md` for security best practices
2. Check `STORAGE_COMPARISON.md` for advanced options
3. Review `examples/secure-storage.js` for more examples
4. Set up automatic key rotation
5. Integrate with AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault
