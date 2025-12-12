# UnoPass - Secure Local-First Password Manager

Local-first password vault that encrypts everything at rest and only decrypts in memory after you unlock with a master password.

**🎯 Built as an MVP replica of 1Password focusing on core security and usability.**

## ✨ Key Features

- 🔐 **Military-Grade Encryption**: AES-256-GCM with scrypt key derivation (OWASP-compliant)
- 🔒 **Local-Only Storage**: Your data never leaves your machine
- 🚀 **Browser Autofill**: Chrome extension with keyboard shortcut (Alt + Shift + L)
- 🔑 **Cryptographic Password Generator**: Uses Node.js crypto.randomInt
- 🛡️ **Security Hardening**: Rate limiting, HMAC integrity checks, input validation
- 💾 **Export/Backup**: Download your vault as JSON
- ⏱️ **Auto-Lock**: Automatic timeout after inactivity

## 🏗 Architecture

### Crypto Layer
- Master password → **scrypt** (N=2^16, r=8, p=1, 32-byte key, 128MB maxmem) → vault key
- **OWASP-recommended parameters**: N=65,536 iterations (upgraded from 16,384)
- Vault contents encrypted with **AES-256-GCM** (authenticated encryption)
- **HMAC-SHA256** integrity verification to detect tampering
- Fresh IV for every encryption operation
- On disk: only `vault.enc.json` with salt, KDF params, and ciphertext
- **Storage layer**: Vault is stored locally at `VAULT_PATH` (default `./vault.enc.json`). Writes are atomic via temp-file + rename to avoid partial saves.
- **Session & locking**: Unlocking creates an in-memory session with the derived key and decrypted entries plus a random session token. No master password or plaintext is persisted. Auto-lock runs after inactivity (`LOCK_TIMEOUT_MS`, default 10 minutes) or on restart.
- **API layer**: Express server (`/server/src/index.ts`) exposes `/api/unlock`, `/api/lock`, `/api/entries`, `/api/autofill`, and `/api/generate-password`. CORS only allows localhost and the extension scheme.
- **UI layer**: React (Vite) app for unlocking, searching, CRUD, clipboard copy with auto-clear, and a password generator that can drop passwords straight into new entries.
- **Autofill helper**: Lightweight Chrome extension (`extension/`) that fetches credentials for the current domain from the local server using the session token and fills the first username/password pair when you press `Alt + Shift + L`.

### Storage Layer
- Vault stored locally at `VAULT_PATH` (default: `./vault.enc.json`)
- **Atomic writes**: temp-file + rename to prevent corruption
- Only encrypted data touches disk

### Session & Locking
- Unlocking creates in-memory session with derived key + decrypted entries
- Random UUID session token (never persisted)
- **Auto-lock** after inactivity (default: 10 min, configurable via `LOCK_TIMEOUT_MS`)
- Locking clears all decrypted data from memory

### API Layer
- Express server exposes RESTful endpoints
- **Enhanced security headers**: CSP, HSTS, X-Frame-Options, referrer policy
- **Rate limiting**: 5 attempts per 15 min, 1-hour lockout after
- **Input validation**: Length limits, type checking, sanitization
- CORS restricted to localhost + whitelisted extension IDs

### UI Layer
- React (Vite) web app
- Search, CRUD operations, clipboard auto-clear
- Password generator integrated into entry creation

### Browser Extension
- Lightweight Chrome extension for autofill
- Keyboard shortcut: Alt + Shift + L
- Domain-based credential matching

## 🔒 Security Model

### Encryption Stack
```
Master Password
    ↓ scrypt (N=65,536, r=8, p=1, salt=16 bytes)
Master Key (256-bit)
    ↓ AES-256-GCM (IV=12 bytes, fresh per operation)
Encrypted Vault
    ↓ HMAC-SHA256
Integrity Tag
```

### Security Guarantees
- **No plaintext on disk**: All vault data encrypted at rest
- **Tamper detection**: HMAC verifies file integrity; AES-GCM auth tag prevents modifications
- **Memory-only decryption**: Plaintext exists only in RAM while unlocked
- **Auto-lock**: Sessions expire after inactivity or server restart
- **Rate limiting**: Brute-force protection (5 attempts/15 min → 1-hour block)
- **Cryptographically secure RNG**: Password generation uses `crypto.randomInt`
- **Session tokens**: Random UUIDs, rotated on each unlock
- **Clipboard clearing**: Auto-wipe after 20 seconds
- **Local-only**: Zero network exposure; all traffic stays on localhost

