/** Merge Supabase rows with local demo records, skipping duplicates by id or title/description. */

export function mergeByIdAndKey<T extends { id: string }>(
  fromDb: T[],
  demo: T[],
  keyOf: (row: T) => string,
): T[] {
  const ids = new Set(fromDb.map((r) => r.id));
  const keys = new Set(fromDb.map(keyOf));
  const extras = demo.filter((d) => !ids.has(d.id) && !keys.has(keyOf(d)));
  return extras.length ? [...fromDb, ...extras] : fromDb;
}

export function mergeAlerts<T extends { id: string; title: string }>(fromDb: T[], demo: T[]): T[] {
  return mergeByIdAndKey(fromDb, demo, (r) => r.title.trim().toLowerCase());
}

export function mergeTasks<T extends { id: string; title: string }>(fromDb: T[], demo: T[]): T[] {
  return mergeByIdAndKey(fromDb, demo, (r) => r.title.trim().toLowerCase());
}

export function mergeNeeds<T extends { id: string; description: string; municipality: string }>(
  fromDb: T[],
  demo: T[],
): T[] {
  return mergeByIdAndKey(fromDb, demo, (r) => `${r.municipality}|${r.description}`.toLowerCase());
}

export function mergeResources<
  T extends { id: string; description: string; organization_id: string },
>(fromDb: T[], demo: T[]): T[] {
  return mergeByIdAndKey(fromDb, demo, (r) => `${r.organization_id}|${r.description}`.toLowerCase());
}
