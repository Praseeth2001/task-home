import { useRef, useCallback, useMemo, memo } from "react";
import { useVirtualizer }   from "@tanstack/react-virtual";
import type { SpotifyRecord }    from "../../types";
import type { TableStateActions } from "../../hooks";
import type { TableState }        from "../../types";
import { ColumnHeader }           from "./ColumnHeader";
import { Spinner }                from "../ui/Spinner";
import { EmptyState }             from "../ui/EmptyState";
import { ErrorState }             from "../ui/ErrorState";
import styles                     from "./DataTable.module.css";

// ─── Column definition ────────────────────────────────────────────────────────

export interface ColumnDef {
  id:       string;
  field:    keyof SpotifyRecord;
  label:    string;
  width?:   number;
  sortable?: boolean;
  render?:  (value: SpotifyRecord[keyof SpotifyRecord], row: SpotifyRecord) => React.ReactNode;
}

// ─── Default columns (the visible set before user customisation) ───────────────

export const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: "track_name",                field: "track_name",                label: "Track",       width: 220, sortable: true },
  { id: "track_artist",              field: "track_artist",              label: "Artist",      width: 160, sortable: true },
  { id: "track_album_name",          field: "track_album_name",          label: "Album",       width: 180, sortable: true },
  { id: "playlist_genre",            field: "playlist_genre",            label: "Genre",       width: 100, sortable: true },
  { id: "playlist_subgenre",         field: "playlist_subgenre",         label: "Subgenre",    width: 130, sortable: true },
  { id: "track_popularity",          field: "track_popularity",          label: "Popularity",  width: 100, sortable: true,
    render: (v) => <PopularityBar value={v as number} /> },
  { id: "tempo",                     field: "tempo",                     label: "Tempo",       width: 80,  sortable: true,
    render: (v) => `${(v as number).toFixed(0)} bpm` },
  { id: "energy",                    field: "energy",                    label: "Energy",      width: 80,  sortable: true,
    render: (v) => ((v as number) * 100).toFixed(0) + "%" },
  { id: "danceability",              field: "danceability",              label: "Dance",       width: 80,  sortable: true,
    render: (v) => ((v as number) * 100).toFixed(0) + "%" },
  { id: "track_explicit",            field: "track_explicit",            label: "Explicit",    width: 70,  sortable: false,
    render: (v) => v ? <span className={styles.badge}>E</span> : null },
  { id: "track_album_release_date",  field: "track_album_release_date",  label: "Released",    width: 100, sortable: true },
  { id: "duration_ms",               field: "duration_ms",               label: "Duration",    width: 90,  sortable: true,
    render: (v) => formatDuration(v as number) },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const PopularityBar = memo(function PopularityBar({ value }: { value: number }) {
  return (
    <div className={styles.popBar}>
      <div className={styles.popFill} style={{ width: `${value}%` }} />
      <span className={styles.popLabel}>{value}</span>
    </div>
  );
});

function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins      = Math.floor(totalSecs / 60);
  const secs      = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ─── Row component (memoised to prevent re-renders on unrelated state changes) ──

interface TableRowProps {
  row:             SpotifyRecord;
  columns:         ColumnDef[];
  isSelected:      boolean;
  onToggleSelect:  (id: string) => void;
  style:           React.CSSProperties;  // from virtualizer
}

const TableRow = memo(function TableRow({
  row,
  columns,
  isSelected,
  onToggleSelect,
  style,
}: TableRowProps) {
  return (
    <tr
      className={`${styles.tr} ${isSelected ? styles.selected : ""}`}
      style={style}
      aria-selected={isSelected}
    >
      {/* Checkbox cell */}
      <td className={styles.checkCell}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={isSelected}
          onChange={() => onToggleSelect(row.id)}
          aria-label={`Select ${row.track_name}`}
        />
      </td>

      {/* Data cells */}
      {columns.map((col) => {
        const value = row[col.field];
        return (
          <td
            key={col.id}
            className={styles.td}
            style={col.width ? { width: col.width, minWidth: col.width } : undefined}
          >
            {col.render ? col.render(value, row) : String(value ?? "")}
          </td>
        );
      })}
    </tr>
  );
});

