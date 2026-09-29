import { API_BASE_URL } from "../../config/api";
import { useLiveStatus } from "../../live/LiveProvider";
import { clearTournamentCache } from "../../state/cache";
import { Button } from "../../components/Button/Button";
import { Badge } from "../../components/Badge/Badge";

// Admin settings (admin doc §2, §37): deployment info, API endpoint,
// cache controls. No secrets are stored here; auth isolation is
// prepared under src/auth when the backend requires it (§35).
export function AdminSettingsPage() {
  const live = useLiveStatus();

  return (
    <section className="page page--with-bottom-nav" aria-label="Admin settings">
      <header className="page-header">
        <h1 className="text-page-title">Settings</h1>
        <Badge variant="brand">Admin</Badge>
      </header>
      <div className="page-content">
        <div className="card">
          <h2 className="text-section-title">Backend</h2>
          <p className="text-body">API: {API_BASE_URL}</p>
          <p className="text-body">
            Override with <code>VITE_API_BASE_URL</code>. No component
            contains a hard-coded backend URL.
          </p>
        </div>
        <div className="card">
          <h2 className="text-section-title">Live connection</h2>
          <p className="text-body">Status: {live.status}</p>
          {live.status === "failed" ? (
            <Button variant="secondary" size="sm" onClick={live.retry}>
              Retry connection
            </Button>
          ) : null}
        </div>
        <div className="card">
          <h2 className="text-section-title">Offline cache</h2>
          <p className="text-body">
            Clears the last known server snapshot from this browser.
          </p>
          <Button variant="danger" size="sm" onClick={() => clearTournamentCache()}>
            Clear cache
          </Button>
        </div>
      </div>
    </section>
  );
}
