import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  title?:    string;
  message?:  string;
  action?:   React.ReactNode;
}

export function EmptyState({
  title   = "No results",
  message = "Try adjusting your filters or search query.",
  action,
}: EmptyStateProps) {
  return (
    <div className={styles.root} role="status">
      <div className={styles.icon} aria-hidden>⊘</div>
      <p className={styles.title}>{title}</p>
      <p className={styles.message}>{message}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
