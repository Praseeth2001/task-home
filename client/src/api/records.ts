import type {
  SpotifyRecord,
  SortState,
  PaginationState,
  FilterState,
  PaginatedResponse,
} from "../types";
import { buildQueryParams } from "../utils/queryBuilder";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
const RESOURCE = `${BASE_URL}/records`;

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/** Fetch paginated + filtered + sorted list */
export async function fetchRecords(
  pagination: PaginationState,
  sort:       SortState,
  filters:    FilterState,
  signal?:    AbortSignal
): Promise<PaginatedResponse<SpotifyRecord>> {
  const params = buildQueryParams(pagination, sort, filters);
  const res    = await fetch(`${RESOURCE}?${params.toString()}`, { signal });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const totalCount = Number(res.headers.get("X-Total-Count") ?? 0);
  const data       = await res.json() as SpotifyRecord[];
  return { data, totalCount };
}

/** Fetch a single record */
export async function fetchRecord(id: string): Promise<SpotifyRecord> {
  const res = await fetch(`${RESOURCE}/${id}`);
  return handleResponse<SpotifyRecord>(res);
}

/** Inline edit — PATCH partial update with optimistic UI support */
export async function patchRecord(
  id:      string,
  payload: Partial<SpotifyRecord>
): Promise<SpotifyRecord> {
  const res = await fetch(`${RESOURCE}/${id}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  return handleResponse<SpotifyRecord>(res);
}

/**
 * Fetch ALL matching rows for CSV export.
 * Two-step: preflight for total count, then single large fetch.
 * Never called during normal table interaction.
 */
export async function fetchAllMatchingRecords(
  sort:    SortState,
  filters: FilterState,
  signal?: AbortSignal
): Promise<SpotifyRecord[]> {
  const countParams = buildQueryParams({ page: 1, limit: 1 }, sort, filters);
  const countRes    = await fetch(`${RESOURCE}?${countParams}`, { signal });
  if (!countRes.ok) throw new Error(`Export preflight failed: ${countRes.status}`);

  const total = Number(countRes.headers.get("X-Total-Count") ?? 0);
  if (total === 0) return [];

  const allParams = buildQueryParams({ page: 1, limit: total }, sort, filters);
  const allRes    = await fetch(`${RESOURCE}?${allParams}`, { signal });
  if (!allRes.ok) throw new Error(`Export fetch failed: ${allRes.status}`);
  return allRes.json() as Promise<SpotifyRecord[]>;
}
