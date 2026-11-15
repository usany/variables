# Firebase Firestore Setup Guide

## Why Firebase?

**Pros:**
- ✅ No infrastructure to manage
- ✅ Auto-scaling
- ✅ Automatic backups
- ✅ Global distribution
- ✅ Free tier available
- ✅ Built-in security rules
- ✅ Real-time updates (if needed)

**Cons:**
- ❌ Google vendor lock-in
- ❌ NoSQL (no SQL queries)
- ❌ Pricing based on reads/writes

## Step 1: Create Firebase Project

### Option A: Via Console (Recommended for beginners)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a new project"
3. Name it (e.g., "env-secrets")
4. Disable Google Analytics (optional)
5. Click "Create project" and wait

### Option B: Via CLI

```bash
npm install -g firebase-tools
firebase login
firebase projects:create env-secrets
```

## Step 2: Create Firestore Database

1. In Firebase Console, select your project
2. Left sidebar → "Firestore Database"
3. Click "Create database"
4. Choose region (e.g., us-central1 for US)
5. Start in "Production mode"
6. Click "Enable"

## Step 3: Generate Service Account Key

This allows your app to connect to Firebase.

1. In Firebase Console, click ⚙️ (Settings)
2. Go to "Service Accounts" tab
3. Click "Generate New Private Key"
4. Save the JSON file safely (e.g., `firebase-key.json`)

**Security:** Never commit this file to git!

```bash
echo "firebase-key.json" >> .gitignore
```

## Step 4: Set Environment Variables

```bash
# Tell your app where the service account key is
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/firebase-key.json"

# Your Firebase project ID
export FIREBASE_PROJECT_ID="env-secrets"

# Your encryption key
export ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
```

Or create a `.env.local` file:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-key.json
FIREBASE_PROJECT_ID=env-secrets
ENCRYPTION_KEY=your-base64-key-here
```

## Step 5: Install Dependencies

```bash
npm install firebase-admin
```

## Step 6: Test Connection

```bash
node examples/firebase-storage.js
```

Expected output:
```
✓ Connected to Firebase Firestore (env-secrets)
✓ Secrets stored
✓ Retrieved DATABASE_URL: ...
```

## Usage with Firebase

### Store a Secret

```javascript
import { FirebaseEnvDB } from './src/storage/firebase-db.js';

const key = process.env.ENCRYPTION_KEY;
const db = new FirebaseEnvDB(key, 'my-project');

// Store
await db.set('API_KEY', 'sk-1234567890', 'admin', 'My API Key');
```

### Retrieve a Secret

```javascript
// Get (automatically decrypted)
const apiKey = await db.get('API_KEY', 'my-app');
console.log(apiKey); // "sk-1234567890"
```

### View Access Logs

```javascript
// See who accessed what
const logs = await db.getAccessLogs('API_KEY');
logs.forEach(log => {
  console.log(`${log.timestamp} - ${log.action} by ${log.user}`);
});
```

## Firestore Collections Structure

Firebase Firestore will create two collections:

### Collection: `secrets`
```
secrets/
  ├─ API_KEY (document)
  │  ├─ key: "API_KEY"
  │  ├─ encrypted_value: "iv:xxxx:tag"
  │  ├─ value_hash: "salt:hash"
  │  ├─ created_at: Timestamp
  │  ├─ created_by: "admin"
  │  └─ description: "My API Key"
  │
  ├─ DATABASE_URL (document)
  │  ├─ key: "DATABASE_URL"
  │  ├─ encrypted_value: "iv:xxxx:tag"
  │  └─ ...
```

### Collection: `access_logs`
```
access_logs/
  ├─ (auto-generated ID 1)
  │  ├─ secret_id: "API_KEY"
  │  ├─ action: "READ"
  │  ├─ user: "my-app"
  │  ├─ timestamp: Timestamp
  │  └─ ip_address: null
  │
  ├─ (auto-generated ID 2)
  │  ├─ secret_id: "DATABASE_URL"
  │  ├─ action: "WRITE"
  │  └─ ...
