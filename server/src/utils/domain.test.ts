import { describe, expect, it } from 'vitest';
import { normalizeDomain, domainMatches } from './domain';

describe('domain utils', () => {
  describe('normalizeDomain', () => {
    it('normalizes domain with protocol', () => {
      expect(normalizeDomain('https://example.com')).toBe('example.com');
    });

    it('normalizes domain without protocol', () => {
      expect(normalizeDomain('example.com')).toBe('example.com');
    });

    it('removes www prefix', () => {
      expect(normalizeDomain('www.example.com')).toBe('example.com');
    });

    it('lowercases domain', () => {
      expect(normalizeDomain('EXAMPLE.COM')).toBe('example.com');
    });

    it('handles domain with path', () => {
      expect(normalizeDomain('https://example.com/path')).toBe('example.com');
    });

    it('handles invalid domain gracefully', () => {
      expect(normalizeDomain('not a valid url')).toBe('not a valid url');
    });
  });

  describe('domainMatches', () => {
    it('matches exact domain', () => {
      expect(domainMatches('example.com', 'example.com')).toBe(true);
    });

    it('matches subdomain', () => {
      expect(domainMatches('example.com', 'sub.example.com')).toBe(true);
    });

    it('does not match different domain', () => {
      expect(domainMatches('example.com', 'different.com')).toBe(false);
    });

    it('does not match parent domain', () => {
      expect(domainMatches('sub.example.com', 'example.com')).toBe(false);
    });

    it('handles www prefix correctly', () => {
      expect(domainMatches('www.example.com', 'example.com')).toBe(true);
    });

    it('is case insensitive', () => {
      expect(domainMatches('EXAMPLE.COM', 'example.com')).toBe(true);
    });
  });
});
