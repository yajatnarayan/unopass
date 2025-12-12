import { describe, expect, it } from 'vitest';
import { encryptVault, decryptVault, decryptVaultWithKey } from './vaultCrypto';

describe('vaultCrypto', () => {
  const sampleData = {
    entries: [
      {
        id: '1',
        site: 'Example',
        domain: 'example.com',
        username: 'alice',
        password: 'secret',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  it('encrypts and decrypts a vault with the same password', async () => {
    const { vault } = await encryptVault(sampleData, 'master');
    const { vault: decrypted } = await decryptVault(vault, 'master');
    expect(decrypted).toEqual(sampleData);
    expect(vault.cipher.data.includes('secret')).toBe(false);
    expect(vault.version).toBe(2);
    expect(vault.hmac).toBeDefined();
  });

  it('rejects decryption with the wrong password', async () => {
    const { vault } = await encryptVault(sampleData, 'master');
    await expect(decryptVault(vault, 'wrong')).rejects.toBeTruthy();
  });

  it('rejects version 2 vault with missing HMAC', async () => {
    const { vault, key } = await encryptVault(sampleData, 'master');
    const tamperedVault = { ...vault, hmac: undefined };
    expect(() => decryptVaultWithKey(tamperedVault, key)).toThrow('HMAC missing');
  });

  it('rejects version 2 vault with modified cipher', async () => {
    const { vault, key } = await encryptVault(sampleData, 'master');
    const tamperedVault = {
      ...vault,
      cipher: { ...vault.cipher, data: vault.cipher.data + 'X' }
    };
    expect(() => decryptVaultWithKey(tamperedVault, key)).toThrow('tampered');
  });

  it('accepts version 1 vault without HMAC for backward compatibility', async () => {
    const { vault, key } = await encryptVault(sampleData, 'master');
    const v1Vault = { ...vault, version: 1, hmac: undefined };
    const decrypted = decryptVaultWithKey(v1Vault, key);
    expect(decrypted).toEqual(sampleData);
  });
});
