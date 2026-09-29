import { BrowserRouter } from "react-router-dom";
import { TournamentProvider } from "./state/store";
import { LiveProvider, useLiveStatus } from "./live/live";
import { UserMobileNav, UserRoutes, UserSidebar } from "./router";

function LiveIndicator() {
  const live = useLiveStatus();
  const label =
    live.status === "connected"
      ? "Live verbunden"
      : live.status === "connecting"
        ? "Verbinde …"
        : live.status === "reconnecting"
          ? "Verbinde neu …"
          : "Offline";
  const dot =
    live.status === "connected" ? "live-dot" : live.status === "failed" || live.status === "disconnected" ? "live-dot live-dot--bad" : "live-dot live-dot--warn";
  return (
    <span className="live-pill-top" role="status" aria-live="polite">
      <span className={dot} aria-hidden="true" />
      {label}{" "}
      {live.status === "failed" || live.status === "disconnected" ? (
        <button type="button" className="btn" style={{ minHeight: 32, padding: "4px 10px" }} onClick={live.retry}>
          Neu verbinden
        </button>
      ) : null}
    </span>
  );
}

// Public shell — v6 design: sticky top, sidebar layout, bottom mobile nav.
export function UserApp() {
  return (
    <BrowserRouter>
      <TournamentProvider>
        <LiveProvider>
          <a className="skip-link" href="#main-content">
            Zum Inhalt springen
          </a>
          <header className="top">
            <div className="brand">
              <span className="logo" aria-hidden="true">
                ◒
              </span>
              <a href="/">ATIW Volleyballturnier</a>
            </div>
            <LiveIndicator />
          </header>
          <div className="layout">
            <aside aria-label="Seitennavigation">
              <UserSidebar />
            </aside>
            <main id="main-content">
              <UserRoutes />
            </main>
          </div>
          <UserMobileNav />
        </LiveProvider>
      </TournamentProvider>
    </BrowserRouter>
  );
}

export default UserApp;
