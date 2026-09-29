import { BrowserRouter } from "react-router-dom";
import { TournamentProvider } from "./state/store";
import { LiveProvider } from "./live/live";
import { UserNav, UserRoutes } from "./router";

// Public shell. Read-only tournament presentation.
export function UserApp() {
  return (
    <BrowserRouter>
      <TournamentProvider>
        <LiveProvider>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <header className="app-header">
            <p className="app-header__brand">
              <a href="/">Tournament – Public</a>
            </p>
            <UserNav />
          </header>
          <main className="app-main" id="main-content">
            <UserRoutes />
          </main>
          <footer className="app-footer">
            <span>Tournament – public results. Live updates when connected.</span>
          </footer>
        </LiveProvider>
      </TournamentProvider>
    </BrowserRouter>
  );
}

export default UserApp;
