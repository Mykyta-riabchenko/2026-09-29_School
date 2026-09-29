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
          <header>
            <p>Tournament – Public</p>
            <UserNav />
          </header>
          <main>
            <UserRoutes />
          </main>
        </LiveProvider>
      </TournamentProvider>
    </BrowserRouter>
  );
}

export default UserApp;
