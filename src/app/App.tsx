import { BrowserRouter, useLocation } from "react-router-dom";
import { AppRoutes, SidebarNav, BottomNav, PublicNav } from "./routes";
import { LiveProvider } from "../live/LiveProvider";
import { Toaster } from "../components/Toast/Toast";

// Public shell — exact copy of the shared design system layout
// (style documentation v1.0): navy sidebar with brand +
// nav, content column. Scoped under `.pub` so the admin shell keeps its
// own styling untouched.
function PublicShell() {
  return (
    <div className="pub">
      <div className="app">
        <aside className="sidebar" aria-label="Application">
          <div className="brand">Tournament</div>
          <PublicNav />
        </aside>
        <main className="content">
          <AppRoutes />
        </main>
      </div>
    </div>
  );
}

// Admin shell — unchanged (admin pages are not touched).
function AdminShell() {
  return (
    <div className="app app-shell">
      <aside className="sidebar" aria-label="Application">
        <p className="sidebar__brand">Tournament</p>
        <SidebarNav />
      </aside>
      <div className="app-shell__main">
        <div className="app-shell__content">
          <AppRoutes />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function Shell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  return isAdmin ? <AdminShell /> : <PublicShell />;
}

// LiveProvider owns the single app-wide WS connection so every page
// receives silent in-place updates without navigation or reload.
export default function App() {
  return (
    <BrowserRouter>
      <LiveProvider>
        <Shell />
        <Toaster />
      </LiveProvider>
    </BrowserRouter>
  );
}
