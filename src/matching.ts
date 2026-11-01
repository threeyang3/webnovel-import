/** Conservative candidate matching; never an instruction to merge works. */
const normalize = (value: string): string => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

function authorNames(value: unknown): string[] {
  const values = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(values) || !values.length || values.some(v => typeof v !== 'string' || !normalize(v))) return [];
  return [...new Set(values.map(v => normalize(v)))].sort();
}

export function matchesWork(
  local: Record<string, unknown>, incoming: { title: string; authors: string[] },
): boolean {
  if (typeof local.title !== 'string' || !normalize(local.title) || normalize(local.title) !== normalize(incoming.title)) return false;
  const left = authorNames(local.authors);
  const right = authorNames(incoming.authors);
  return left.length > 0 && left.length === right.length && left.every((name, index) => name === right[index]);
}
