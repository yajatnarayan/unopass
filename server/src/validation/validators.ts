export const LIMITS = {
  SITE_NAME_MAX: 200,
  DOMAIN_MAX: 253, // RFC 1035
  USERNAME_MAX: 320, // RFC 5321 for email
  PASSWORD_MAX: 1000,
  NOTES_MAX: 5000,
  MASTER_PASSWORD_MIN: 8,
  MASTER_PASSWORD_MAX: 1000,
};

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateMasterPassword(password: string): void {
  if (typeof password !== 'string') {
    throw new ValidationError('Master password must be a string');
  }
  if (password.length < LIMITS.MASTER_PASSWORD_MIN) {
    throw new ValidationError(
      `Master password must be at least ${LIMITS.MASTER_PASSWORD_MIN} characters`
    );
  }
  if (password.length > LIMITS.MASTER_PASSWORD_MAX) {
    throw new ValidationError(
      `Master password must not exceed ${LIMITS.MASTER_PASSWORD_MAX} characters`
    );
  }
}

export function validateVaultEntry(entry: {
  site?: string;
  domain?: string;
  username?: string;
  password?: string;
  notes?: string;
}): void {
  if (!entry.site || typeof entry.site !== 'string' || !entry.site.trim()) {
    throw new ValidationError('Site name is required');
  }
  if (entry.site.length > LIMITS.SITE_NAME_MAX) {
    throw new ValidationError(`Site name must not exceed ${LIMITS.SITE_NAME_MAX} characters`);
  }

  if (!entry.domain || typeof entry.domain !== 'string' || !entry.domain.trim()) {
    throw new ValidationError('Domain is required');
  }
  if (entry.domain.length > LIMITS.DOMAIN_MAX) {
    throw new ValidationError(`Domain must not exceed ${LIMITS.DOMAIN_MAX} characters`);
  }

  if (!entry.username || typeof entry.username !== 'string' || !entry.username.trim()) {
    throw new ValidationError('Username is required');
  }
  if (entry.username.length > LIMITS.USERNAME_MAX) {
    throw new ValidationError(`Username must not exceed ${LIMITS.USERNAME_MAX} characters`);
  }

  if (!entry.password || typeof entry.password !== 'string') {
    throw new ValidationError('Password is required');
  }
  if (entry.password.length > LIMITS.PASSWORD_MAX) {
    throw new ValidationError(`Password must not exceed ${LIMITS.PASSWORD_MAX} characters`);
  }

  if (entry.notes !== undefined) {
    if (typeof entry.notes !== 'string') {
      throw new ValidationError('Notes must be a string');
    }
    if (entry.notes.length > LIMITS.NOTES_MAX) {
      throw new ValidationError(`Notes must not exceed ${LIMITS.NOTES_MAX} characters`);
    }
  }
}

export function validateSearchQuery(query: string | undefined): void {
  if (query !== undefined) {
    if (typeof query !== 'string') {
      throw new ValidationError('Search query must be a string');
    }
    if (query.length > 200) {
      throw new ValidationError('Search query too long');
    }
  }
}

export function validateDomain(domain: string): void {
  if (!domain || typeof domain !== 'string' || !domain.trim()) {
    throw new ValidationError('Domain is required');
  }
  if (domain.length > LIMITS.DOMAIN_MAX) {
    throw new ValidationError(`Domain must not exceed ${LIMITS.DOMAIN_MAX} characters`);
  }
}
