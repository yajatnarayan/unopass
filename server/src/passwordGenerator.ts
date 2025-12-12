import crypto from 'crypto';

export interface PasswordOptions {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}

const DEFAULT_OPTIONS: Required<PasswordOptions> = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?',
};

export function generatePassword(opts: PasswordOptions = {}): string {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const enabledSets = (['uppercase', 'lowercase', 'numbers', 'symbols'] as const)
    .filter((key) => options[key])
    .map((key) => [key, CHARSETS[key]] as const);

  if (!enabledSets.length) {
    throw new Error('At least one character set must be enabled');
  }

  const length = Math.max(8, options.length);
  const allChars = enabledSets.map(([, chars]) => chars).join('');
  const passwordChars: string[] = [];

  // Ensure we pick at least one character from each enabled set.
  for (const [, chars] of enabledSets) {
    const randomIndex = crypto.randomInt(0, chars.length);
    passwordChars.push(chars.charAt(randomIndex));
  }

  while (passwordChars.length < length) {
    const randomIndex = crypto.randomInt(0, allChars.length);
    passwordChars.push(allChars.charAt(randomIndex));
  }

  // Shuffle the characters using Fisher-Yates with cryptographically secure randomness.
  for (let i = passwordChars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
}
