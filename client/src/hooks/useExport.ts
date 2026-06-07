import { useState, useCallback, useRef } from "react";
import type { SortState, FilterState, SpotifyRecord } from "../types";
import { fetchAllMatchingRecords } from "../api/records";
import { recordsToCsv, downloadCsv } from "../utils/csvExport";

export type ExportStatus = "idle" | "fetching" | "done" | "error";

/**
 * Handles CSV export of the current filtered/sorted view.
 *
 * Flow:
 *   1. Re-fetch ALL matching rows (no pagination) via the API
 *   2. Build CSV string from visible columns only
 *   3. Trigger browser download
 *
 * Uses an AbortController so navigating away or changing filters
 * while exporting cancels the in-flight request.
 */
export function useExport() {
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const exportCsv = useCallback(
    async (
      sort: SortState,
      filters: FilterState,
      visibleColumns: (keyof SpotifyRecord)[],
      filenamePrefix = "spotify-export",
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("fetching");
      setError(null);

      try {
        const records = await fetchAllMatchingRecords(
          sort,
          filters,
          controller.signal,
        );

        const csv = recordsToCsv(records, visibleColumns);
        const date = new Date().toISOString().slice(0, 10);
        const filename = `${filenamePrefix}-${date}.csv`;

        downloadCsv(csv, filename);
        setStatus("done");

        // Reset to idle after a short confirmation window
        setTimeout(() => setStatus("idle"), 2000);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setStatus("idle");
          return;
        }
        setError((err as Error).message);
        setStatus("error");
      }
    },
    [],
  );

  const cancelExport = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setError(null);
  }, []);

  return { status, error, exportCsv, cancelExport };
}
