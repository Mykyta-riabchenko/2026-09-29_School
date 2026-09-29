import { BrowserRouter } from "react-router-dom";
import { AdminProvider } from "./state/store";
import { AdminNav, AdminRoutes } from "./router";

// Admin shell. Tournament management application.
// No public live socket here; screens refresh via REST.
export function AdminApp() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <header>
          <p>Tournament – Admin</p>
          <AdminNav />
        </header>
        <main>
          <AdminRoutes />
        </main>
      </AdminProvider>
    </BrowserRouter>
  );
}

export default AdminApp;
