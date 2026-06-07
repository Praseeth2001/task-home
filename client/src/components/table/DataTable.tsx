import { useRef, useCallback, useMemo, memo, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { SpotifyRecord } from "../../types";
import type { TableStateActions } from "../../hooks";
import type { TableState } from "../../types";
import { EditableCell, EDITABLE_FIELDS } from "./EditableCell";
import { Spinner } from "../ui/Spinner";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import styles from "./DataTable.module.css";

// ─── Column definition ────────────────────────────────────────────────────────

export interface ColumnDef {
  id: string;
  field: keyof SpotifyRecord;
  label: string;
  width: number;
  sortable?: boolean;
  render?: (
    value: SpotifyRecord[keyof SpotifyRecord],
    row: SpotifyRecord,
  ) => React.ReactNode;
}

// ─── Default columns ──────────────────────────────────────────────────────────

export const DEFAULT_COLUMNS: ColumnDef[] = [
  {
    id: "track_name",
    field: "track_name",
    label: "Track",
    width: 220,
    sortable: true,
  },
  {
    id: "track_artist",
    field: "track_artist",
    label: "Artist",
    width: 160,
    sortable: true,
  },
  {
    id: "track_album_name",
    field: "track_album_name",
    label: "Album",
    width: 180,
    sortable: true,
  },
  {
    id: "playlist_genre",
    field: "playlist_genre",
    label: "Genre",
    width: 100,
    sortable: true,
  },
  {
    id: "playlist_subgenre",
    field: "playlist_subgenre",
    label: "Subgenre",
    width: 140,
    sortable: true,
  },
  {
    id: "track_popularity",
    field: "track_popularity",
    label: "Popularity",
    width: 120,
    sortable: true,
    render: (v) => <PopularityBar value={v as number} />,
  },
  {
    id: "tempo",
    field: "tempo",
    label: "Tempo",
    width: 100,
    sortable: true,
    render: (v) => `${(v as number).toFixed(0)} bpm`,
  },
  {
    id: "energy",
    field: "energy",
    label: "Energy",
    width: 90,
    sortable: true,
    render: (v) => `${((v as number) * 100).toFixed(0)}%`,
  },
  {
    id: "danceability",
    field: "danceability",
    label: "Dance",
    width: 90,
    sortable: true,
    render: (v) => `${((v as number) * 100).toFixed(0)}%`,
  },
  {
    id: "track_explicit",
    field: "track_explicit",
    label: "Explicit",
    width: 80,
    sortable: false,
    render: (v) => (v ? <span className={styles.badge}>E</span> : null),
  },
  {
    id: "track_album_release_date",
    field: "track_album_release_date",
    label: "Released",
    width: 110,
    sortable: true,
  },
  {
    id: "duration_ms",
    field: "duration_ms",
    label: "Duration",
    width: 90,
    sortable: true,
    render: (v) => formatDuration(v as number),
  },
];

const CHECKBOX_WIDTH = 44;
const ROW_HEIGHT = 44;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PopularityBar = memo(function PopularityBar({
  value,
}: {
  value: number;
}) {
  return (
    <div className={styles.popBar}>
      <div
        className={styles.popFill}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
      <span className={styles.popLabel}>{value}</span>
    </div>
  );
});

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ─── Header row ───────────────────────────────────────────────────────────────

interface HeaderRowProps {
  columns: ColumnDef[];
  sort: TableState["sort"];
  onSort: (field: keyof SpotifyRecord) => void;
  allPageSelected: boolean;
  someSelected: boolean;
  onSelectPage: () => void;
}

const HeaderRow = memo(function HeaderRow({
  columns,
  sort,
  onSort,
  allPageSelected,
  someSelected,
  onSelectPage,
}: HeaderRowProps) {
  return (
    <div className={styles.headerRow} role="row">
      {/* Checkbox column */}
      <div
        className={`${styles.headerCell} ${styles.checkCell}`}
        style={{ width: CHECKBOX_WIDTH, minWidth: CHECKBOX_WIDTH }}
        role="columnheader"
      >
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={allPageSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected && !allPageSelected;
          }}
          onChange={onSelectPage}
          aria-label="Select all rows on this page"
        />
      </div>

      {columns.map((col) => (
        <div
          key={col.id}
          className={`${styles.headerCell} ${sort.column === col.field ? styles.headerCellActive : ""} ${col.sortable ? styles.headerCellSortable : ""}`}
          style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
          role="columnheader"
          aria-sort={
            sort.column === col.field
              ? sort.order === "asc"
                ? "ascending"
                : "descending"
              : col.sortable
                ? "none"
                : undefined
          }
          onClick={() => col.sortable && onSort(col.field)}
          onKeyDown={(e) => {
            if (col.sortable && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onSort(col.field);
            }
          }}
          tabIndex={col.sortable ? 0 : undefined}
        >
          <span className={styles.headerLabel}>{col.label}</span>
          {col.sortable && (
            <span className={styles.sortArrow} aria-hidden>
              {sort.column === col.field ? (
                sort.order === "asc" ? (
                  "↑"
                ) : (
                  "↓"
                )
              ) : (
                <span className={styles.sortPlaceholder}>↕</span>
              )}
            </span>
          )}
        </div>
      ))}
    </div>
  );
});

// ─── Data row ────────────────────────────────────────────────────────────────

