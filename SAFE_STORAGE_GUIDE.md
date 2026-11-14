# 🔐 How to Safely Store Keys in a Database

## The Problem

Storing secrets in `.env` files exposes them to:
- Accidental git commits
- File system access by unauthorized users
- No audit trail of who accessed secrets
- No integrity verification
- Plain text storage

## The Solution

Use **encrypted database storage** with:
1. **AES-256-GCM encryption** - Industry-standard encryption
2. **Access logging** - Know who accessed what and when
3. **Integrity verification** - Detect tampering
4. **Secure key management** - Separate encryption from storage

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                        Your Application                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    request: get('API_KEY')
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           Secure Database (SQLite)                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Encrypted Storage                                       ││
│  │ KEY          │ ENCRYPTED_VALUE                         ││
│  │ ──────────────────────────────────────────────────────  ││
│  │ API_KEY      │ iv:ax7f9j2k3L9w:tag  (encrypted)        ││
│  │ DB_PASSWORD  │ iv:kL2m9x3p5Q1r:tag  (encrypted)        ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Access Logs                                             ││
│  │ WHO    │ WHAT      │ WHEN        │ ACTION               ││
│  │ ─────────────────────────────────────────────────────  ││
│  │ alice  │ API_KEY   │ 2024-01-15  │ READ                ││
│  │ bob    │ DB_PWD    │ 2024-01-16  │ WRITE               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              ↑
                    AES-256-GCM decryption
         (using ENCRYPTION_KEY from secure location)
                              ↑
┌─────────────────────────────────────────────────────────────┐
│     Key Management System (KMS)                              │
│     AWS Secrets Manager / Vault / Azure Key Vault            │
│     ✓ Secure storage                                         │
│     ✓ Access control                                         │
│     ✓ Rotation policies                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Three-Layer Security

### Layer 1: Encryption
**Technology:** AES-256-GCM
```
Plaintext:  "sk-1234567890abcdef"
         ↓
Encrypted:  "Hmx7k9:encrypted_hex_data:tag123"
         ↓
In Database: Only encrypted version stored
```

### Layer 2: Key Management
**Technology:** External KMS or environment variable
```
Database doesn't store ENCRYPTION_KEY
         ↓
ENCRYPTION_KEY stored in:
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Or secure environment variable
         ↓
Only needed at runtime for decryption
```

### Layer 3: Audit Logging
**Technology:** Immutable access logs
```
Every access recorded:
- WHO: alice (user)
- WHAT: DATABASE_URL (secret key)
- WHEN: 2024-01-15 14:23:45 (timestamp)
- ACTION: READ (get/set/delete)
         ↓
Logs enable:
- Security audits
- Compliance certification
- Incident investigation
```

---

## Implementation Steps

### Step 1: Generate Encryption Key

```bash
# Generate 32-byte random key (AES-256 requirement)
node src/cli-store.js generate-key

# Output:
# New encryption key:
# 3kB8nL2qP9xW5vZ7jF4mQ6hR8sT1uD3vC5bN7gP2kL9jM4xQ6rW8
```

### Step 2: Secure the Key

Store in a **Key Management Service** (KMS):

**Option A: AWS Secrets Manager**
```bash
aws secretsmanager create-secret \
  --name encryption-key \
  --secret-string "3kB8nL2qP9xW5vZ7jF4mQ6hR8sT1uD3vC5bN7gP2kL9jM4xQ6rW8"
```

**Option B: HashiCorp Vault**
```bash
vault kv put secret/encryption-key value="3kB8nL2qP9xW5vZ7jF4mQ6..."
```

**Option C: Environment variable (development)**
```bash
export ENCRYPTION_KEY="3kB8nL2qP9xW5vZ7jF4mQ6hR8sT1uD3vC5bN7gP2kL9jM4xQ6rW8"
```

### Step 3: Store Secrets

```bash
# Store with automatic encryption
node src/cli-store.js set API_KEY "sk-1234567890" \
  --description "Third-party API key"

# Stored as:
# KEY: API_KEY
# ENCRYPTED_VALUE: (AES-256-GCM encrypted)
# HASH: (PBKDF2 for integrity check)
```

### Step 4: Retrieve Secrets

```bash
# Application retrieves (automatically decrypted)
const apiKey = await db.get('API_KEY', 'my-app');
// Returns: "sk-1234567890"

# Access logged:
# WHO: my-app
# WHAT: API_KEY
# WHEN: 2024-01-15 14:23:45
# ACTION: READ
```

### Step 5: Monitor Access

```bash
# View who accessed what
node src/cli-store.js logs --all

# Example output:
# 2024-01-15 14:23:45 | READ | API_KEY | my-app
# 2024-01-15 14:24:12 | READ | DATABASE_URL | my-app
# 2024-01-15 15:10:33 | WRITE | API_KEY | admin
```

---

## Security Features Explained

### Why AES-256-GCM?

| Feature | Benefit |
|---------|---------|
| **AES-256** | US government-approved encryption (NSA Suite B) |
| **GCM Mode** | Provides authentication + confidentiality |
| **Unique IV** | Each encryption has random IV (prevents patterns) |
| **Auth Tag** | Detects tampering during decryption |

### Why Separate Encryption Key?

**Bad (Key stored in database):**
```
Database: {
  encrypted_value: "...",
  encryption_key: "secret123"  ← Attacker gets both!
}
```

**Good (Key from KMS):**
```
Database: {
  encrypted_value: "..."  ← Useless without key
}

KMS: encryption_key  ← Separate, with access control
```

### Why Access Logs?

**Compliance Requirements:**
- PCI DSS: Maintain access logs
- HIPAA: Audit trail required
- SOC 2: Demonstrate access controls
- GDPR: Can prove who accessed personal data