### Attack Mitigations
| Attack Vector | Mitigation |
|---------------|------------|
| Brute force (offline) | Strong KDF (scrypt N=65,536) |
| Brute force (online) | Rate limiting (5/15min) |
| File tampering | HMAC-SHA256 verification |
| Weak passwords | Cryptographic password generator |
| Injection attacks | Comprehensive input validation |
| XSS/CSRF | CSP headers, same-origin policy |
| Session hijacking | Secure token generation, auto-expiry |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation & Setup

**1. Install dependencies**
```bash
# Install server dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

**2. Start the server**
```bash
npm run dev
```
Server runs on `http://localhost:4000` (configurable via `PORT` env var)

**3. Start the web UI** (in a new terminal)
```bash
cd client
npm run dev
```
Web app available at `http://localhost:5173`

**4. Create your vault**
- Open http://localhost:5173
- Enter a strong master password (min 8 chars, recommend 12+)
- Check "Create new vault if missing"
- Click "Unlock"

**⚠️ IMPORTANT**: Your master password cannot be recovered if lost!

### Environment Variables

```bash
# Server configuration
PORT=4000                           # API server port
VAULT_PATH=./vault.enc.json         # Vault file location
LOCK_TIMEOUT_MS=600000              # Auto-lock timeout (10 min)
ALLOWED_EXTENSION_IDS=ext-id-here   # Whitelisted extension IDs (comma-separated)

# Client configuration
VITE_API_URL=http://localhost:4000/api  # API base URL
```

### Building for Production

```bash
# Build server
npm run build

# Build client
cd client && npm run build
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
npm test                # Run all tests
npm test -- --watch     # Watch mode
npm test -- --coverage  # Coverage report
```

**Test Coverage:**
- ✅ Encryption/decryption (correct & incorrect passwords)
- ✅ Password generator (randomness, character sets, constraints)
- ✅ Input validation (edge cases, length limits)
- ✅ Rate limiting middleware
- ✅ Domain matching logic
- ✅ HMAC integrity verification

## 🌐 Browser Extension Setup

