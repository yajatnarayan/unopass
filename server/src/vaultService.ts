import { v4 as uuidv4 } from 'uuid';
import { decryptVault, encryptVault, encryptVaultWithKey } from './crypto/vaultCrypto';
import { readVaultFile, vaultExists, writeVaultFile } from './storage/vaultStorage';
import { VaultData, VaultEntry, SessionData } from './types';
import { domainMatches, normalizeDomain } from './utils/domain';

export class VaultService {
  private lockTimeoutMs: number;
  private session?: SessionData;
  private lockTimer?: NodeJS.Timeout;

  constructor(lockTimeoutMs = Number(process.env.LOCK_TIMEOUT_MS || 10 * 60 * 1000)) {
    this.lockTimeoutMs = lockTimeoutMs;
  }

  status() {
    return {
      locked: !this.session,
      entryCount: this.session?.vault.entries.length ?? 0,
      lastActivity: this.session?.lastActivity ?? null,
    };
  }

  private clearLockTimer() {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = undefined;
    }
  }

  private scheduleLock() {
    this.clearLockTimer();
    if (this.lockTimeoutMs <= 0) return;
    this.lockTimer = setTimeout(() => this.lock(), this.lockTimeoutMs);
  }

  private touch() {
    if (!this.session) return;
    this.session.lastActivity = Date.now();
    this.scheduleLock();
  }

  private requireSession(token: string): SessionData {
    if (!this.session) {
      throw new Error('LOCKED');
    }
    if (this.session.token !== token) {
      throw new Error('INVALID_SESSION');
    }
    this.touch();
    return this.session;
  }

  touchSession(token: string): void {
    this.requireSession(token); // Validates and touches
  }

  async unlock(masterPassword: string, createIfMissing = false) {
    const exists = await vaultExists();

    if (!exists) {
      if (!createIfMissing) {
        throw new Error('NO_VAULT');
      }
      const emptyVault: VaultData = { entries: [] };
      const { vault, key } = await encryptVault(emptyVault, masterPassword);
      await writeVaultFile(vault);
      this.session = {
        token: uuidv4(),
        key,
        kdf: vault.kdf,
        vault: emptyVault,
        lastActivity: Date.now(),
      };
      this.scheduleLock();
      return { created: true, token: this.session.token, entries: 0 };
    }

    const vaultFile = await readVaultFile();
    const { vault, key, kdf } = await decryptVault(vaultFile, masterPassword);
    this.session = {
      token: uuidv4(),
      key,
      kdf,
      vault,
      lastActivity: Date.now(),
    };
    this.scheduleLock();
    return { created: false, token: this.session.token, entries: vault.entries.length };
  }

  lock() {
    this.clearLockTimer();
    this.session = undefined;
  }

  private async persist(session: SessionData) {
    const vaultFile = encryptVaultWithKey(session.vault, session.key, session.kdf);
    await writeVaultFile(vaultFile);
  }

  async getEntries(token: string, query?: string): Promise<VaultEntry[]> {
    const session = this.requireSession(token);
    const normalizedQuery = query?.trim().toLowerCase();

    const entries = session.vault.entries
      .filter((entry) => {
        if (!normalizedQuery) return true;
        return (
          entry.site.toLowerCase().includes(normalizedQuery) ||
          entry.username.toLowerCase().includes(normalizedQuery) ||
          entry.domain.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((a, b) => a.site.localeCompare(b.site));

    return entries;
  }

  async getEntriesForDomain(token: string, domain: string) {
    const session = this.requireSession(token);
    const target = normalizeDomain(domain);
    return session.vault.entries.filter((entry) => domainMatches(entry.domain, target));
  }

  async addEntry(
    token: string,
    payload: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<VaultEntry> {
    const session = this.requireSession(token);
    const now = new Date().toISOString();
    const entry: VaultEntry = {
      ...payload,
      domain: normalizeDomain(payload.domain),
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    session.vault.entries.push(entry);
    await this.persist(session);
    return entry;
  }

  async updateEntry(
    token: string,
    id: string,
    payload: Partial<Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>>
  ) {
    const session = this.requireSession(token);
    const idx = session.vault.entries.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('NOT_FOUND');
    const existing = session.vault.entries[idx];
    const updated: VaultEntry = {
      ...existing,
      ...payload,
      domain: payload.domain ? normalizeDomain(payload.domain) : existing.domain,
      updatedAt: new Date().toISOString(),
    };
    session.vault.entries[idx] = updated;
    await this.persist(session);
    return updated;
  }

  async deleteEntry(token: string, id: string) {
    const session = this.requireSession(token);
    const before = session.vault.entries.length;
    session.vault.entries = session.vault.entries.filter((e) => e.id !== id);
    if (session.vault.entries.length === before) {
      throw new Error('NOT_FOUND');
    }
    await this.persist(session);
  }
}