```

## Security Rules

By default, Firestore is in "Production mode" (all access denied).

To allow your app to read/write, add security rules:

1. Go to Firestore → Rules tab
2. Replace with:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Secrets collection - authenticated users only
    match /secrets/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Access logs collection - authenticated users only
    match /access_logs/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click "Publish"

**Note:** For service account access (recommended), these rules allow it automatically.

## Pricing

### Free Tier (Spark)
- 1 GB storage
- 50,000 reads/day
- 20,000 writes/day
- Perfect for development

### Pay-As-You-Go (Blaze)
- $0.06 per 100,000 reads
- $0.18 per 100,000 writes
- $0.18 per 100,000 deletes
- $0.018 per GB/month storage

### Cost Estimate
- Small team (1000 reads/writes daily): ~$2-5/month
- Medium app (1M reads/writes daily): ~$50-100/month
- Large app (100M reads/writes daily): ~$5000-10000/month

## Comparison: SQLite vs Firebase

| Feature | SQLite | Firebase |
|---------|--------|----------|
| Setup | < 1 min | 10-15 min |
| Infrastructure | None | Google Cloud |
| Backups | Manual | Automatic |
| Scaling | Limited | Automatic |
| Cost | $0 | $0-1000+/mo |
| Speed | Fast (local) | ~100-500ms (network) |
| Compliance | Limited | Full (SOC 2, HIPAA) |
| Multi-region | No | Yes (global) |

## Migration: SQLite → Firebase

```javascript
import { SecureEnvDB } from './src/storage/db.js';
import { FirebaseEnvDB } from './src/storage/firebase-db.js';

// Read from SQLite
const sqlite = new SecureEnvDB('env-secrets.db', key);
await sqlite.init();
const keys = await sqlite.listKeys();

// Write to Firebase
const firebase = new FirebaseEnvDB(key, 'my-project');
for (const k of keys) {
  const value = await sqlite.get(k.key);
  await firebase.set(k.key, value, k.created_by, k.description);
}

console.log('Migrated', keys.length, 'secrets');
```

## Troubleshooting

### "Error: Cannot find module 'firebase-admin'"
```bash
npm install firebase-admin
```

### "Error: GOOGLE_APPLICATION_CREDENTIALS not set"
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/firebase-key.json"
```

### "Error: Permission denied"
- Check Firestore security rules
- Verify service account key is valid
- Ensure database exists

### "Error: Project not found"
```bash
export FIREBASE_PROJECT_ID="correct-project-id"
```

### "Error: Cannot create index"
Firestore auto-manages indexes. If needed, create manually in Firebase Console.

## Best Practices

### ✅ DO

1. **Store credentials securely**
   ```bash
   # Never commit firebase-key.json
   echo "firebase-key.json" >> .gitignore
   ```

2. **Use environment variables**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/secure/path/firebase-key.json"
   ```

3. **Rotate credentials periodically**
   - Generate new key annually
   - Delete old keys

4. **Monitor costs**
   - Use Firestore quotas
   - Set billing alerts

5. **Enable backups**
   - Firebase auto-backups (30 days)
   - Export regularly

### ❌ DON'T

1. **Don't commit firebase-key.json**
2. **Don't use same key in multiple projects**
3. **Don't expose GOOGLE_APPLICATION_CREDENTIALS in code**
4. **Don't disable Firestore security**

## Next Steps

1. [Read DB_OPTIONS.md](./DB_OPTIONS.md) for database comparison
2. Test with `node examples/firebase-storage.js`
3. Integrate into your application
4. Set up monitoring and alerts
5. Plan for scale and cost optimization

## Resources

- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)
- [Firebase Admin SDK](https://firebase.google.com/docs/database/admin/start)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Pricing Calculator](https://firebase.google.com/pricing)
