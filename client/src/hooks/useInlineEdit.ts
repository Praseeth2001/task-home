import { useCallback } from "react";
import { patchRecord } from "../api/records";
import type { SpotifyRecord } from "../types";
import type { TableStateActions } from "./index";

interface UseInlineEditParams {
  records:  SpotifyRecord[];
  setRecords: React.Dispatch<React.SetStateAction<SpotifyRecord[]>>;
  actions:  TableStateActions;
}

/**
 * Handles optimistic inline editing with rollback on API failure.
 *
 * Optimistic UI flow:
 *   1. User commits a change
 *   2. We immediately update the local records array (optimistic)
 *   3. Fire PATCH to json-server
 *   4a. Success → commit edit state (cell returns to view mode)
 *   4b. Failure → restore original value in records + show error in cell
 *
 * The hook is separate from the reducer because it needs access to both
 * local record state (for rollback) AND the reducer actions (for editing state).
 */
export function useInlineEdit({ records, setRecords, actions }: UseInlineEditParams) {

  const handleSave = useCallback(async (
    rowId:    string,
    field:    keyof SpotifyRecord,
    newValue: string | number
  ) => {
    // Snapshot the original value before optimistic update
    const original = records.find((r) => r.id === rowId);
    if (!original) return;

    const originalValue = original[field];

    // ── 1. Optimistic update ──────────────────────────────────────────────
    setRecords((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, [field]: newValue } : r
      )
    );

    try {
      // ── 2. Persist to API ─────────────────────────────────────────────
      await patchRecord(rowId, { [field]: newValue } as Partial<SpotifyRecord>);

      // ── 3. Commit: close the editing cell ─────────────────────────────
      actions.commitEdit();

    } catch (err) {
      // ── 4. Rollback: restore original value ───────────────────────────
      setRecords((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, [field]: originalValue } : r
        )
      );

      // Re-throw so EditableCell can show the error message
      throw err;
    }
  }, [records, setRecords, actions]);

  return { handleSave };
}
