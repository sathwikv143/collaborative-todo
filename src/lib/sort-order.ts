export function nextSortOrder<T extends { sortOrder: number }>(rows: T[]): number {
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
}
