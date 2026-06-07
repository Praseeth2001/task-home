import { useState, useRef, useEffect, useCallback } from "react";
import type { SpotifyRecord } from "../../types";
import styles from "./MultiSelectFilter.module.css";

interface MultiSelectFilterProps {
  field: keyof SpotifyRecord;
  label: string;
  options: string[];
  selected: string[];
  onChange: (field: keyof SpotifyRecord, values: string[]) => void;
}

/**
 * Dropdown multi-select — maps to json-server's repeated exact-match params.
 * Opens a checkboxed list; selected items shown as count badge.
 * Closes on Escape or click-outside.
 */
export function MultiSelectFilter({
  field,
  label,
  options,
  selected,
  onChange,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const isActive = selected.length > 0;

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const toggleOption = useCallback(
    (option: string) => {
      const next = selected.includes(option)
        ? selected.filter((v) => v !== option)
        : [...selected, option];
      onChange(field, next);
    },
    [field, selected, onChange],
  );

  const clearAll = useCallback(() => onChange(field, []), [field, onChange]);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${isActive ? styles.active : ""}`}
    >
      <span className={styles.labelText}>{label}</span>
      <button
        className={styles.trigger}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Filter by ${label}`}
      >
        <span className={styles.triggerLabel}>
          {isActive ? (
            <>
              <span className={styles.badge}>{selected.length}</span>
              {selected.length === 1
                ? selected[0]
                : `${selected.length} selected`}
            </>
          ) : (
            <span className={styles.placeholder}>Any</span>
          )}
        </span>
        <span
          className={`${styles.caret} ${open ? styles.caretOpen : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          className={styles.dropdown}
          role="listbox"
          aria-multiselectable="true"
        >
          {/* Search within options */}
          {options.length > 8 && (
            <div className={styles.searchWrap}>
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                aria-label={`Search ${label} options`}
              />
            </div>
          )}

          <ul className={styles.list}>
            {filtered.length === 0 && (
              <li className={styles.noResults}>No options match</li>
            )}
            {filtered.map((option) => {
              const checked = selected.includes(option);
              return (
                <li key={option} className={styles.item}>
                  <label
                    className={`${styles.optionLabel} ${checked ? styles.checked : ""}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={checked}
                      onChange={() => toggleOption(option)}
                      aria-selected={checked}
                    />
                    <span className={styles.optionText}>{option}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          {isActive && (
            <div className={styles.footer}>
              <button
                className={styles.clearAll}
                type="button"
                onClick={clearAll}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
