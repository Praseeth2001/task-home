import type { FilterState } from "../types";

/**
 * Returns the number of active filter dimensions.
 * Used to show "3 active" badge on the Clear All button.
 */
export function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.search.trim()) count++;
  count += Object.values(filters.textFilters).filter((v) => v?.trim()).length;
  count += Object.values(filters.multiSelect).filter((v) => (v as string[])?.length > 0).length;
  count += Object.values(filters.numericRange).filter(
    (v) => v?.min !== undefined || v?.max !== undefined
  ).length;
  return count;
}
