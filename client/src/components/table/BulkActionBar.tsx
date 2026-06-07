import { memo } from "react";
import type { BulkSelectionState } from "../../types";
import type { TableStateActions as Actions } from "../../hooks";
import styles from "./BulkActionBar.module.css";

interface BulkActionBarProps {
  selection: BulkSelectionState;
  totalCount: number;
  pageCount: number;
  actions: Actions;
  onExport: () => void;
  onSelectAll: () => void;
  isExporting: boolean;
}

/**
 * Appears above the table when ≥1 row is selected.
 * Shows:
 *   - how many are selected (and whether it's page-scope or all-scope)
 *   - "Select all N matching" offer when only page is selected
 *   - Export selected button
 *   - Clear selection
 */
export const BulkActionBar = memo(function BulkActionBar({
  selection,
  totalCount,
  pageCount,
  actions,
  onExport,
  onSelectAll,
  isExporting,
}: BulkActionBarProps) {
  const { selectedIds, scope } = selection;
  const selectedCount = scope === "all" ? totalCount : selectedIds.size;
  const isAllScope = scope === "all";

  if (selectedCount === 0) return null;

  return (
    <div className={styles.bar} role="status" aria-live="polite">
      <div className={styles.left}>
        <span className={styles.count}>
          <span className={styles.countNum}>
            {selectedCount.toLocaleString()}
          </span>{" "}
          {selectedCount === 1 ? "row" : "rows"} selected
          {isAllScope && (
            <span className={styles.scopeTag}> · all matching</span>
          )}
        </span>

        {/* Offer to select ALL matching rows when user only has page selected */}
        {!isAllScope && totalCount > pageCount && (
          <button
            className={styles.selectAllBtn}
            type="button"
            onClick={onSelectAll}
          >
            Select all {totalCount.toLocaleString()} matching rows
          </button>
        )}
      </div>

      <div className={styles.right}>
        {/* Export action */}
        <button
          className={styles.actionBtn}
          type="button"
          onClick={onExport}
          disabled={isExporting}
          aria-label="Export selected rows to CSV"
        >
          {isExporting ? (
            <>
              <span className={styles.spinner} aria-hidden /> Exporting…
            </>
          ) : (
            <>↓ Export CSV</>
          )}
        </button>

        {/* Clear */}
        <button
          className={styles.clearBtn}
          type="button"
          onClick={actions.clearSelection}
          aria-label="Clear selection"
        >
          ✕ Clear
        </button>
      </div>
    </div>
  );
});
