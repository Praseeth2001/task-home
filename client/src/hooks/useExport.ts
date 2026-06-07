import { useState, useCallback, useRef } from "react";
import type { SortState, FilterState, SpotifyRecord, BulkSelectionState } from "../types";
import { fetchAllMatchingRecords } from "../api/records";
import { recordsToCsv, downloadCsv } from "../utils/csvExport";

export type ExportStatus = "idle" | "fetching" | "done" | "error";

export function useExport() {
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [error,  setError]  = useState<string | null>(null);
  const abortRef            = useRef<AbortController | null>(null);

  const run = useCallback(async (
    records:          SpotifyRecord[],
    visibleColumns:   (keyof SpotifyRecord)[],
    filenamePrefix =  "spotify-export"
  ) => {
    const csv      = recordsToCsv(records, visibleColumns);
    const date     = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `${filenamePrefix}-${date}.csv`);
    setStatus("done");
    setTimeout(() => setStatus("idle"), 2000);
  }, []);

  /**
   * Export ALL rows matching the current filters/sort.
   * Re-fetches from the API to get the complete set.
   */
  const exportAll = useCallback(async (
    sort:           SortState,
    filters:        FilterState,
    visibleColumns: (keyof SpotifyRecord)[],
  ) => {
    abortRef.current?.abort();
    const controller  = new AbortController();
    abortRef.current  = controller;

    setStatus("fetching");
    setError(null);

    try {
      const records = await fetchAllMatchingRecords(sort, filters, controller.signal);
      await run(records, visibleColumns, "spotify-export-all");
    } catch (err) {
      if ((err as Error).name === "AbortError") { setStatus("idle"); return; }
      setError((err as Error).message);
      setStatus("error");
    }
  }, [run]);

  /**
   * Export only the selected rows.
   * - scope "page"  → filter the already-loaded page records by selectedIds
   * - scope "all"   → re-fetch everything matching filters, no ID filter
   *   (json-server v0.17 has no id__in param, so "select all" = full export)
   */
  const exportSelected = useCallback(async (
    selection:      BulkSelectionState,
    pageRecords:    SpotifyRecord[],
    sort:           SortState,
    filters:        FilterState,
    visibleColumns: (keyof SpotifyRecord)[],
  ) => {
    abortRef.current?.abort();
    const controller  = new AbortController();
    abortRef.current  = controller;

    setStatus("fetching");
    setError(null);

    try {
      let records: SpotifyRecord[];

      if (selection.scope === "all") {
        // "Select all N matching" — export everything matching current filters
        records = await fetchAllMatchingRecords(sort, filters, controller.signal);
      } else {
        // Manual page selection — filter locally (IDs are from current page)
        records = pageRecords.filter((r) => selection.selectedIds.has(r.id));
      }

      await run(records, visibleColumns, "spotify-export-selected");
    } catch (err) {
      if ((err as Error).name === "AbortError") { setStatus("idle"); return; }
      setError((err as Error).message);
      setStatus("error");
    }
  }, [run]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setError(null);
  }, []);

  return { status, error, exportAll, exportSelected, cancel };
}
