# envman - Environment Variables Management CLI

A comprehensive Node.js CLI tool for managing environment variables safely. Features include:
- File-based management (development)
- **Encrypted database storage** (production)
- Secure key management with audit trails

## Features

### 📁 File-Based Management
- Set, get, delete environment variables
- Multiple output formats (JSON, table, shell)
- Load, save, copy, validate files
- Merge and diff files
- Export in shell format

### 🔐 Secure Storage (NEW!)
- **AES-256-GCM encryption** at rest
- **Access audit logging** - track who accessed what
- **Integrity verification** - detect tampering
- **Key rotation** support
- **Export/import** with encryption
- Production-ready security

## Installation

```bash
npm install
npm install sqlite3  # For secure storage
chmod +x src/cli.js
chmod +x src/cli-store.js
```

## Quick Start - Secure Storage

For safe production storage, see [QUICKSTART_SECURE.md](./QUICKSTART_SECURE.md):

```bash
# Generate encryption key
node src/cli-store.js generate-key

# Store a secret
export ENCRYPTION_KEY="your-key-here"
node src/cli-store.js set API_KEY "secret-value" --description "API Key"

# Retrieve it
node src/cli-store.js get API_KEY

# View access logs
node src/cli-store.js logs --all
```

## Usage

### 📄 File-Based Management (Development)

#### Set a variable
```bash
node src/cli.js set API_KEY "secret123"
node src/cli.js set DB_HOST "localhost" --file .env.local
```

#### Get a variable
```bash
node src/cli.js get API_KEY
```

#### List all variables
```bash
node src/cli.js list
node src/cli.js list --format json
node src/cli.js list --format shell
node src/cli.js list --prefix DB_  # Filter by prefix
```

#### Delete a variable
```bash
node src/cli.js delete API_KEY
node src/cli.js del SECRET_TOKEN
node src/cli.js rm PASSWORD
```

### File Operations

#### Load variables from a file
```bash
node src/cli.js load .env.example
```

#### Save variables to a file
```bash
node src/cli.js save .env.backup
```

#### Copy a file
```bash
node src/cli.js copy .env .env.local
```

#### Validate a file
```bash
node src/cli.js validate .env
```

#### Merge two files
```bash
node src/cli.js merge .env.defaults .env.local
node src/cli.js merge file1 file2 --format json
```

#### Compare two files
```bash
node src/cli.js diff .env .env.example
```

#### Export in shell format
```bash
node src/cli.js export
node src/cli.js export | bash  # Load into shell
```

## Usage

### Basic Commands

#### Set a variable
```bash
node src/cli.js set API_KEY "secret123"
node src/cli.js set DB_HOST "localhost" --file .env.local
```

#### Get a variable
```bash
node src/cli.js get API_KEY
```

#### List all variables
```bash
node src/cli.js list
node src/cli.js list --format json
node src/cli.js list --format shell
node src/cli.js list --prefix DB_  # Filter by prefix
```

#### Delete a variable
```bash
node src/cli.js delete API_KEY
node src/cli.js del SECRET_TOKEN
node src/cli.js rm PASSWORD
```

### File Operations

#### Load variables from a file
```bash
node src/cli.js load .env.example
```

#### Save variables to a file
```bash
node src/cli.js save .env.backup
```

#### Copy a file
```bash
node src/cli.js copy .env .env.local
```

#### Validate a file
```bash
node src/cli.js validate .env
```

#### Merge two files
```bash
node src/cli.js merge .env.defaults .env.local
node src/cli.js merge file1 file2 --format json
```

#### Compare two files
```bash
node src/cli.js diff .env .env.example
```

#### Export in shell format
```bash
node src/cli.js export
node src/cli.js export | bash  # Load into shell
```

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--file <path>` | `-f` | Target .env file (default: .env) |
| `--format <format>` | | Output format: `json`, `table`, `shell` (default: table) |
| `--prefix <prefix>` | | Filter variables by prefix |
| `--global` | `-g` | Use environment variables instead of file |
| `--help` | `-h` | Show help message |
| `--version` | `-v` | Show version |

## Examples

```bash
# Set production API key in specific file
node src/cli.js set API_KEY "prod-key-123" --file .env.production

# List all database variables as JSON
node src/cli.js list --prefix DB_ --format json

