# SSH File Database Setup Guide

## Overview

Store your encrypted secrets database file on a remote server via SSH. Access it locally whenever needed.

```
Your Computer              Remote Server
┌──────────────┐           ┌────────────────────────┐
│ CLI Tool     │──SSH───→  │ env-secrets.json       │
│ (This PC)    │           │ (Encrypted)            │
└──────────────┘           └────────────────────────┘
   ↓                              ↑
   └──────────── SSH Tunnel ──────┘
```

## Prerequisites

- SSH access to remote server: `134.185.111.151`
- SSH key: `/Users/user/.ssh/id_rsa`
- Username: `ubuntu`
- `openssh-client` installed (included on macOS)

## Setup

### 1. Test SSH Connection

```bash
ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "echo 'Connected!'"
```

Expected output:
```
Connected!
```

### 2. Create Remote Directory (Optional)

```bash
ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "mkdir -p /home/ubuntu/env-secrets"
```

### 3. Set Environment Variables

```bash
# SSH Configuration
export SSH_HOST="134.185.111.151"
export SSH_USER="ubuntu"
export SSH_KEY="/Users/user/.ssh/id_rsa"
export SSH_PORT="22"
export REMOTE_DB_PATH="/home/ubuntu/env-secrets.json"

# Encryption
export ENCRYPTION_KEY=$(node src/cli-store.js generate-key)
```

Or create `.env.ssh`:

```
SSH_HOST=134.185.111.151
SSH_USER=ubuntu
SSH_KEY=/Users/user/.ssh/id_rsa
SSH_PORT=22
REMOTE_DB_PATH=/home/ubuntu/env-secrets.json
ENCRYPTION_KEY=your-encryption-key-here
```

### 4. Install Dependencies

```bash
npm install
```

## Usage

### Using SSH File Database

```javascript
import { SSHFileDB } from './src/storage/ssh-db.js';

const sshConfig = {
  host: '134.185.111.151',
  user: 'ubuntu',
  keyPath: '/Users/user/.ssh/id_rsa',
  remoteDbPath: '/home/ubuntu/env-secrets.json'
};

const db = new SSHFileDB(process.env.ENCRYPTION_KEY, sshConfig);
await db.init();

// Store secret
await db.set('API_KEY', 'secret-value', 'admin', 'My API Key');

// Retrieve secret
const apiKey = await db.get('API_KEY', 'my-app');
console.log(apiKey); // "secret-value"

// View logs
const logs = await db.getAllAccessLogs();
console.log(logs);
```

### CLI Commands

```bash
# Set encryption key
export ENCRYPTION_KEY=$(node src/cli-store.js generate-key)

# Store secret (via SSH)
node src/cli-store.js set API_KEY "secret-value" --ssh

# Get secret (via SSH)
node src/cli-store.js get API_KEY --ssh

# List all secrets (via SSH)
node src/cli-store.js list --ssh

# View access logs (via SSH)
node src/cli-store.js logs --all --ssh
```

## How It Works

### Storage Format

Remote file (`/home/ubuntu/env-secrets.json`):

```json
{
  "secrets": {
    "API_KEY": {
      "key": "API_KEY",
      "encrypted_value": "iv:encrypted_data:tag",
      "value_hash": "salt:hash",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "created_by": "admin",
      "description": "My API Key"
    }
  },
  "logs": [
    {
      "secret_id": "API_KEY",
      "action": "READ",
      "user": "my-app",
      "timestamp": "2024-01-15T10:35:00Z",
      "ip_address": null
    }
  ]
}
```

### Data Flow

1. **Store Secret:**
   ```
   Plaintext Value
        ↓
   Encrypt (AES-256-GCM)
        ↓
   Local Cache (in memory)
        ↓
   SSH Upload
        ↓
   Remote File (encrypted)
   ```

2. **Retrieve Secret:**
   ```
   SSH Download
        ↓
   Local Cache (in memory)
        ↓
   Decrypt (AES-256-GCM)
        ↓
   Return Plaintext
        ↓
   Log Access (upload)
   ```

## Features

✅ **Encrypted Storage** - All data encrypted with AES-256-GCM
✅ **SSH Tunneling** - Secure transport over SSH
✅ **Access Logging** - Track who accessed what and when
✅ **Integrity Check** - PBKDF2 verification
✅ **JSON Format** - Human-readable (encrypted values)
✅ **Automatic Sync** - Download on read, upload on write
✅ **Conflict Prevention** - Reload before each operation

## Security Considerations

### ✅ DO

1. **Protect SSH key**
   ```bash
   chmod 600 /Users/user/.ssh/id_rsa
   ```

2. **Use SSH key passphrase**
   ```bash
   ssh-keygen -p -f /Users/user/.ssh/id_rsa
   ```

3. **Restrict remote file permissions**
   ```bash
   ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "chmod 600 /home/ubuntu/env-secrets.json"
   ```

4. **Use SSH agent for key management**
   ```bash
   ssh-add /Users/user/.ssh/id_rsa
   ```

