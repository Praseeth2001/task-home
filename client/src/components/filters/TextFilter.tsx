import styles from "./TextFilter.module.css";
import type { SpotifyRecord } from "../../types";

interface TextFilterProps {
  field: keyof SpotifyRecord;
  label: string;
  value: string;
  onChange: (field: keyof SpotifyRecord, value: string) => void;
  placeholder?: string;
}

/**
 * "Contains" text filter — maps to json-server's `<field>_like` param.
 */
export function TextFilter({
  field,
  label,
  value,
  onChange,
  placeholder,
}: TextFilterProps) {
  const isActive = value.trim().length > 0;

  return (
    <label className={`${styles.root} ${isActive ? styles.active : ""}`}>
      <span className={styles.label}>{label}</span>
      <div className={styles.inputWrap}>
        <input
          className={styles.input}
          type="text"
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          placeholder={placeholder ?? `Filter by ${label.toLowerCase()}…`}
          aria-label={`Filter by ${label}`}
          autoComplete="off"
          spellCheck={false}
        />
        {isActive && (
          <button
            className={styles.clear}
            type="button"
            onClick={() => onChange(field, "")}
            aria-label={`Clear ${label} filter`}
          >
            ✕
          </button>
        )}
      </div>
    </label>
  );
}
