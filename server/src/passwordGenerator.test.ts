import { describe, expect, it } from 'vitest';
import { generatePassword } from './passwordGenerator';

describe('passwordGenerator', () => {
  it('generates password with default options', () => {
    const password = generatePassword();
    expect(password.length).toBeGreaterThanOrEqual(20);
  });

  it('generates password with specified length', () => {
    const password = generatePassword({ length: 16 });
    expect(password.length).toBe(16);
  });

  it('enforces minimum length of 8', () => {
    const password = generatePassword({ length: 4 });
    expect(password.length).toBe(8);
  });

  it('includes uppercase when enabled', () => {
    const password = generatePassword({ length: 20, uppercase: true, lowercase: false, numbers: false, symbols: false });
    expect(/[A-Z]/.test(password)).toBe(true);
    expect(/[a-z]/.test(password)).toBe(false);
  });

  it('includes lowercase when enabled', () => {
    const password = generatePassword({ length: 20, uppercase: false, lowercase: true, numbers: false, symbols: false });
    expect(/[a-z]/.test(password)).toBe(true);
    expect(/[A-Z]/.test(password)).toBe(false);
  });

  it('includes numbers when enabled', () => {
    const password = generatePassword({ length: 20, uppercase: false, lowercase: false, numbers: true, symbols: false });
    expect(/[0-9]/.test(password)).toBe(true);
  });

  it('includes symbols when enabled', () => {
    const password = generatePassword({ length: 20, uppercase: false, lowercase: false, numbers: false, symbols: true });
    expect(/[!@#$%^&*()\-_=+\[\]{};:,.<>?]/.test(password)).toBe(true);
  });

  it('throws error when no character sets are enabled', () => {
    expect(() => generatePassword({ uppercase: false, lowercase: false, numbers: false, symbols: false })).toThrow();
  });

  it('generates different passwords on successive calls', () => {
    const password1 = generatePassword();
    const password2 = generatePassword();
    expect(password1).not.toBe(password2);
  });

  it('includes at least one character from each enabled set', () => {
    const password = generatePassword({ length: 20, uppercase: true, lowercase: true, numbers: true, symbols: true });
    expect(/[A-Z]/.test(password)).toBe(true);
    expect(/[a-z]/.test(password)).toBe(true);
    expect(/[0-9]/.test(password)).toBe(true);
    expect(/[!@#$%^&*()\-_=+\[\]{};:,.<>?]/.test(password)).toBe(true);
  });
});