5. **Monitor access logs**
   ```bash
   node src/cli-store.js logs --all --ssh
   ```

### ❌ DON'T

- Don't share SSH key
- Don't store SSH key in git
- Don't use SSH key without passphrase
- Don't allow password SSH authentication
- Don't ignore access logs

## Troubleshooting

### "Permission denied (publickey)"

**Problem:** SSH authentication failed

**Solution:**
```bash
# Verify SSH key exists
ls -la /Users/user/.ssh/id_rsa

# Test SSH connection
ssh -i /Users/user/.ssh/id_rsa -v ubuntu@134.185.111.151

# Add key to SSH agent
ssh-add /Users/user/.ssh/id_rsa
```

### "Connection timeout"

**Problem:** Can't reach remote server

**Solution:**
```bash
# Check if host is reachable
ping 134.185.111.151

# Test with verbose output
ssh -i /Users/user/.ssh/id_rsa -vvv ubuntu@134.185.111.151
```

### "Failed to save to remote"

**Problem:** Write permission issue

**Solution:**
```bash
# Check remote directory permissions
ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "ls -la /home/ubuntu/"

# Create directory if missing
ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "mkdir -p /home/ubuntu"
```

### "Decryption failed"

**Problem:** Wrong encryption key

**Solution:**
```bash
# Verify encryption key is set
echo $ENCRYPTION_KEY

# Use same key you used to store secrets
```

## Backup & Recovery

### Backup Remote Database

```bash
# Download to local machine
scp -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151:/home/ubuntu/env-secrets.json ./backup-$(date +%Y%m%d).json
```

### Restore from Backup

```bash
# Upload backup to remote
scp -i /Users/user/.ssh/id_rsa ./backup-20240115.json ubuntu@134.185.111.151:/home/ubuntu/env-secrets.json
```

### Verify Integrity

```bash
# Check file on remote
ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "wc -c /home/ubuntu/env-secrets.json"

# Check local cache
node -e "console.log(require('fs').statSync('env-secrets-local.json').size)"
```

## Performance Tips

### Cache Locally (Optional)

```javascript
// Store locally between remote syncs
const localCache = './env-secrets-local.json';

// Read multiple times from cache
for (let i = 0; i < 100; i++) {
  const value = await db.get('API_KEY'); // Only syncs on first read
}
```

### Batch Operations

```javascript
// Better: Do multiple operations, then sync once
const db = new SSHFileDB(key, config);
await db.init();

// Multiple operations
await db.set('KEY1', 'value1');
await db.set('KEY2', 'value2');
await db.set('KEY3', 'value3');
// Each operation syncs - consider batching in production
```

## Production Deployment

### 1. Set Up SSH Key Authentication

```bash
# Copy SSH key to production server
scp -i /Users/user/.ssh/id_rsa /Users/user/.ssh/id_rsa ubuntu@134.185.111.151:/home/ubuntu/.ssh/
```

### 2. Configure SSH Config

Create `~/.ssh/config`:

```
Host env-db
  HostName 134.185.111.151
  User ubuntu
  IdentityFile /Users/user/.ssh/id_rsa
  Port 22
```

Then use:
```bash
ssh env-db "cat /home/ubuntu/env-secrets.json"
```

### 3. Set Up Monitoring

```bash
# Monitor access logs regularly
*/5 * * * * /path/to/check-ssh-db-logs.sh
```

### 4. Enable SSH Key Rotation

```bash
# Generate new key
ssh-keygen -t ed25519 -f /Users/user/.ssh/id_rsa_new

# Add to authorized_keys on server
ssh-copy-id -i /Users/user/.ssh/id_rsa_new ubuntu@134.185.111.151

# Update configuration
export SSH_KEY="/Users/user/.ssh/id_rsa_new"
```

## Comparison: SSH File vs Other Options

| Feature | SSH File | SQLite | Firebase | PostgreSQL |
|---------|----------|--------|----------|-----------|
| Setup | 5 min | < 1 min | 10 min | 15 min |
| Infrastructure | Remote server | Local | Cloud | Cloud/On-prem |
| Encryption | ✅ AES-256 | ✅ AES-256 | ✅ Google-managed | ✅ Built-in |
| Audit logs | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Scalability | Limited | Limited | Auto | Manual |
| Cost | Server cost | $0 | $0-50/mo | $20-100/mo |
| Network latency | Low-medium | None | High | Medium |

## Next Steps

1. **Test SSH connection** (see Prerequisites)
2. **Run example:** `node examples/ssh-storage.js`
3. **Integrate into app** (see Usage section)
4. **Set up backups** (see Backup & Recovery)
5. **Monitor logs** regularly

## Resources

- [SSH Essentials](https://www.ssh.com/academy/ssh)
- [OpenSSH Documentation](https://man.openbsd.org/ssh)
- [SSH Key Management](https://wiki.archlinux.org/title/SSH_keys)
- [Node.js Child Process](https://nodejs.org/api/child_process.html)
