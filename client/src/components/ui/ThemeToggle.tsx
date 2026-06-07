import type { Theme } from "../../hooks/useTheme";
import styles from "./ThemeToggle.module.css";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === "dark";

  function handleClick() {
    // Add transition class briefly so the switch feels smooth
    document.documentElement.classList.add("theme-transitioning");
    onToggle();
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }, 3000);
  }

  return (
    <button
      className={styles.toggle}
      onClick={handleClick}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      type="button"
    >
      <span className={styles.track} data-dark={isDark}>
        <span className={styles.thumb}>{isDark ? "🌙" : "☀️"}</span>
      </span>
    </button>
  );
}
