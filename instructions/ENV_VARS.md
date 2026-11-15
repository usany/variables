# Environment Variables Reference

Complete guide to all environment variables used by the secrets management system.

## Quick Reference

### Minimal Setup (SQLite)
```bash
export ENCRYPTION_KEY="your-32-byte-base64-key"
```

### SSH File Storage Setup
```bash
export ENCRYPTION_KEY="your-32-byte-base64-key"
export SSH_HOST="134.185.111.151"
export SSH_USER="ubuntu"
export SSH_KEY="/Users/user/.ssh/id_rsa"
export REMOTE_DB_PATH="/home/ubuntu/env-secrets.json"
```

### Firebase Setup
```bash
export ENCRYPTION_KEY="your-32-byte-base64-key"
export FIREBASE_PROJECT_ID="your-project-id"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/firebase-key.json"
```

---

## All Variables Explained

### 🔑 ENCRYPTION (Required)

#### `ENCRYPTION_KEY`
- **Type:** String (base64-encoded)
- **Required:** YES
- **Purpose:** Master encryption key for AES-256-GCM
- **Length:** Must be 32 bytes (256 bits)
- **Format:** Base64 encoded
- **Generate:** `node src/cli-store.js generate-key`
- **Security:** 
  - Store in KMS (AWS Secrets Manager, Vault, etc.)
  - Never commit to git
  - Use strong, random values
  - Rotate periodically

**Example:**
```bash
export ENCRYPTION_KEY="3kB8nL2qP9xW5vZ7jF4mQ6hR8sT1uD3vC5bN7gP2kL9jM4xQ6rW8"
```

---

### 📁 SQLITE (Local Database)

#### `SQLITE_DB_PATH`
- **Type:** String (file path)
- **Required:** NO (default: `env-secrets.db`)
- **Purpose:** Location of SQLite database file
- **Default:** `./env-secrets.db`

**Example:**
```bash
export SQLITE_DB_PATH="/var/lib/secrets/env-secrets.db"
```

---

### 🔗 SSH FILE STORAGE (Remote Server)

#### `SSH_HOST`
- **Type:** String (hostname or IP)
- **Required:** YES (for SSH storage)
- **Default:** `134.185.111.151`

```bash
export SSH_HOST="134.185.111.151"
```

#### `SSH_USER`
- **Type:** String
- **Required:** YES (for SSH storage)
- **Default:** `ubuntu`

```bash
export SSH_USER="ubuntu"
```

#### `SSH_KEY`
- **Type:** String (file path)
- **Required:** YES (for SSH storage)
- **Default:** `/Users/user/.ssh/id_rsa`

```bash
export SSH_KEY="/Users/user/.ssh/id_rsa"
```

#### `SSH_PORT`
- **Type:** Number
- **Required:** NO (default: `22`)

```bash
export SSH_PORT="22"
```

#### `REMOTE_DB_PATH`
- **Type:** String (file path on server)
- **Required:** YES (for SSH storage)
- **Default:** `/home/ubuntu/env-secrets.json`

```bash
export REMOTE_DB_PATH="/home/ubuntu/env-secrets.json"
```

---

### ☁️ FIREBASE FIRESTORE (Cloud)

#### `FIREBASE_PROJECT_ID`
- **Type:** String
- **Required:** YES (for Firebase)

```bash
export FIREBASE_PROJECT_ID="my-secrets-project"
```

#### `GOOGLE_APPLICATION_CREDENTIALS`
- **Type:** String (file path)
- **Required:** YES (for Firebase)

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/firebase-key.json"
```

---

### 📋 OPTIONAL: Audit & Logging

#### `USER`
- **Type:** String
- **Purpose:** User/process name for audit logs
- **Default:** `$USER` environment variable

```bash
export USER="my-app"
```

---

## Setup by Scenario

### Scenario 1: Development with SQLite

```bash
export ENCRYPTION_KEY=$(node src/cli-store.js generate-key)
```

### Scenario 2: SSH File Storage (Remote Server)

```bash
export ENCRYPTION_KEY=$(node src/cli-store.js generate-key)
export SSH_HOST="134.185.111.151"
export SSH_USER="ubuntu"
export SSH_KEY="/Users/user/.ssh/id_rsa"
export REMOTE_DB_PATH="/home/ubuntu/env-secrets.json"
```

### Scenario 3: Firebase Cloud

```bash
export ENCRYPTION_KEY=$(node src/cli-store.js generate-key)
export FIREBASE_PROJECT_ID="my-project"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/firebase-key.json"
```

---

## How to Generate Values

### Generate Encryption Key
```bash
node src/cli-store.js generate-key
```

### Get Firebase Service Account Key

1. Go to https://console.firebase.google.com
2. Select your project
3. Settings (⚙️) → Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file
6. Set `GOOGLE_APPLICATION_CREDENTIALS` to file path

---

## Security Best Practices

### ✅ DO

1. **Store in environment, not files**
2. **Use `.env.local` for local development**
3. **Use KMS for production**
4. **Rotate keys periodically**
5. **Protect SSH keys** (`chmod 600`)

### ❌ DON'T

1. **Never commit .env to git**
2. **Never hardcode keys in code**
3. **Never share credentials in chat/email**
4. **Never use weak keys**
5. **Never leave unencrypted exports**

---

## See Also

- `.env.example` - Template with all variables
- `SSH_SETUP.md` - SSH configuration details
- `FIREBASE_SETUP.md` - Firebase configuration details
- `SECURITY.md` - Security best practices