# Validate configuration
node src/cli.js validate .env

# Generate shell exports
node src/cli.js export > env.sh
source env.sh

# Compare development and production configs
node src/cli.js diff .env.development .env.production

# Merge multiple environment files
node src/cli.js merge .env.defaults .env.local

# Use global environment variables
node src/cli.js get PATH --global
node src/cli.js list --global --format json
```

## File Format

The tool supports standard `.env` file format:

```
# Comments start with #
API_KEY=secret123
DB_HOST=localhost
DB_PORT=5432
LONG_VALUE="value with spaces"
MULTILINE="line1\nline2"
```

## Features

- ✅ Set, get, delete environment variables
- ✅ List variables in multiple formats (table, JSON, shell)
- ✅ Load and save `.env` files
- ✅ Validate `.env` files
- ✅ Merge and diff files
- ✅ Export in shell format
- ✅ Filter by prefix
- ✅ Work with global environment variables
- ✅ Support for quoted values and special characters

## 🔐 Secure Storage Features

- ✅ **AES-256-GCM encryption** for all secrets
- ✅ **Audit logging** - track every access with who/what/when
- ✅ **Integrity verification** using PBKDF2 hashes
- ✅ **Multiple database backends** - SQLite, PostgreSQL, Firebase Firestore
- ✅ **Key management** - separate from encrypted data
- ✅ **Export/import** with encryption
- ✅ **Access control** - user tracking

## 📊 Database Options

Choose based on your needs:

| Database | Use Case | Setup | Cost |
|----------|----------|-------|------|
| **SQLite** | Development, MVP | < 1 min | Free |
| **SSH File** | Remote server storage | 5 min | Server cost |
| **PostgreSQL** | Production, teams | 15 min | $20-100/mo |
| **Firebase** | Fast deployment, scaling | 10 min | $0-50/mo |
| **DynamoDB** | AWS ecosystem | 10 min | $50-200/mo |

See [DB_OPTIONS.md](./DB_OPTIONS.md) for detailed comparison.

## Documentation

| Document | Purpose |
|----------|---------|
| [QUICKSTART_SECURE.md](./QUICKSTART_SECURE.md) | Get started with secure storage in 5 minutes |
| [SAFE_STORAGE_GUIDE.md](./SAFE_STORAGE_GUIDE.md) | How secure storage works, why it matters |
| [SECURITY.md](./SECURITY.md) | Detailed security practices and best practices |
| [STORAGE_COMPARISON.md](./STORAGE_COMPARISON.md) | Compare .env files vs database vs external KMS |
| [DB_OPTIONS.md](./DB_OPTIONS.md) | Database backends: SQLite, PostgreSQL, Firebase, DynamoDB |
| [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) | Firebase Firestore setup and integration guide |
| [SSH_SETUP.md](./SSH_SETUP.md) | SSH file storage on remote server (134.185.111.151) |
| [DATABASE_COMPARISON.md](./DATABASE_COMPARISON.md) | Complete database comparison matrix |

## Development

```bash
# Run file-based CLI
node src/cli.js --help

# Run secure storage CLI
node src/cli-store.js --help

# Run example
node examples/secure-storage.js

# Test
npm test
```

## Architecture

```
Development          →  Staging/Production      →  Enterprise
   .env files              Encrypted DB            Vault/KMS
  (simple)              (balanced security)    (full compliance)
```

## Example: Development vs Production

### Development (quick & easy)
```bash
# Use .env files
node src/cli.js set API_KEY "dev-key"
node src/cli.js list
```

### Production (secure & audited)
```bash
# Use encrypted database
export ENCRYPTION_KEY=$(aws secretsmanager get-secret-value ...)
node src/cli-store.js set API_KEY "prod-key" --user automation
node src/cli-store.js logs --all  # Audit trail
```

## Security Summary

**Secure Storage protects against:**
- ✓ Accidental exposure (encrypted at rest)
- ✓ Unauthorized access (audit logs detect it)
- ✓ Data tampering (PBKDF2 verification)
- ✓ Key compromise (separate key management)
- ✓ Compliance violations (audit trail)

See [SAFE_STORAGE_GUIDE.md](./SAFE_STORAGE_GUIDE.md) for details.

## Features
