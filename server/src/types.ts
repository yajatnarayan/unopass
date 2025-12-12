export interface VaultEntry {
  id: string;
  site: string;
  domain: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultData {
  entries: VaultEntry[];
}

export interface KdfParams {
  salt: string;
  N: number;
  r: number;
  p: number;
  keyLength: number;
}

export interface CipherPayload {
  iv: string;
  data: string;
  authTag: string;
}

export interface VaultFile {
  version: number;
  kdf: KdfParams;
  cipher: CipherPayload;
  hmac?: string; // Added in version 2 for integrity verification
}

export interface SessionData {
  token: string;
  key: Buffer;
  kdf: KdfParams;
  vault: VaultData;
  lastActivity: number;
}
