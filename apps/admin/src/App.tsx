import { BrowserRouter } from "react-router-dom";
import { AdminProvider } from "./state/store";
import { AdminMobileNav, AdminRoutes, AdminSidebar } from "./router";

// Admin shell — v6 design: sticky top, sidebar layout, bottom mobile nav.
// No public live socket here; screens refresh via REST.
export function AdminApp() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <a className="skip-link" href="#main-content">
          Zum Inhalt springen
        </a>
        <header className="top">
          <div className="brand">
            <span className="logo" aria-hidden="true">
              ◒
            </span>
            <a href="/">ATIW Volleyballturnier · Admin</a>
          </div>
        </header>
        <div className="layout">
          <aside aria-label="Seitennavigation">
            <AdminSidebar />
            <div className="side-note">
              <b>Admin-Modus</b>
              <br />
              Backend ist die einzige Wahrheit. Änderungen wirken sofort.
            </div>
          </aside>
          <main id="main-content">
            <AdminRoutes />
          </main>
        </div>
        <AdminMobileNav />
      </AdminProvider>
    </BrowserRouter>
  );
}

export default AdminApp;
