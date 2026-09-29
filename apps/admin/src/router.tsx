import { NavLink, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { GamesPage } from "./pages/GamesPage";
import { GameCreatePage } from "./pages/GameCreatePage";
import { GameDetailsPage } from "./pages/GameDetailsPage";
import { ScorePage } from "./pages/ScorePage";
import { GroupsPage } from "./pages/GroupsPage";
import { TeamsPage } from "./pages/TeamsPage";
import { RoundsPage } from "./pages/RoundsPage";
import { FieldsPage } from "./pages/FieldsPage";

// Admin router (spec §9). Management routes only, rooted at /.
export function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/games" element={<GamesPage />} />
      <Route path="/games/create" element={<GameCreatePage />} />
      <Route path="/games/:id" element={<GameDetailsPage />} />
      <Route path="/games/:id/score" element={<ScorePage />} />
      <Route path="/groups" element={<GroupsPage />} />
      <Route path="/teams" element={<TeamsPage />} />
      <Route path="/rounds" element={<RoundsPage />} />
      <Route path="/fields" element={<FieldsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export function NotFoundPage() {
  return (
    <section aria-label="Not found">
      <div className="head">
        <div>
          <div className="eyebrow">404</div>
          <h1>Seite nicht gefunden</h1>
          <p className="muted">The page you requested does not exist.</p>
          <p>
            <a className="btn primary" href="/">
              Zum Dashboard
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

// v6 admin nav.
const ENTRIES = [
  { to: "/", label: "Dashboard", icon: "▣", end: true },
  { to: "/groups", label: "Gruppen", icon: "◫", end: false },
  { to: "/teams", label: "Teams", icon: "▦", end: false },
  { to: "/games", label: "Spiele", icon: "⚑", end: false },
  { to: "/rounds", label: "Runden", icon: "◌", end: false },
  { to: "/fields", label: "Felder", icon: "⌗", end: false },
];

export function AdminSidebar() {
  return (
    <nav aria-label="Primary" className="nav">
      {ENTRIES.map((e) => (
        <NavLink key={e.to} to={e.to} end={e.end} className={({ isActive }) => (isActive ? "active" : "")}>
          {e.icon} {e.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AdminMobileNav() {
  return (
    <nav aria-label="Primary" className="mobile-nav">
      {ENTRIES.map((e) => (
        <NavLink key={e.to} to={e.to} end={e.end} className={({ isActive }) => (isActive ? "active" : "")}>
          <span aria-hidden="true">{e.icon}</span>
          <br />
          {e.label}
        </NavLink>
      ))}
    </nav>
  );
}

// Back-compat export.
export function AdminNav() {
  return <AdminSidebar />;
}
