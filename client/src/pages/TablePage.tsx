import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTableState } from "../hooks/useTableState";
import { useFetchRecords } from "../hooks/useFetchRecords";
import { useColumnPrefs } from "../hooks/useColumnPrefs";
import { useInlineEdit } from "../hooks/useInlineEdit";
import { useExport } from "../hooks/useExport";
import { DataTable, DEFAULT_COLUMNS } from "../components/table/DataTable";
import { TableToolbar } from "../components/table/TableToolbar";
import { BulkActionBar } from "../components/table/BulkActionBar";
import { ColumnManager } from "../components/table/ColumnManager";
import { usePagination, PAGE_SIZE_OPTIONS } from "../hooks/usePagination";
import { countActiveFilters } from "../utils/filterUtils";
import styles from "./TablePage.module.css";

const DEFAULT_COLUMN_IDS = DEFAULT_COLUMNS.map((c) => c.id);
const COLUMN_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_COLUMNS.map((c) => [c.id, c.label]),
);

export function TablePage() {
  const navigate = useNavigate();
  const { state, actions } = useTableState();

  const {
    records,
    setRecords,
    totalCount,
    isLoading,
    isError,
    errorMessage,
    refetch,
  } = useFetchRecords({
    pagination: state.pagination,
    sort: state.sort,
    filters: state.filters,
  });

  const { prefs, visibleColumnIds, toggleColumn, reorderColumns, resetPrefs } =
    useColumnPrefs(DEFAULT_COLUMN_IDS);

  const visibleColumns = useMemo(
    () =>
      visibleColumnIds
        .map((id) => DEFAULT_COLUMNS.find((c) => c.id === id))
        .filter((c): c is (typeof DEFAULT_COLUMNS)[number] => !!c),
    [visibleColumnIds],
  );

  const { startRow, endRow, hasPrev, hasNext, pageNumbers } = usePagination({
    totalCount,
    page: state.pagination.page,
    limit: state.pagination.limit,
  });

  const { handleSave } = useInlineEdit({ records, setRecords, actions });
  const { status: exportStatus, exportAll, exportSelected } = useExport();
  const visibleFields = useMemo(
    () => visibleColumns.map((c) => c.field),
    [visibleColumns],
  );

  const handleExportAll = useCallback(
    () => exportAll(state.sort, state.filters, visibleFields),
    [exportAll, state.sort, state.filters, visibleFields],
  );

  const handleExportSelected = useCallback(
    () =>
      exportSelected(
        state.selection,
        records,
        state.sort,
        state.filters,
        visibleFields,
      ),
    [
      exportSelected,
      state.selection,
      records,
      state.sort,
      state.filters,
      visibleFields,
    ],
  );

  const handleRowClick = useCallback(
    (id: string) => navigate(`/track/${id}`),
    [navigate],
  );

  const hasSelection =
    state.selection.selectedIds.size > 0 || state.selection.scope === "all";
  const activeFilterCount = useMemo(
    () => countActiveFilters(state.filters),
    [state.filters],
  );

  return (
    <div className={styles.page}>
      {/* Sub-header: track count + column manager */}
      <div className={styles.subHeader}>
        <span className={styles.rowCount}>
          {totalCount.toLocaleString()} tracks
        </span>
        <ColumnManager
          prefs={prefs}
          onToggle={toggleColumn}
          onReorder={reorderColumns}
          onReset={resetPrefs}
          columnLabels={COLUMN_LABELS}
        />
      </div>

      <main className={styles.main}>
        <TableToolbar
          filters={state.filters}
          actions={actions}
          activeCount={activeFilterCount}
        />

        {hasSelection && (
          <BulkActionBar
            selection={state.selection}
            totalCount={totalCount}
            pageCount={records.length}
            actions={actions}
            onExport={handleExportSelected}
            onSelectAll={actions.selectAll}
            isExporting={exportStatus === "fetching"}
          />
        )}

        <DataTable
          records={records}
          setRecords={setRecords}
          totalCount={totalCount}
          columns={visibleColumns}
          state={state}
          actions={actions}
          isLoading={isLoading}
          isError={isError}
          errorMessage={errorMessage}
          onRetry={refetch}
          onSave={handleSave}
          onRowClick={handleRowClick}
        />
      </main>

      <footer className={styles.footer}>
        <span className={styles.showing}>
          {totalCount === 0
            ? "No results"
            : `Showing ${startRow.toLocaleString()}–${endRow.toLocaleString()} of ${totalCount.toLocaleString()}`}
        </span>

        <button
          className={styles.exportBtn}
          onClick={handleExportAll}
          disabled={exportStatus === "fetching" || totalCount === 0}
        >
          {exportStatus === "fetching" ? "Exporting…" : "↓ Export CSV"}
        </button>

        <nav className={styles.pageControls} aria-label="Pagination">
          <button
            className={styles.pageBtn}
            disabled={!hasPrev}
            onClick={() => actions.setPage(state.pagination.page - 1)}
            aria-label="Previous page"
          >
            ‹
          </button>

          {pageNumbers.map((p, i) =>
            p === "…" ? (
              <span key={`el-${i}`} className={styles.ellipsis}>
                …
              </span>
            ) : (
              <button
                key={p}
                className={`${styles.pageBtn} ${p === state.pagination.page ? styles.pageBtnActive : ""}`}
                onClick={() => actions.setPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === state.pagination.page ? "page" : undefined}
              >
                {p}
              </button>
            ),
          )}

          <button
            className={styles.pageBtn}
            disabled={!hasNext}
            onClick={() => actions.setPage(state.pagination.page + 1)}
            aria-label="Next page"
          >
            ›
          </button>
        </nav>

        <select
          className={styles.limitSelect}
          value={state.pagination.limit}
          onChange={(e) => actions.setLimit(Number(e.target.value))}
          aria-label="Rows per page"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
      </footer>
    </div>
  );
}
