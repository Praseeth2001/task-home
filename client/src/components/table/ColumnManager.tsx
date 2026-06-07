import { useState, useRef, useEffect, useCallback } from "react";
import type { ColumnPreference } from "../../types";
import styles from "./ColumnManager.module.css";

interface ColumnManagerProps {
  prefs: ColumnPreference[];
  onToggle: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onReset: () => void;
  columnLabels: Record<string, string>;
}

/*
 * Dropdown panel for column visibility and drag-to-reorder.
 *
 * Closes on Escape / click-outside.
 */
export function ColumnManager({
  prefs,
  onToggle,
  onReorder,
  onReset,
  columnLabels,
}: ColumnManagerProps) {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const sorted = [...prefs].sort((a, b) => a.order - b.order);
  const visibleCount = prefs.filter((c) => c.visible).length;

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleDragStart = useCallback((id: string) => {
    dragId.current = id;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOver(id);
  }, []);

  const handleDrop = useCallback(
    (toId: string) => {
      if (dragId.current && dragId.current !== toId) {
        onReorder(dragId.current, toId);
      }
      dragId.current = null;
      setDragOver(null);
    },
    [onReorder],
  );

  const handleDragEnd = useCallback(() => {
    dragId.current = null;
    setDragOver(null);
  }, []);

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Manage columns"
        title="Manage columns"
      >
        <span className={styles.icon} aria-hidden>
          ⊞
        </span>
        <span className={styles.label}>Columns</span>
        {visibleCount < prefs.length && (
          <span className={styles.hiddenBadge}>
            {prefs.length - visibleCount} hidden
          </span>
        )}
      </button>

      {open && (
        <div
          className={styles.panel}
          role="dialog"
          aria-label="Column visibility and order"
        >
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Columns</span>
            <button
              className={styles.resetBtn}
              type="button"
              onClick={onReset}
              aria-label="Reset columns to default"
            >
              Reset
            </button>
          </div>

          <p className={styles.hint}>Drag to reorder · click to show/hide</p>

          <ul className={styles.list}>
            {sorted.map((pref) => {
              const label = columnLabels[pref.id] ?? pref.id;
              const isOver = dragOver === pref.id;

              return (
                <li
                  key={pref.id}
                  className={`${styles.item} ${isOver ? styles.dragOver : ""} ${!pref.visible ? styles.hidden : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(pref.id)}
                  onDragOver={(e) => handleDragOver(e, pref.id)}
                  onDrop={() => handleDrop(pref.id)}
                  onDragEnd={handleDragEnd}
                >
                  {/* Drag handle */}
                  <span className={styles.dragHandle} aria-hidden>
                    ⋮⋮
                  </span>

                  {/* Visibility toggle */}
                  <label className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={pref.visible}
                      onChange={() => onToggle(pref.id)}
                      aria-label={`${pref.visible ? "Hide" : "Show"} ${label} column`}
                    />
                    <span className={styles.colLabel}>{label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
