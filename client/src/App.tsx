import { Routes, Route } from "react-router-dom";
import { useTheme } from "./hooks/useTheme";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import { TablePage } from "./pages/TablePage";
import { TrackDetailPage } from "./pages/TrackDetailPage";
import styles from "./App.module.css";

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>◆</span>
          <h1 className={styles.title}>Spotify Tracks</h1>
        </div>
        <div className={styles.headerRight}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <div className={styles.routeContent}>
        <Routes>
          <Route path="/" element={<TablePage />} />
          <Route path="/track/:id" element={<TrackDetailPage />} />
        </Routes>
      </div>
    </div>
  );
}
