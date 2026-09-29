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
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <p>
        <a href="/">Back to dashboard</a>
      </p>
    </section>
  );
}

const ENTRIES = [
  { to: "/", label: "Dashboard" },
  { to: "/games", label: "Games" },
  { to: "/groups", label: "Groups" },
  { to: "/teams", label: "Teams" },
  { to: "/rounds", label: "Rounds" },
  { to: "/fields", label: "Fields" },
];

export function AdminNav() {
  return (
    <nav aria-label="Primary" className="app-nav">
      {ENTRIES.map((e) => (
        <NavLink key={e.to} to={e.to}>
          {e.label}
        </NavLink>
      ))}
    </nav>
  );
}
