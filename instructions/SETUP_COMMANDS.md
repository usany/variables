# Setup Commands - Copy & Paste Ready

All commands you need to get started, ready to copy and paste.

---

## 🚀 Quick Start - Choose Your Option

### Option 1: SQLite (Development)

```bash
# Generate encryption key
export ENCRYPTION_KEY=$(node src/cli-store.js generate-key)

# Store a secret
node src/cli-store.js set API_KEY "my-secret-value"

# Get the secret back
node src/cli-store.js get API_KEY

# View all secrets
node src/cli-store.js list

# View access logs
node src/cli-store.js logs --all
```

---

### Option 2: SSH File Storage (Remote Server)

```bash
# 1. Test SSH connection
ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "echo OK"

# 2. Generate encryption key
export ENCRYPTION_KEY=$(node src/cli-store.js generate-key)

# 3. Set SSH variables
export SSH_HOST="134.185.111.151"
export SSH_USER="ubuntu"
export SSH_KEY="/Users/user/.ssh/id_rsa"
export REMOTE_DB_PATH="/home/ubuntu/env-secrets.json"

# 4. Run example (demonstrates all features)
node examples/ssh-storage.js
```

---

### Option 3: Firebase Cloud

```bash
# 1. Install Firebase
npm install firebase-admin

# 2. Generate encryption key
export ENCRYPTION_KEY=$(node src/cli-store.js generate-key)

# 3. Set Firebase variables
export FIREBASE_PROJECT_ID="your-project-id"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/firebase-key.json"

# 4. Run example (demonstrates all features)
node examples/firebase-storage.js
```

---

## 📋 Environment Variables - All Options

### Just SQLite (Minimal)
```bash
export ENCRYPTION_KEY=$(node src/cli-store.js generate-key)
```

### SSH File Storage (Complete)
```bash
export ENCRYPTION_KEY=$(node src/cli-store.js generate-key)
export SSH_HOST="134.185.111.151"
export SSH_USER="ubuntu"
export SSH_KEY="/Users/user/.ssh/id_rsa"
export SSH_PORT="22"
export REMOTE_DB_PATH="/home/ubuntu/env-secrets.json"
export USER="my-app"
```

### Firebase (Complete)
```bash
export ENCRYPTION_KEY=$(node src/cli-store.js generate-key)
export FIREBASE_PROJECT_ID="your-project-id"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/firebase-key.json"
export USER="my-app"
```

---

## 🔧 Common Tasks

### Generate New Encryption Key
```bash
node src/cli-store.js generate-key
```

### Store a Secret
```bash
export ENCRYPTION_KEY="your-key"
node src/cli-store.js set API_KEY "secret-value"
```

### Get a Secret
```bash
export ENCRYPTION_KEY="your-key"
node src/cli-store.js get API_KEY
```

### List All Secrets
```bash
export ENCRYPTION_KEY="your-key"
node src/cli-store.js list
```

### Delete a Secret
```bash
export ENCRYPTION_KEY="your-key"
node src/cli-store.js delete API_KEY
```

### View Access Logs
```bash
export ENCRYPTION_KEY="your-key"
node src/cli-store.js logs --all
```

### Verify Secret Integrity
```bash
export ENCRYPTION_KEY="your-key"
node src/cli-store.js verify API_KEY "secret-value"
```

### Export Secrets (Encrypted)
```bash
export ENCRYPTION_KEY="your-key"
node src/cli-store.js export backup.enc
```

---

## 🐛 Troubleshooting Commands

### Test SSH Connection
```bash
ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "echo OK"
```

### View Remote Database File
```bash
ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "cat /home/ubuntu/env-secrets.json"
```

### Check SSH Key Permissions
```bash
ls -la /Users/user/.ssh/id_rsa
```

### Fix SSH Key Permissions
```bash
chmod 600 /Users/user/.ssh/id_rsa
```

### Check Remote File Permissions
```bash
ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "ls -la /home/ubuntu/env-secrets.json"
```

### Create Remote Directory
```bash
ssh -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151 "mkdir -p /home/ubuntu"
```

### Verify Encryption Key is Set
```bash
echo $ENCRYPTION_KEY
```

### Verify SSH Variables are Set
```bash
echo $SSH_HOST
echo $SSH_USER
echo $SSH_KEY
```

### Verify Firebase Variables are Set
```bash
echo $FIREBASE_PROJECT_ID
echo $GOOGLE_APPLICATION_CREDENTIALS
```

---

## 💾 Configuration Files

### Create .env.local (Local Development)
```bash
cat > .env.local << 'EOF'
ENCRYPTION_KEY=$(node src/cli-store.js generate-key)
SSH_HOST=134.185.111.151
SSH_USER=ubuntu
SSH_KEY=/Users/user/.ssh/id_rsa
REMOTE_DB_PATH=/home/ubuntu/env-secrets.json
USER=my-app
EOF
```

### Load from .env.local
```bash
source .env.local
env | grep ENCRYPTION
```

---

## 🚨 Security Commands

### Protect SSH Key
```bash
chmod 600 /Users/user/.ssh/id_rsa
```

### Make .env files private
```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
chmod 600 .env .env.local
```

### Backup Remote Database
```bash
scp -i /Users/user/.ssh/id_rsa ubuntu@134.185.111.151:/home/ubuntu/env-secrets.json ./backup-$(date +%Y%m%d).json
```

### Restore Remote Database
```bash
scp -i /Users/user/.ssh/id_rsa ./backup-20240115.json ubuntu@134.185.111.151:/home/ubuntu/env-secrets.json
```

---

## 📊 All Environment Variables (Reference)

```bash
# Encryption (Required)
export ENCRYPTION_KEY="your-32-byte-base64-key"

# SSH Storage (If using SSH)
export SSH_HOST="134.185.111.151"
export SSH_USER="ubuntu"
export SSH_KEY="/Users/user/.ssh/id_rsa"
export SSH_PORT="22"
export REMOTE_DB_PATH="/home/ubuntu/env-secrets.json"

# Firebase (If using Firebase)
export FIREBASE_PROJECT_ID="your-project"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"

# Optional
export USER="my-app"
export ENVIRONMENT="production"
export DEBUG="false"
```

---

## Next Steps

1. **Choose an option above** (SQLite / SSH / Firebase)
2. **Copy the commands for your option**
3. **Run them one by one**
4. **Verify with:** `node src/cli-store.js list`
5. **Read:** `ENV_VARS.md` for detailed variable info

See also:
- `SSH_QUICK_START.md` - SSH specific setup
- `FIREBASE_SETUP.md` - Firebase specific setup
- `ENV_VARS.md` - All variables explained
