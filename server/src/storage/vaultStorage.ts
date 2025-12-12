import fs from 'fs/promises';
import path from 'path';
import { VaultFile } from '../types';

const DEFAULT_VAULT_PATH = path.join(process.cwd(), 'vault.enc.json');

export const VAULT_PATH = process.env.VAULT_PATH || DEFAULT_VAULT_PATH;

export async function vaultExists(): Promise<boolean> {
  try {
    await fs.access(VAULT_PATH);
    return true;
  } catch {
    return false;
  }
}

export async function readVaultFile(): Promise<VaultFile> {
  const raw = await fs.readFile(VAULT_PATH, 'utf8');
  return JSON.parse(raw) as VaultFile;
}

export async function writeVaultFile(vault: VaultFile): Promise<void> {
  // Ensure vault directory exists
  const vaultDir = path.dirname(VAULT_PATH);
  await fs.mkdir(vaultDir, { recursive: true });

  const tmpPath = `${VAULT_PATH}.tmp`;

  // Write temp file with restrictive permissions (owner read/write only)
  await fs.writeFile(tmpPath, JSON.stringify(vault), {
    encoding: 'utf8',
    mode: 0o600
  });

  // Atomic rename (also preserves permissions on most systems)
  await fs.rename(tmpPath, VAULT_PATH);

  // Explicitly set permissions on final file to be safe
  await fs.chmod(VAULT_PATH, 0o600);
}