**Install the Extension:**
1. Open Chrome/Edge and navigate to `chrome://extensions`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension/` directory from this repo
5. Note the extension ID (you can whitelist it via `ALLOWED_EXTENSION_IDS`)

**Configure the Extension:**
1. In the UnoPass web app, unlock your vault
2. Click "Copy session token (for extension)"
3. Click the extension icon in your browser
4. Click "Options" and paste your session token
5. Click "Save"

**Using Autofill:**
- Navigate to any login page
- Press **Alt + Shift + L**
- UnoPass will fill the first matching credential for the domain

## 📋 Manual Test Checklist

Use this checklist to verify the MVP functionality:

- [x] **Create vault**: Unlock with a new master password, verify `vault.enc.json` created with no plaintext
- [x] **Wrong password**: Lock vault, attempt unlock with incorrect password → should fail
- [x] **Add credential**: Add a new entry, verify it appears in the list
- [x] **Search**: Search by site/username/domain, verify filtering works
- [x] **Edit credential**: Modify an entry, unlock/lock to verify persistence
- [x] **Delete credential**: Remove an entry with confirmation
- [x] **Copy username/password**: Verify clipboard auto-clears after 20s
- [x] **Password generator**: Generate passwords with different character sets
- [x] **Auto-lock**: Set `LOCK_TIMEOUT_MS=5000`, wait 5s idle, verify re-lock
- [x] **Restart safety**: Stop/start server, verify vault is locked
- [x] **Export vault**: Download JSON export, verify all data present
- [x] **Autofill**: Install extension, press Alt+Shift+L on login page, verify fill
- [x] **Rate limiting**: Fail unlock 6 times, verify 1-hour lockout
- [x] **HMAC verification**: Manually corrupt `vault.enc.json`, verify unlock fails

## 📁 Project Structure

```
unopass/
├── server/
│   ├── src/
│   │   ├── crypto/
│   │   │   ├── vaultCrypto.ts       # AES-256-GCM encryption, scrypt KDF
│   │   │   └── vaultCrypto.test.ts
│   │   ├── storage/
│   │   │   └── vaultStorage.ts      # Atomic file operations
│   │   ├── middleware/
│   │   │   ├── rateLimiter.ts       # Brute-force protection
│   │   │   └── rateLimiter.test.ts
│   │   ├── validation/
│   │   │   ├── validators.ts        # Input validation & sanitization
│   │   │   └── validators.test.ts
│   │   ├── utils/
│   │   │   ├── domain.ts            # Domain normalization & matching
│   │   │   └── domain.test.ts
│   │   ├── vaultService.ts          # Core vault business logic
│   │   ├── passwordGenerator.ts     # Cryptographic password generation
│   │   ├── passwordGenerator.test.ts
│   │   ├── types.ts                 # TypeScript interfaces
│   │   └── index.ts                 # Express server & API routes
│   ├── tsconfig.json
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.tsx                  # Main React application
│   │   ├── App.css
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
├── extension/
│   ├── manifest.json                # Chrome extension manifest
│   ├── background.js                # Service worker (API calls)
│   ├── content.js                   # Page script (autofill logic)
│   ├── options.html                 # Extension settings UI
│   └── options.js
├── vault.enc.json                   # Encrypted vault (created on first unlock)
├── package.json
├── tsconfig.base.json
└── README.md
```

## ⚠️ Security Considerations

### Threat Model

**Protected Against:**
- ✅ Offline brute-force (strong scrypt KDF)
- ✅ Online brute-force (rate limiting)
- ✅ File tampering (HMAC verification)
- ✅ Weak passwords (cryptographic generator)
- ✅ Network attacks (local-only, no cloud)
- ✅ Injection attacks (input validation)

**NOT Protected Against:**
- ❌ Physical access to unlocked vault
- ❌ Keyloggers or malware on your machine
- ❌ Memory dumps while vault is unlocked
- ❌ Master password compromise
- ❌ Operating system vulnerabilities

### Best Practices
1. **Strong master password**: 12+ characters, mixed case, numbers, symbols
2. **Regular backups**: Export vault monthly, store offline securely
3. **Keep software updated**: Check for security patches regularly
4. **Secure your machine**: Use full-disk encryption, antivirus, firewall
5. **Limit session tokens**: Don't share; regenerate if compromised (re-lock/unlock)

## 🚫 What's NOT Included (By Design)

This MVP focuses on core functionality. Explicitly excluded:

- ❌ Cloud sync
- ❌ Multi-user / team sharing
- ❌ Account recovery / recovery keys
- ❌ Biometric authentication
- ❌ Mobile apps
- ❌ Password breach monitoring
- ❌ Two-factor authentication (2FA)
- ❌ Secure notes / file storage
- ❌ Credit card / identity storage
- ❌ Password history
- ❌ Folder organization

## 📊 Performance

| Operation | Time |
|-----------|------|
| Key derivation (scrypt) | ~150-250ms |
| Vault encryption | <10ms |
| Vault decryption | <10ms |
| Autofill (keypress → fill) | <100ms |

## 🐛 Troubleshooting

**Vault won't unlock**
- Verify master password is correct (case-sensitive)
- Check `vault.enc.json` exists and isn't corrupted
- Look for errors in server console

**Extension not working**
- Ensure server is running on port 4000
- Verify session token is current (copy from web app)
- Check extension has correct permissions
- Look for errors in browser console (F12)

**Rate limit lockout**
- Wait 1 hour, or restart server to reset limits
- Check server logs for `429` status codes

**Vault file corrupted**
- If you have an export, delete `vault.enc.json` and re-import
- Otherwise, data is unrecoverable (this is why backups matter!)

## 📄 License

ISC License

## 🙏 Acknowledgments

Built as an educational MVP demonstrating secure password management principles, inspired by 1Password.

---

**⚠️ DISCLAIMER**: This is an MVP for educational purposes. For production use, conduct a professional security audit and penetration testing.

## Security Updates & Configuration

### Environment Variables

```bash
# Server configuration
PORT=4000                               # API server port (default: 4000)
VAULT_PATH=./vault.enc.json             # Vault file location
LOCK_TIMEOUT_MS=600000                  # Auto-lock timeout in ms (default: 10 min)

# Extension security (REQUIRED for browser extension)
ALLOWED_EXTENSION_IDS=your-ext-id-here  # Comma-separated extension IDs to whitelist
                                        # Leave unset to BLOCK all extensions (secure default)

# Proxy configuration
TRUST_PROXY=true                        # Set if behind reverse proxy (nginx, etc.)
                                        # Required for rate limiting to work correctly
```

### Extension Token Management

The browser extension stores session tokens in local storage. To clear your token:
1. Open extension options (right-click extension icon → Options)
2. Click "Clear Token" button
3. Token is removed from storage and autofill is disabled

Tokens automatically expire when the vault locks (timeout or server restart).

### Critical Security Notes

1. **HMAC Integrity**: Version 2+ vaults REQUIRE HMAC for integrity verification. Missing or invalid HMAC will reject decryption.
2. **File Permissions**: Vault files are created with `0o600` (owner read/write only) to prevent unauthorized access on multi-user systems.
3. **Extension Whitelist**: Chrome extensions are BLOCKED by default. You MUST set `ALLOWED_EXTENSION_IDS` to enable autofill.
4. **Export Warning**: The export function returns UNENCRYPTED passwords. The file auto-locks the vault after export for security.
5. **Password Generation**: Now requires an active session and refreshes the inactivity timer.

