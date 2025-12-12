import crypto from 'crypto';
import { CipherPayload, KdfParams, VaultData, VaultFile } from '../types';

// OWASP recommends N >= 2^16 (65,536) for strong security
// Using N=2^16, r=8, p=1 requires ~67MB memory (scrypt formula: 128 * N * r * p)
// Maxmem set to 128MB to provide headroom
const DEFAULT_KDF: Omit<KdfParams, 'salt'> = {
  N: 2 ** 16, // 65,536 - OWASP acceptable, fits memory limits
  r: 8,
  p: 1,
  keyLength: 32,
};

export function generateKdfParams(): KdfParams {
  return {
    ...DEFAULT_KDF,
    salt: crypto.randomBytes(16).toString('base64'),
  };
}

export function deriveKey(masterPassword: string, params: KdfParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // scrypt formula: 128 * N * r * p bytes
    // For N=65536, r=8, p=1: ~67MB minimum
    const maxmem = 128 * 1024 * 1024; // 128MB provides safe headroom
    crypto.scrypt(
      masterPassword,
      Buffer.from(params.salt, 'base64'),
      params.keyLength,
      { N: params.N, r: params.r, p: params.p, maxmem },
      (err, key) => {
        if (err || !key) {
          return reject(err);
        }
        resolve(key as Buffer);
      }
    );
  });
}

function encryptPayload(data: string, key: Buffer): CipherPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    data: encrypted.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

function decryptPayload(payload: CipherPayload, key: Buffer): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(payload.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function computeHMAC(vaultFile: Omit<VaultFile, 'hmac'>, key: Buffer): string {
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(JSON.stringify({
    version: vaultFile.version,
    kdf: vaultFile.kdf,
    cipher: vaultFile.cipher,
  }));
  return hmac.digest('base64');
}

export function encryptVaultWithKey(data: VaultData, key: Buffer, kdf: KdfParams): VaultFile {
  const payload = encryptPayload(JSON.stringify(data), key);
  const vaultWithoutHmac = {
    version: 2,
    kdf,
    cipher: payload,
  };
  const hmac = computeHMAC(vaultWithoutHmac, key);
  return {
    ...vaultWithoutHmac,
    hmac,
  };
}

export async function encryptVault(data: VaultData, masterPassword: string): Promise<{
  vault: VaultFile;
  key: Buffer;
}> {
  const kdf = generateKdfParams();
  const key = await deriveKey(masterPassword, kdf);
  const vault = encryptVaultWithKey(data, key, kdf);
  return { vault, key };
}

export function decryptVaultWithKey(vault: VaultFile, key: Buffer): VaultData {
  // Version 2+ vaults MUST have HMAC for integrity verification
  if (vault.version >= 2) {
    if (!vault.hmac) {
      throw new Error('Vault integrity check failed - HMAC missing for version 2+ vault');
    }

    const expectedHmac = computeHMAC({
      version: vault.version,
      kdf: vault.kdf,
      cipher: vault.cipher,
    }, key);

    if (vault.hmac !== expectedHmac) {
      throw new Error('Vault integrity check failed - file may have been tampered with');
    }
  }
  // Version 1 vaults don't have HMAC (backward compatible)

  const plaintext = decryptPayload(vault.cipher, key);
  return JSON.parse(plaintext) as VaultData;
}

export async function decryptVault(
  vault: VaultFile,
  masterPassword: string
): Promise<{ vault: VaultData; key: Buffer; kdf: KdfParams }> {
  const key = await deriveKey(masterPassword, vault.kdf);
  const data = decryptVaultWithKey(vault, key);
  return { vault: data, key, kdf: vault.kdf };
}
