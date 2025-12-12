import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unopass-'));
  process.env.VAULT_PATH = path.join(tmpDir, 'vault.enc.json');
  vi.resetModules();
});

afterEach(async () => {
  delete process.env.VAULT_PATH;
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('VaultService', () => {
  it('creates a vault, saves entries, and auto locks after inactivity', async () => {
    const { VaultService } = await import('./src/vaultService');
    const service = new VaultService(20);

    const { token } = await service.unlock('master', true);
    expect(service.status().locked).toBe(false);

    await service.addEntry(token, {
      site: 'Example',
      domain: 'example.com',
      username: 'alice',
      password: 'secret',
      notes: '',
    });

    expect((await service.getEntries(token)).length).toBe(1);

    // Wait for auto-lock timer
    await new Promise((resolve) => setTimeout(resolve, 50));

    await expect(service.getEntries(token)).rejects.toThrow('LOCKED');
    expect(service.status().locked).toBe(true);
  });

  it('rejects unlocking with the wrong password', async () => {
    const { VaultService } = await import('./src/vaultService');
    const service = new VaultService(1000);

    await service.unlock('correct-horse', true);
    service.lock();

    await expect(service.unlock('wrong-pass', false)).rejects.toBeTruthy();
  });
});
