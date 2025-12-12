import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';

type VaultEntry = {
  id: string;
  site: string;
  domain: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const CLIPBOARD_CLEAR_MS = 20000;

async function api<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { 'X-Session-Token': token } : {}),
    },
  });
  if (res.status === 401) {
    throw new Error('LOCKED');
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data as T;
}

function UnlockView({
  onUnlock,
  busy,
  error,
}: {
  onUnlock: (password: string, createIfMissing: boolean) => void;
  busy: boolean;
  error?: string;
}) {
  const [password, setPassword] = useState('');
  const [create, setCreate] = useState(true);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onUnlock(password, create);
  };

  return (
    <div className="card">
      <h2>Unlock your vault</h2>
      <form onSubmit={submit} className="unlock-form">
        <label>
          Master password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your master password"
            required
          />
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={create}
            onChange={(e) => setCreate(e.target.checked)}
          />
          Create new vault if missing
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={busy || !password}>
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>
      <p className="hint">
        Your data never leaves this machine. Keep your master password safe; it
        cannot be recovered if lost.
      </p>
    </div>
  );
}

function PasswordGenerator({
  onUse,
  token,
}: {
  onUse: (password: string) => void;
  token?: string;
}) {
  const [length, setLength] = useState(20);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();

  const generate = async () => {
    setError(undefined);
    try {
      const res = await api<{ password: string }>(
        '/generate-password',
        {
          method: 'POST',
          body: JSON.stringify({ length, uppercase, lowercase, numbers, symbols }),
        },
        token
      );
      setValue(res.password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setTimeout(() => navigator.clipboard.writeText(''), CLIPBOARD_CLEAR_MS);
  };

  return (
    <div className="generator">
      <div className="row">
        <label>
          Length
          <input
            type="number"
            min={8}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
          />
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={uppercase}
            onChange={(e) => setUppercase(e.target.checked)}
          />
          Uppercase
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={lowercase}
            onChange={(e) => setLowercase(e.target.checked)}
          />
          Lowercase
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={numbers}
            onChange={(e) => setNumbers(e.target.checked)}
          />
          Numbers
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={symbols}
            onChange={(e) => setSymbols(e.target.checked)}
          />
          Symbols
        </label>
      </div>
      <div className="row generator-actions">
        <button type="button" onClick={generate}>
          Generate
        </button>
        <button
          type="button"
          disabled={!value}
          onClick={() => {
            onUse(value);
            copy();
          }}
        >
          Use
        </button>
        <div className="generated-value">{value || 'No password generated yet'}</div>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

function EntryForm({
  initial,
  onSave,
  onCancel,
  token,
}: {
  initial?: Partial<VaultEntry>;
  onSave: (data: {
    site: string;
    domain: string;
    username: string;
    password: string;
    notes?: string;
  }) => void;
  onCancel: () => void;
  token?: string;
}) {
  const [site, setSite] = useState(initial?.site || '');
  const [domain, setDomain] = useState(initial?.domain || '');
  const [username, setUsername] = useState(initial?.username || '');
  const [password, setPassword] = useState(initial?.password || '');
  const [notes, setNotes] = useState(initial?.notes || '');

  useEffect(() => {
    setSite(initial?.site || '');
    setDomain(initial?.domain || '');
    setUsername(initial?.username || '');
    setPassword(initial?.password || '');
    setNotes(initial?.notes || '');
  }, [initial]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ site, domain, username, password, notes });
  };

  return (
    <div className="modal">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{initial?.id ? 'Edit credential' : 'Add credential'}</h3>
          <button className="text" onClick={onCancel}>
            Close
          </button>
        </div>
        <form onSubmit={submit} className="form-grid">
          <label>
            Site / App
            <input
              value={site}
              onChange={(e) => setSite(e.target.value)}
              required
              placeholder="Example"
            />
          </label>
          <label>
            Domain
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
              placeholder="example.com"
            />
          </label>
          <label>
            Username / Email
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="user@example.com"
            />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="text"
            />
          </label>
          <label>
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <PasswordGenerator
            token={token}
            onUse={(pwd) => {
              setPassword(pwd);
            }}
          />
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit">{initial?.id ? 'Save changes' : 'Add credential'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  onCopy,
  onEdit,
  onDelete,
}: {
  entry: VaultEntry;
  onCopy: (value: string, label: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="entry-card">
      <div>
        <div className="entry-site">{entry.site}</div>
        <div className="entry-meta">
          <span>{entry.domain}</span> · <span>{entry.username}</span>
        </div>
      </div>
      <div className="entry-actions">
        <button type="button" onClick={() => onCopy(entry.username, 'Username')}>
          Copy user
        </button>
        <button type="button" onClick={() => onCopy(entry.password, 'Password')}>
          Copy password
        </button>
        <button type="button" className="secondary" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="danger" onClick={onDelete}>
          Delete
        </button>
      </div>
      {entry.notes && <p className="entry-notes">{entry.notes}</p>}
    </div>
  );
}

function useClipboardClear() {
  const [copied, setCopied] = useState<string>();

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(async () => {
      try {
        await navigator.clipboard.writeText('');
      } catch {
        // ignore: clipboard may be locked or blocked.
      }
    }, CLIPBOARD_CLEAR_MS);
  };

  return { copied, copy };
}

function App() {
  const [token, setToken] = useState<string>();
  const [locked, setLocked] = useState(true);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [activeEntry, setActiveEntry] = useState<VaultEntry | null>(null);
  const { copied, copy } = useClipboardClear();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.site.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        e.domain.toLowerCase().includes(q)
    );
  }, [entries, query]);

  const loadStatus = async () => {
    try {
      const res = await api<{ locked: boolean }>('/status');
      setLocked(res.locked);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const fetchEntries = async (session: string) => {
    const res = await api<{ entries: VaultEntry[] }>(
      `/entries${query ? `?q=${encodeURIComponent(query)}` : ''}`,
      {},
      session
    );
    setEntries(res.entries);
  };

  const unlock = async (password: string, createIfMissing: boolean) => {
    setBusy(true);
    setError(undefined);
    try {
      const res = await api<{ token: string }>('/unlock', {
        method: 'POST',
        body: JSON.stringify({ masterPassword: password, createIfMissing }),
      });
      setToken(res.token);
      setLocked(false);
      await fetchEntries(res.token);
    } catch (err: any) {
      setError(err.message);
      setLocked(true);
      setToken(undefined);
    } finally {
      setBusy(false);
    }
  };

  const lock = async () => {
    setBusy(true);
    try {
      await api('/lock', { method: 'POST' }, token);
    } finally {
      setToken(undefined);
      setLocked(true);
      setEntries([]);
      setBusy(false);
    }
  };

  const saveEntry = async (data: {
    site: string;
    domain: string;
    username: string;
    password: string;
    notes?: string;
  }) => {
    if (!token) return;
    setBusy(true);
    setError(undefined);
    try {
      if (activeEntry?.id) {
        const res = await api<{ entry: VaultEntry }>(
          `/entries/${activeEntry.id}`,
          { method: 'PUT', body: JSON.stringify(data) },
          token
        );
        setEntries((prev) => prev.map((e) => (e.id === res.entry.id ? res.entry : e)));
      } else {
        const res = await api<{ entry: VaultEntry }>(
          '/entries',
          { method: 'POST', body: JSON.stringify(data) },
          token
        );
        setEntries((prev) => [res.entry, ...prev]);
      }
      setActiveEntry(null);
    } catch (err: any) {
      if (err.message === 'LOCKED') {
        setLocked(true);
        setToken(undefined);
      }
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!token) return;
    if (!confirm('Delete this credential?')) return;
    try {
      await api(`/entries/${id}`, { method: 'DELETE' }, token);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      if (err.message === 'LOCKED') {
        setLocked(true);
        setToken(undefined);
      }
      setError(err.message);
    }
  };

  const refresh = async () => {
    if (!token) return;
    try {
      await fetchEntries(token);
    } catch (err: any) {
      if (err.message === 'LOCKED') {
        setLocked(true);
        setToken(undefined);
      }
    }
  };

  const copyToken = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
  };

  const exportData = async () => {
    if (!token) return;

    // Show warning about plaintext export
    const confirmed = confirm(
      'WARNING: Export will create a file with UNENCRYPTED passwords. ' +
      'Store the exported file securely. Continue?'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': token,
        },
        body: JSON.stringify({ confirm: true }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setLocked(true);
          setToken(undefined);
          throw new Error('Session expired');
        }
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unopass-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Auto-lock after export for security
      await lock();
    } catch (err: any) {
      setError(err.message || 'Failed to export vault data');
    }
  };

  return (
    <div className="layout">
      <header className="header">
        <div>
          <h1>UnoPass</h1>
          <p className="subtitle">Local-only vault with strong encryption.</p>
        </div>
        <div className="header-actions">
          <button onClick={refresh} disabled={!token}>
            Refresh
          </button>
          <button onClick={lock} disabled={!token || busy}>
            Lock
          </button>
        </div>
      </header>

      {locked ? (
        <UnlockView onUnlock={unlock} busy={busy} error={error} />
      ) : (
        <>
          <div className="controls">
            <input
              placeholder="Search by site or username"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="control-actions">
              <button onClick={() => setActiveEntry({} as VaultEntry)}>Add credential</button>
              <button className="secondary" onClick={copyToken}>
                Copy session token (for extension)
              </button>
              <button className="secondary" onClick={exportData}>
                Export vault
              </button>
              {copied && <span className="hint">{copied} copied. Clipboard clears soon.</span>}
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <section className="vault">
            {filtered.length === 0 && <p className="empty">No credentials match your search.</p>}
            {filtered.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onCopy={copy}
                onEdit={() => setActiveEntry(entry)}
                onDelete={() => deleteEntry(entry.id)}
              />
            ))}
          </section>
        </>
      )}

      {activeEntry !== null && !locked && (
        <EntryForm
          initial={activeEntry}
          onSave={saveEntry}
          onCancel={() => setActiveEntry(null)}
          token={token}
        />
      )}
    </div>
  );
}

export default App;
