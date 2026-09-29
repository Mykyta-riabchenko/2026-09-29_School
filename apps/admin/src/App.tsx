import { BrowserRouter } from "react-router-dom";
import { AdminProvider } from "./state/store";
import { AdminNav, AdminRoutes } from "./router";

// Admin shell. Tournament management application.
// No public live socket here; screens refresh via REST.
export function AdminApp() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <header className="app-header">
          <p className="app-header__brand">
            <a href="/">Tournament – Admin</a>
          </p>
          <AdminNav />
        </header>
        <main className="app-main" id="main-content">
          <AdminRoutes />
        </main>
        <footer className="app-footer">
          <span>Tournament administration. Changes take effect immediately.</span>
        </footer>
      </AdminProvider>
    </BrowserRouter>
  );
}

export default AdminApp;
