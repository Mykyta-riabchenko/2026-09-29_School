import { NavLink, Route, Routes } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { GamesPage } from "./pages/GamesPage";
import { GameDetailsPage } from "./pages/GameDetailsPage";
import { FieldsPage } from "./pages/FieldsPage";
import { GroupsPage } from "./pages/GroupsPage";
import { GroupDetailsPage } from "./pages/GroupDetailsPage";
import { TeamsPage } from "./pages/TeamsPage";
import { TeamDetailsPage } from "./pages/TeamDetailsPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { TreePage } from "./pages/TreePage";

// User router (spec §9). Public routes only. v6 nav: Übersicht, Teams,
// Spiele, Baum, Felder. Groups/Leaderboard stay reachable via overview.
export function UserRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/games" element={<GamesPage />} />
      <Route path="/games/:id" element={<GameDetailsPage />} />
      <Route path="/tree" element={<TreePage />} />
      <Route path="/fields" element={<FieldsPage />} />
      <Route path="/groups" element={<GroupsPage />} />
      <Route path="/groups/:id" element={<GroupDetailsPage />} />
      <Route path="/teams" element={<TeamsPage />} />
      <Route path="/teams/:id" element={<TeamDetailsPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
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
              Zur Übersicht
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

// v6 sidebar entries (German, with icons like the reference).
// Note: /games route stays registered below, just hidden from nav.
const ENTRIES = [
  { to: "/", label: "Übersicht", icon: "◉", end: true },
  { to: "/teams", label: "Teams", icon: "▦", end: false },
  { to: "/tree", label: "Spiele", icon: "⌘", end: false },
  { to: "/fields", label: "Felder", icon: "⌗", end: false },
];

export function UserSidebar() {
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

export function UserMobileNav() {
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

// Back-compat export (old App used UserNav).
export function UserNav() {
  return <UserSidebar />;
}
