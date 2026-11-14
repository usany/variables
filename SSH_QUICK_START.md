# SSH File Storage - Quick Start

Store your encrypted secrets database on remote server: `134.185.111.151`

## 30-Second Setup

### 1. Test SSH Connection

```bash
ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "echo OK"
```

Expected output: `OK`

### 2. Set Environment Variables

```bash
export SSH_HOST="134.185.111.151"
export SSH_USER="ubuntu"
export SSH_KEY="/Users/user/.ssh/id_rsa"
export REMOTE_DB_PATH="/home/ubuntu/env-secrets.json"
export ENCRYPTION_KEY=$(node src/cli-store.js generate-key)
```

### 3. Test It

```bash
# Run example
node examples/ssh-storage.js
```

## Usage

### Store Secret

```bash
export ENCRYPTION_KEY="your-key-here"
node examples/ssh-storage.js
# Or use programmatically (see below)
```

### Programmatic Usage

```javascript
import { SSHFileDB } from './src/storage/ssh-file-db.js';

const db = new SSHFileDB(process.env.ENCRYPTION_KEY, {
  host: '134.185.111.151',
  user: 'ubuntu',
  keyPath: '/Users/user/.ssh/id_rsa',
  remoteDbPath: '/home/ubuntu/env-secrets.json'
});

await db.init();

// Store
await db.set('API_KEY', 'secret', 'admin', 'My API Key');

// Retrieve
const key = await db.get('API_KEY');
console.log(key); // "secret"

// List
const all = await db.listKeys();
console.log(all);

// View logs
const logs = await db.getAllAccessLogs();
console.log(logs);
```

## How It Works

```
Your Computer              Remote Server (134.185.111.151)
┌─────────────────┐        ┌────────────────────────┐
│ Node.js App     │        │ /home/ubuntu/          │
│ (this PC)       │───SSH──→ env-secrets.json       │
│                 │        │ (Encrypted)            │
└─────────────────┘        └────────────────────────┘
   ↑                              ↑
   └──────── SSH Tunnel ──────────┘
```

**Data Flow:**
1. Store: Encrypt locally → SSH upload → Save on server
2. Retrieve: SSH download → Decrypt locally → Return value
3. Logs: SSH download → Append log → SSH upload

## File Format on Server

Remote file (`/home/ubuntu/env-secrets.json`):

```json
{
  "secrets": {
    "API_KEY": {
      "key": "API_KEY",
      "encrypted_value": "iv:encrypted_hex:tag",
      "value_hash": "salt:hash",
      "created_at": "2024-01-15T10:30:00Z",
      "created_by": "admin",
      "description": "My API Key"
    }
  },
  "logs": [
    {
      "secret_id": "API_KEY",
      "action": "READ",
      "user": "my-app",
      "timestamp": "2024-01-15T10:35:00Z"
    }
  ]
}
```

## Troubleshooting

### "Permission denied (publickey)"

```bash
# Check SSH key exists
ls -la /Users/user/.ssh/id_rsa

# Test SSH
ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "echo test"
```

### "Connection timeout"

```bash
# Verify server is reachable
ping 134.185.111.151

# Try with verbose output
ssh -i /Users/user/.ssh/id_rsa -vvv ubuntu@134.185.111.151
```

### "Failed to save to remote"

```bash
# Check directory exists
ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "ls -la /home/ubuntu/"

# Create if missing
ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "mkdir -p /home/ubuntu"
```

## Security Tips

✅ **Protect SSH Key**
```bash
chmod 600 /Users/user/.ssh/id_rsa
```

✅ **Set Remote File Permissions**
```bash
ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "chmod 600 /home/ubuntu/env-secrets.json"
```

✅ **Monitor Access**
```bash
# View who accessed your secrets
node examples/ssh-storage.js  # Shows logs
```

✅ **Regular Backups**
```bash
scp -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151:/home/ubuntu/env-secrets.json ./backup-$(date +%Y%m%d).json
```

## Common Commands

```bash
# Initialize
export ENCRYPTION_KEY=$(node src/cli-store.js generate-key)
node examples/ssh-storage.js

# Set a secret
node -e "
  import { SSHFileDB } from './src/storage/ssh-file-db.js';
  const db = new SSHFileDB(process.env.ENCRYPTION_KEY);
  await db.init();
  await db.set('MY_KEY', 'my_value');
  console.log('✓ Stored');
"

# Get a secret
node -e "
  import { SSHFileDB } from './src/storage/ssh-file-db.js';
  const db = new SSHFileDB(process.env.ENCRYPTION_KEY);
  await db.init();
  const value = await db.get('MY_KEY');
  console.log(value);
"

# List all
node -e "
  import { SSHFileDB } from './src/storage/ssh-file-db.js';
  const db = new SSHFileDB(process.env.ENCRYPTION_KEY);
  await db.init();
  const keys = await db.listKeys();
  console.log(keys);
"

# View logs
node -e "
  import { SSHFileDB } from './src/storage/ssh-file-db.js';
  const db = new SSHFileDB(process.env.ENCRYPTION_KEY);
  await db.init();
  const logs = await db.getAllAccessLogs();
  console.log(logs);
"
```

## Advantages

✅ **No extra infrastructure** - Uses existing SSH access
✅ **Simple setup** - Just SSH + JSON file
✅ **Encrypted** - AES-256-GCM encryption
✅ **Audited** - All access logged
✅ **Cheap** - Only pay for server cost
✅ **Portable** - Easy to backup/restore

## Limitations

⚠️ **Network latency** - Every operation goes over SSH
⚠️ **Concurrent access** - Not ideal for multiple simultaneous users
⚠️ **No versioning** - Overwrites file each time
⚠️ **Single file** - Scaling limited to one JSON file

## Next Steps

1. Test SSH: `ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "echo OK"`
2. Set environment: Copy commands from "Set Environment Variables"
3. Run example: `node examples/ssh-storage.js`
4. Read full guide: [SSH_SETUP.md](./SSH_SETUP.md)

## See Also

- [SSH_SETUP.md](./SSH_SETUP.md) - Detailed setup and troubleshooting
- [DATABASE_COMPARISON.md](./DATABASE_COMPARISON.md) - Compare with other databases
- [SECURITY.md](./SECURITY.md) - Security best practices