**Security Investigation:**
```
Timeline of suspicious activity:
14:23:45 - alice READ DATABASE_URL (normal)
14:24:12 - alice READ API_KEY (normal)
15:45:33 - unknown_user READ API_KEY (SUSPICIOUS!)
          → Investigate! Unauthorized access detected
```

---

## Comparison: Before & After

### ❌ Before: Plain .env File
```bash
# .env (gitignored but still risky)
API_KEY=sk-1234567890
DATABASE_URL=postgresql://user:pass@localhost/db
JWT_SECRET=my-secret-key

Risks:
✗ If developer's laptop is stolen: all secrets visible
✗ If employee shares laptop: secrets visible
✗ If .env is accidentally committed: GitHub has it forever
✗ If database is hacked: all credentials compromised
✗ No way to know who accessed what
✗ No way to rotate keys safely
```

### ✅ After: Encrypted Database
```bash
# Database (encrypted)
API_KEY     → (encrypted with AES-256-GCM)
DATABASE_URL → (encrypted with AES-256-GCM)
JWT_SECRET   → (encrypted with AES-256-GCM)

# ENCRYPTION_KEY (in KMS, not in database)
AWS Secrets Manager: 3kB8nL2qP9xW5vZ7jF4mQ...

Benefits:
✓ If database is stolen: encrypted, useless without key
✓ If database is hacked: encrypted, keys in separate KMS
✓ Access logs show who accessed what
✓ Key rotation possible without updating app
✓ Compliance-ready for audits
✓ Can detect tampering
```

---

## Best Practices

### ✅ DO

```javascript
// ✓ Store key in KMS
const key = await aws.secretsmanager.getSecretValue('encryption-key');

// ✓ Rotate keys periodically
const newKey = SecureEncryption.generateKey();
await db.rotateKey(newKey);

// ✓ Log access for audit
const value = await db.get('DATABASE_URL', 'my-app');
// Automatically logged

// ✓ Verify integrity
const isValid = await db.verify('API_KEY', expectedValue);

// ✓ Encrypt exports
await db.exportToFile('backup.enc', exportKey);
```

### ❌ DON'T

```javascript
// ✗ Don't hardcode keys
const API_KEY = "sk-1234567890";

// ✗ Don't log secret values
console.log('KEY:', secretValue);  // Never!

// ✗ Don't store key with encrypted data
{
  encrypted: "...",
  key: "secret123"  // Both stolen!
}

// ✗ Don't use weak encryption
const cipher = crypto.createCipher('aes-128');  // Too weak

// ✗ Don't ignore access logs
await db.getAllAccessLogs();  // At least monthly review
```

---

## Compliance Checklist

### PCI DSS (if handling payment data)
- [ ] Encrypt secrets with strong algorithm (AES-256)
- [ ] Maintain access audit trail
- [ ] Control access with authentication
- [ ] Rotate encryption keys annually
- [ ] Test key recovery procedures

### HIPAA (if handling health data)
- [ ] Implement encryption and access controls
- [ ] Maintain comprehensive audit logs
- [ ] Conduct regular compliance audits
- [ ] Implement business associate agreements

### SOC 2 Type II
- [ ] Encrypt data at rest
- [ ] Maintain audit logs (minimum 90 days)
- [ ] Implement access controls
- [ ] Change management procedures
- [ ] Incident response procedures

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Decryption fails | Check ENCRYPTION_KEY is set correctly |
| "Secret not found" | Verify key name with `list` command |
| Performance slow | Database is encrypted, normal overhead |
| Lost database | Use encrypted backup (if available) |
| Key rotation needed | Generate new key, migrate data |

---

## Migration from .env to Database

```bash
# 1. Read existing .env
envvars=$(node src/cli.js list --format json)

# 2. Initialize secure database
export ENCRYPTION_KEY=$(node src/cli-store.js generate-key)

# 3. Import all variables
for key in $(echo "$envvars" | jq -r 'keys[]'); do
  value=$(echo "$envvars" | jq -r ".[$key]")
  node src/cli-store.js set "$key" "$value"
done

# 4. Verify migration
node src/cli-store.js list

# 5. Delete old .env (or keep as backup)
rm .env  # After verification!
```

---

## Production Deployment Example

```bash
#!/bin/bash
# startup.sh - Secure deployment

# 1. Get encryption key from KMS
export ENCRYPTION_KEY=$(
  aws secretsmanager get-secret-value \
    --secret-id prod-encryption-key \
    --query SecretString \
    --output text
)

# 2. Verify key is set
if [ -z "$ENCRYPTION_KEY" ]; then
  echo "ERROR: ENCRYPTION_KEY not retrieved from KMS"
  exit 1
fi

# 3. Start application
node app.js

# Application uses:
# const db = new SecureEnvDB('env-secrets.db', process.env.ENCRYPTION_KEY);
# const dbUrl = await db.get('DATABASE_URL', 'app');
```

---

## Key Takeaways

1. **Never store secrets in plain text** - Use AES-256-GCM encryption
2. **Never store encryption key with encrypted data** - Use separate KMS
3. **Always audit access** - Log who accessed what and when
4. **Rotate keys periodically** - Reduces impact of key compromise
5. **Monitor access logs** - Detect unauthorized access quickly
6. **Verify integrity** - Detect tampering with PBKDF2 hashes
7. **Use for production** - This approach is production-ready

---

## Resources

- [AES-256-GCM Explained](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [NIST Encryption Guidelines](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [HashiCorp Vault](https://www.vaultproject.io/)
- [Node.js Crypto Docs](https://nodejs.org/api/crypto.html)
