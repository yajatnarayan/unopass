import { describe, expect, it } from 'vitest';
import {
  validateMasterPassword,
  validateVaultEntry,
  validateSearchQuery,
  validateDomain,
  ValidationError,
  LIMITS,
} from './validators';

describe('validators', () => {
  describe('validateMasterPassword', () => {
    it('accepts valid password', () => {
      expect(() => validateMasterPassword('MySecurePassword123')).not.toThrow();
    });

    it('rejects password shorter than minimum', () => {
      expect(() => validateMasterPassword('short')).toThrow(ValidationError);
    });

    it('rejects password longer than maximum', () => {
      const longPassword = 'a'.repeat(LIMITS.MASTER_PASSWORD_MAX + 1);
      expect(() => validateMasterPassword(longPassword)).toThrow(ValidationError);
    });

    it('rejects non-string values', () => {
      expect(() => validateMasterPassword(123 as any)).toThrow(ValidationError);
    });
  });

  describe('validateVaultEntry', () => {
    const validEntry = {
      site: 'Example',
      domain: 'example.com',
      username: 'user@example.com',
      password: 'password123',
      notes: 'Some notes',
    };

    it('accepts valid entry', () => {
      expect(() => validateVaultEntry(validEntry)).not.toThrow();
    });

    it('rejects missing site', () => {
      expect(() => validateVaultEntry({ ...validEntry, site: '' })).toThrow(ValidationError);
    });

    it('rejects missing domain', () => {
      expect(() => validateVaultEntry({ ...validEntry, domain: '' })).toThrow(ValidationError);
    });

    it('rejects missing username', () => {
      expect(() => validateVaultEntry({ ...validEntry, username: '' })).toThrow(ValidationError);
    });

    it('rejects missing password', () => {
      expect(() => validateVaultEntry({ ...validEntry, password: '' })).toThrow(ValidationError);
    });

    it('rejects site name exceeding limit', () => {
      const longSite = 'a'.repeat(LIMITS.SITE_NAME_MAX + 1);
      expect(() => validateVaultEntry({ ...validEntry, site: longSite })).toThrow(ValidationError);
    });

    it('rejects notes exceeding limit', () => {
      const longNotes = 'a'.repeat(LIMITS.NOTES_MAX + 1);
      expect(() => validateVaultEntry({ ...validEntry, notes: longNotes })).toThrow(ValidationError);
    });

    it('accepts entry without notes', () => {
      const { notes, ...entryWithoutNotes } = validEntry;
      expect(() => validateVaultEntry(entryWithoutNotes)).not.toThrow();
    });
  });

  describe('validateSearchQuery', () => {
    it('accepts valid query', () => {
      expect(() => validateSearchQuery('search term')).not.toThrow();
    });

    it('accepts undefined query', () => {
      expect(() => validateSearchQuery(undefined)).not.toThrow();
    });

    it('rejects very long query', () => {
      const longQuery = 'a'.repeat(201);
      expect(() => validateSearchQuery(longQuery)).toThrow(ValidationError);
    });

    it('rejects non-string query', () => {
      expect(() => validateSearchQuery(123 as any)).toThrow(ValidationError);
    });
  });

  describe('validateDomain', () => {
    it('accepts valid domain', () => {
      expect(() => validateDomain('example.com')).not.toThrow();
    });

    it('rejects empty domain', () => {
      expect(() => validateDomain('')).toThrow(ValidationError);
    });

    it('rejects domain exceeding limit', () => {
      const longDomain = 'a'.repeat(LIMITS.DOMAIN_MAX + 1);
      expect(() => validateDomain(longDomain)).toThrow(ValidationError);
    });
  });
});