interface DataRowProps {
  row: SpotifyRecord;
  columns: ColumnDef[];
  isSelected: boolean;
  editingCell: { rowId: string; column: keyof SpotifyRecord } | null;
  onToggleSelect: (id: string) => void;
  onStartEdit: (
    rowId: string,
    field: keyof SpotifyRecord,
    value: SpotifyRecord[keyof SpotifyRecord],
  ) => void;
  onSave: (
    rowId: string,
    field: keyof SpotifyRecord,
    value: string | number,
  ) => Promise<void>;
  onCancelEdit: () => void;
  top: number; // virtualizer offset
}

const DataRow = memo(function DataRow({
  row,
  columns,
  isSelected,
  editingCell,
  onToggleSelect,
  onStartEdit,
  onSave,
  onCancelEdit,
  top,
}: DataRowProps) {
  return (
    <div
      className={`${styles.dataRow} ${isSelected ? styles.rowSelected : ""}`}
      style={{ transform: `translateY(${top}px)` }}
      role="row"
      aria-selected={isSelected}
    >
      {/* Checkbox */}
      <div
        className={`${styles.cell} ${styles.checkCell}`}
        style={{ width: CHECKBOX_WIDTH, minWidth: CHECKBOX_WIDTH }}
        role="gridcell"
      >
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={isSelected}
          onChange={() => onToggleSelect(row.id)}
          aria-label={`Select ${row.track_name}`}
        />
      </div>

      {/* Data cells */}
      {columns.map((col) => {
        const value = row[col.field];
        const isEditable = col.field in EDITABLE_FIELDS;
        const isEditing =
          editingCell?.rowId === row.id && editingCell?.column === col.field;

        return (
          <div
            key={col.id}
            className={`${styles.cell} ${isEditing ? styles.cellEditing : ""}`}
            style={{
              width: col.width,
              minWidth: col.width,
              maxWidth: col.width,
            }}
            role="gridcell"
          >
            {isEditable ? (
              <EditableCell
                rowId={row.id}
                field={col.field}
                value={value}
                isEditing={isEditing}
                onStartEdit={onStartEdit}
                onSave={onSave}
                onCancel={onCancelEdit}
              />
            ) : col.render ? (
              col.render(value, row)
            ) : (
              <span className={styles.cellText}>{String(value ?? "")}</span>
            )}
          </div>
        );
      })}
    </div>
  );
});

// ─── DataTable ────────────────────────────────────────────────────────────────

interface DataTableProps {
  records: SpotifyRecord[];
  setRecords: React.Dispatch<React.SetStateAction<SpotifyRecord[]>>;
  totalCount: number;
  columns: ColumnDef[];
  state: TableState;
  actions: TableStateActions;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  onRetry: () => void;
  onSave: (
    rowId: string,
    field: keyof SpotifyRecord,
    value: string | number,
  ) => Promise<void>;
}

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
  onSave,
}: DataTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll on page/filter change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [state.pagination.page, state.filters]);

  // ── Virtualizer ───────────────────────────────────────────────────────────
  const virtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  // ── Total row width (for horizontal scroll) ───────────────────────────────
  const totalRowWidth = useMemo(
    () => CHECKBOX_WIDTH + columns.reduce((sum, c) => sum + c.width, 0),
    [columns],
  );

  // ── Selection ─────────────────────────────────────────────────────────────
  const pageIds = useMemo(() => records.map((r) => r.id), [records]);
  const allPageSelected =
    pageIds.length > 0 &&
    pageIds.every((id) => state.selection.selectedIds.has(id));
  const someSelected = pageIds.some((id) =>
    state.selection.selectedIds.has(id),
  );
  const handleSelectPage = useCallback(
    () => actions.selectPage(pageIds),
    [actions, pageIds],
  );

  const editingCell = state.editing
    ? { rowId: state.editing.rowId, column: state.editing.column }
    : null;

  if (isError) return <ErrorState message={errorMessage} onRetry={onRetry} />;

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.headerScroll}
        ref={(el) => {
          // Sync horizontal scroll between header and body
          const body = scrollRef.current;
          if (!el || !body) return;
          const onBodyScroll = () => {
            el.scrollLeft = body.scrollLeft;
          };
          body.addEventListener("scroll", onBodyScroll, { passive: true });
        }}
      >
        <div style={{ width: totalRowWidth, minWidth: totalRowWidth }}>
          <HeaderRow
            columns={columns}
            sort={state.sort}
            onSort={actions.setSort}
            allPageSelected={allPageSelected}
            someSelected={someSelected}
            onSelectPage={handleSelectPage}
          />
        </div>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className={styles.bodyScroll}>
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <Spinner size="lg" />
          </div>
        )}

        {/* Inner container — sets total scroll width and height */}
        <div
          role="grid"
          aria-rowcount={totalCount}
          style={{
            width: totalRowWidth,
            minWidth: totalRowWidth,
            height: totalHeight,
            position: "relative",
          }}
        >
          {virtualItems.map((vItem) => {
            const row = records[vItem.index];
            if (!row) return null;
            return (
              <DataRow
                key={row.id}
                row={row}
                columns={columns}
                isSelected={state.selection.selectedIds.has(row.id)}
                editingCell={editingCell}
                onToggleSelect={actions.toggleRow}
                onStartEdit={actions.startEdit}
                onSave={onSave}
                onCancelEdit={actions.cancelEdit}
                top={vItem.start}
              />
            );
          })}
        </div>

        {!isLoading && records.length === 0 && (
          <EmptyState
            action={
              <button
                className={styles.clearBtn}
                onClick={actions.clearFilters}
              >
                Clear all filters
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
