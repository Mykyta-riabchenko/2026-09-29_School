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

// User router (spec §9). Public routes only. Management tree lives elsewhere.
export function UserRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/games" element={<GamesPage />} />
      <Route path="/games/:id" element={<GameDetailsPage />} />
      <Route path="/fields" element={<FieldsPage />} />
      <Route path="/groups" element={<GroupsPage />} />
      <Route path="/groups/:id" element={<GroupDetailsPage />} />
      <Route path="/teams" element={<TeamsPage />} />
      <Route path="/teams/:id" element={<TeamDetailsPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
    </Routes>
  );
}

const ENTRIES = [
  { to: "/", label: "Home" },
  { to: "/games", label: "Games" },
  { to: "/fields", label: "Fields" },
  { to: "/groups", label: "Groups" },
  { to: "/teams", label: "Teams" },
  { to: "/leaderboard", label: "Leaderboard" },
];

export function UserNav() {
  return (
    <nav aria-label="Public">
      {ENTRIES.map((e) => (
        <NavLink key={e.to} to={e.to}>
          {e.label}
        </NavLink>
      ))}
    </nav>
  );
}
