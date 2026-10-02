// Pure search matching (no React, no network).
// Normalized: case-insensitive, trimmed, collapsed whitespace.
// Any non-empty query — including a single character — matches
// when the normalized haystack contains it.
export function normalizeQuery(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalizeQuery(query);
  if (!q) return true;
  return normalizeQuery(haystack).includes(q);
}
