export function normalizeDomain(input: string): string {
  try {
    const formatted = input.includes('://') ? input : `https://${input}`;
    const url = new URL(formatted);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return input.trim().toLowerCase();
  }
}

export function domainMatches(entryDomain: string, targetDomain: string): boolean {
  const cleanEntry = normalizeDomain(entryDomain);
  const cleanTarget = normalizeDomain(targetDomain);
  return cleanTarget === cleanEntry || cleanTarget.endsWith(`.${cleanEntry}`);
}