// ─── Main DataTable ───────────────────────────────────────────────────────────

interface DataTableProps {
  records:      SpotifyRecord[];
  totalCount:   number;
  columns:      ColumnDef[];
  state:        TableState;
  actions:      TableStateActions;
  isLoading:    boolean;
  isError:      boolean;
  errorMessage: string;
  onRetry:      () => void;
}

const ROW_HEIGHT = 44; // px — must match CSS

export function DataTable({
  records,
  totalCount,
  columns,
  state,
  actions,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: DataTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Virtualizer ───────────────────────────────────────────────────────────
  const virtualizer = useVirtualizer({
    count:          records.length,
    getScrollElement: () => scrollRef.current,
    estimateSize:   () => ROW_HEIGHT,
    overscan:       10, // renders 10 rows above/below viewport — reduces blank flash on fast scroll
  });

  const virtualItems  = virtualizer.getVirtualItems();
  const totalHeight   = virtualizer.getTotalSize();

  // ── Selection helpers ─────────────────────────────────────────────────────
  const pageIds      = useMemo(() => records.map((r) => r.id), [records]);
  const allPageSelected = pageIds.length > 0 &&
    pageIds.every((id) => state.selection.selectedIds.has(id));
  const someSelected = pageIds.some((id) => state.selection.selectedIds.has(id));

  const handleSelectAll = useCallback(() => {
    actions.selectPage(pageIds);
  }, [actions, pageIds]);

  // ── States ────────────────────────────────────────────────────────────────
  if (isError) {
    return <ErrorState message={errorMessage} onRetry={onRetry} />;
  }

  const showEmpty = !isLoading && records.length === 0;

  return (
    <div className={styles.wrapper}>
      {/* Scrollable viewport — virtualizer attaches here */}
      <div ref={scrollRef} className={styles.scroll}>

        {/* Loading overlay — shown on top of stale rows during refetch */}
        {isLoading && (
          <div className={styles.loadingOverlay} aria-live="polite" aria-label="Loading rows">
            <Spinner size="lg" />
          </div>
        )}

        <table className={styles.table} role="grid" aria-rowcount={totalCount}>
          <thead>
            <tr className={styles.headerRow}>
              {/* Select-all checkbox */}
              <th className={`${styles.th} ${styles.checkCell}`}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={allPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allPageSelected;
                  }}
                  onChange={handleSelectAll}
                  aria-label="Select all rows on this page"
                />
              </th>

              {columns.map((col) => (
                <ColumnHeader
                  key={col.id}
                  label={col.label}
                  field={col.field}
                  sort={state.sort}
                  onSort={actions.setSort}
                  width={col.width}
                  sortable={col.sortable}
                />
              ))}
            </tr>
          </thead>

          <tbody
            style={{ height: totalHeight, position: "relative" }}
          >
            {/* Spacer fills virtual scroll height so the scrollbar is correct */}
            {virtualItems.map((vItem) => {
              const row = records[vItem.index];
              if (!row) return null;
              return (
                <TableRow
                  key={row.id}
                  row={row}
                  columns={columns}
                  isSelected={state.selection.selectedIds.has(row.id)}
                  onToggleSelect={actions.toggleRow}
                  style={{
                    position:  "absolute",
                    top:       vItem.start,
                    left:      0,
                    width:     "100%",
                    height:    ROW_HEIGHT,
                  }}
                />
              );
            })}
          </tbody>
        </table>

        {showEmpty && (
          <EmptyState
            action={
              <button className={styles.clearBtn} onClick={actions.clearFilters}>
                Clear all filters
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
