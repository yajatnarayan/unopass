import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { VaultService } from './vaultService';
import { generatePassword } from './passwordGenerator';
import { VaultEntry } from './types';
import { RateLimiter } from './middleware/rateLimiter';
import {
  validateMasterPassword,
  validateVaultEntry,
  validateSearchQuery,
  validateDomain,
  ValidationError,
} from './validation/validators';

const app = express();
const vaultService = new VaultService();
const unlockRateLimiter = new RateLimiter();

// Whitelist specific extension IDs (REQUIRED for extension access)
const ALLOWED_EXTENSION_IDS = process.env.ALLOWED_EXTENSION_IDS
  ? process.env.ALLOWED_EXTENSION_IDS.split(',').map(id => id.trim())
  : [];

// Warn if no extension IDs are whitelisted
if (ALLOWED_EXTENSION_IDS.length === 0) {
  console.warn('[SECURITY] ALLOWED_EXTENSION_IDS not set - browser extensions will be blocked');
  console.warn('[SECURITY] Set ALLOWED_EXTENSION_IDS=your-extension-id to enable extension access');
}

const allowedOrigin = (origin: string | undefined) => {
  if (!origin) return true;

  // DENY chrome extensions by default unless explicitly whitelisted
  if (origin.startsWith('chrome-extension://')) {
    if (ALLOWED_EXTENSION_IDS.length === 0) {
      console.warn(`[SECURITY] Blocked chrome-extension origin (no IDs whitelisted): ${origin}`);
      return false;
    }
    const extensionId = origin.replace('chrome-extension://', '');
    const allowed = ALLOWED_EXTENSION_IDS.includes(extensionId);
    if (!allowed) {
      console.warn(`[SECURITY] Blocked non-whitelisted extension: ${extensionId}`);
    }
    return allowed;
  }

  // Allow localhost for development
  return /^http:\/\/localhost(:\d+)?$/.test(origin);
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (allowedOrigin(origin || undefined)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Enhanced security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'no-referrer' },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
  })
);

app.use(express.json({ limit: '1mb' }));

// Enable trust proxy if behind a reverse proxy (nginx, etc.)
// This ensures rate limiting works correctly with proxy-forwarded IPs
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', true);
  console.log('[CONFIG] Trust proxy enabled - using X-Forwarded-For for client IPs');
} else {
  console.log('[CONFIG] Trust proxy disabled - using direct connection IPs (set TRUST_PROXY=true if behind proxy)');
}

const PORT = process.env.PORT || 4000;

app.get('/api/status', (_req, res) => {
  res.json(vaultService.status());
});

app.post('/api/unlock', unlockRateLimiter.middleware(), async (req, res) => {
  const { masterPassword, createIfMissing } = req.body || {};
  try {
    validateMasterPassword(masterPassword);
    const result = await vaultService.unlock(masterPassword, Boolean(createIfMissing));
    // Reset rate limit on successful unlock
    unlockRateLimiter.resetClient(req);
    return res.json(result);
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === 'NO_VAULT') {
      return res.status(404).json({ error: 'Vault not found. Pass createIfMissing to initialize.' });
    }
    return res.status(401).json({ error: 'Invalid master password' });
  }
});

app.post('/api/lock', (_req, res) => {
  vaultService.lock();
  res.json({ locked: true });
});

function sessionToken(req: express.Request) {
  return (req.headers['x-session-token'] || req.headers['X-Session-Token']) as string | undefined;
}

function requireToken(req: express.Request, res: express.Response): string | undefined {
  const token = sessionToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing session token' });
    return undefined;
  }
  return token;
}

function handleError(res: express.Response, err: any) {
  if (err.message === 'LOCKED') return res.status(401).json({ error: 'Vault is locked' });
  if (err.message === 'INVALID_SESSION') {
    return res.status(401).json({ error: 'Invalid session token' });
  }
  if (err.message === 'NOT_FOUND') {
    return res.status(404).json({ error: 'Not found' });
  }
  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ error: 'Unexpected error' });
}

app.get('/api/entries', async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return;
  try {
    const query = (req.query.q as string) || undefined;
    validateSearchQuery(query);
    const entries = await vaultService.getEntries(token, query);
    res.json({ entries });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    handleError(res, err);
  }
});

app.get('/api/autofill', async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return;
  const domain = (req.query.domain as string) || '';
  try {
    validateDomain(domain);
    const entries = await vaultService.getEntriesForDomain(token, domain);
    res.json({ entries });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    handleError(res, err);
  }
});

app.post('/api/entries', async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return;
  const payload = req.body as Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>;
  try {
    validateVaultEntry(payload);
    const entry = await vaultService.addEntry(token, payload);
    res.json({ entry });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    handleError(res, err);
  }
});

app.put('/api/entries/:id', async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return;
  try {
    // Partial validation for updates
    if (req.body.site || req.body.domain || req.body.username || req.body.password || req.body.notes !== undefined) {
      validateVaultEntry({
        site: req.body.site || 'placeholder',
        domain: req.body.domain || 'placeholder.com',
        username: req.body.username || 'placeholder',
        password: req.body.password || 'placeholder',
        notes: req.body.notes
      });
    }
    const updated = await vaultService.updateEntry(token, req.params.id, req.body);
    res.json({ entry: updated });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    handleError(res, err);
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return;
  try {
    await vaultService.deleteEntry(token, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/generate-password', (req, res) => {
  const token = requireToken(req, res);
  if (!token) return;

  try {
    // Validate session and refresh inactivity timer
    vaultService.touchSession(token);
    const password = generatePassword(req.body);
    res.json({ password });
  } catch (err: any) {
    if (err.message === 'LOCKED' || err.message === 'INVALID_SESSION') {
      return res.status(401).json({ error: 'Vault is locked or session invalid' });
    }
    res.status(400).json({ error: err.message || 'Invalid options' });
  }
});

app.post('/api/export', async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return;

  // Require explicit confirmation
  const { confirm } = req.body || {};
  if (confirm !== true) {
    return res.status(400).json({ error: 'Export requires explicit confirmation' });
  }

  try {
    const entries = await vaultService.getEntries(token);

    // WARNING: Returns UNENCRYPTED passwords - user must protect this file
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="unopass-export-${Date.now()}.json"`);
    res.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: entries.map(e => ({
        site: e.site,
        domain: e.domain,
        username: e.username,
        password: e.password,
        notes: e.notes,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      }))
    });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    handleError(res, err);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`UnoPass server listening on http://localhost:${PORT}`);
});
