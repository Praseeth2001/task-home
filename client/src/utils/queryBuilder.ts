import type { PaginationState, SortState, FilterState } from "../types";

/**
 * Builds json-server v0.17 query params from internal table state.
 *
 * Param reference:
 *   _page, _limit          → pagination
 *   _sort, _order          → sorting
 *   <field>_like=value     → case-insensitive contains
 *   <field>=value          → exact match
 *   <field>_gte / _lte     → numeric range
 *   q=value                → global full-text search
 */
export function buildQueryParams(
  pagination: PaginationState,
  sort: SortState,
  filters: FilterState,
): URLSearchParams {
  const p = new URLSearchParams();

  // Pagination
  p.set("_page", String(pagination.page));
  p.set("_limit", String(pagination.limit));

  // Sorting
  if (sort.column) {
    p.set("_sort", sort.column);
    p.set("_order", sort.order);
  }

  // Global search
  const q = filters.search.trim();
  if (q) p.set("q", q);

  // Text contains filters
  for (const [field, value] of Object.entries(filters.textFilters)) {
    if (value?.trim()) p.set(`${field}_like`, value.trim());
  }

  // Multi-select (OR within field, AND across fields)
  for (const [field, values] of Object.entries(filters.multiSelect)) {
    if (Array.isArray(values) && values.length > 0) {
      values.forEach((v) => p.append(field, v));
    }
  }

  // Numeric range
  for (const [field, range] of Object.entries(filters.numericRange)) {
    if (range) {
      if (range.min !== undefined) p.set(`${field}_gte`, String(range.min));
      if (range.max !== undefined) p.set(`${field}_lte`, String(range.max));
    }
  }

  return p;
}
