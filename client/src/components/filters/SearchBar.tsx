import { useRef } from "react";
import styles from "./SearchBar.module.css";

interface SearchBarProps {
  value:    string;
  onChange: (value: string) => void;
}

/**
 * Global search input.
 * The debounce lives in useFetchRecords — this fires on every keystroke
 * and the API call is held back 300ms downstream.
 */
export function SearchBar({ value, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isActive = value.trim().length > 0;

  return (
    <div className={`${styles.root} ${isActive ? styles.active : ""}`}>
      <span className={styles.icon} aria-hidden>⌕</span>
      <input
        ref={inputRef}
        className={styles.input}
        type="search"
        placeholder="Search tracks, artists, albums…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Global search"
        autoComplete="off"
        spellCheck={false}
      />
      {isActive && (
        <>
          <span className={styles.activeIndicator} aria-live="polite" aria-label="Search active" />
          <button
            className={styles.clearBtn}
            onClick={() => { onChange(""); inputRef.current?.focus(); }}
            aria-label="Clear search"
            type="button"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}
