import styles from "./ErrorState.module.css";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong while loading data.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className={styles.root} role="alert">
      <div className={styles.icon} aria-hidden>⚠</div>
      <p className={styles.title}>Failed to load</p>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button className={styles.retry} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
