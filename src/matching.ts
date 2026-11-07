/** Conservative candidate matching; never an instruction to merge works. */
const normalize = (value: string): string => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

export function matchesTitle(local: unknown, incoming: string): boolean {
  const title = normalize(incoming);
  return !!title && typeof local === 'string' && normalize(local) === title;
}

export function hasNoAuthors(authors: unknown): boolean {
  return authors == null || (typeof authors === 'string' && !authors.trim()) ||
    (Array.isArray(authors) && authors.length === 0);
}

function authorNames(value: unknown): string[] {
  const values = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(values) || !values.length || values.some(v => typeof v !== 'string' || !normalize(v))) return [];
  return [...new Set(values.map(v => normalize(v)))].sort();
}

export function matchesWork(
  local: Record<string, unknown>, incoming: { title: string; authors: string[] },
): boolean {
  if (!matchesTitle(local.title, incoming.title)) return false;
  const left = authorNames(local.authors);
  const right = authorNames(incoming.authors);
  return left.length > 0 && left.length === right.length && left.every((name, index) => name === right[index]);
}
