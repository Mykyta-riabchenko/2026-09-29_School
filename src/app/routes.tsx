import { NavLink, Route, Routes } from "react-router-dom";
import { GroupsPage } from "../pages/GroupsPage";
import { GroupDetailsPage } from "../pages/GroupDetailsPage";
import { GamesPage } from "../pages/GamesPage";
import { GameDetailsPage } from "../pages/GameDetailsPage";
import { TeamsPage } from "../pages/TeamsPage";
import { FieldsPage } from "../pages/FieldsPage";
import { RoundsPage } from "../pages/RoundsPage";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AdminGamesPage } from "../pages/admin/AdminGamesPage";
import { AdminGameFormPage } from "../pages/admin/AdminGameFormPage";
import { AdminGameDetailsPage } from "../pages/admin/AdminGameDetailsPage";
import { AdminScorePage } from "../pages/admin/AdminScorePage";
import { AdminTeamsPage } from "../pages/admin/AdminTeamsPage";
import { AdminGroupsPage } from "../pages/admin/AdminGroupsPage";
import { AdminRoundsPage } from "../pages/admin/AdminRoundsPage";
import { AdminFieldsPage } from "../pages/admin/AdminFieldsPage";
import { AdminSettingsPage } from "../pages/admin/AdminSettingsPage";
import { Icon, type IconName } from "../components/Icon/Icon";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<GamesPage />} />
      <Route path="/games" element={<GamesPage />} />
      <Route path="/games/:id" element={<GameDetailsPage />} />
      <Route path="/groups" element={<GroupsPage />} />
      <Route path="/groups/:id" element={<GroupDetailsPage />} />
      <Route path="/teams" element={<TeamsPage />} />
      <Route path="/fields" element={<FieldsPage />} />
      <Route path="/rounds" element={<RoundsPage />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/admin/games" element={<AdminGamesPage />} />
      <Route path="/admin/games/new" element={<AdminGameFormPage mode="create" />} />
      <Route path="/admin/games/:gameId" element={<AdminGameDetailsPage />} />
      <Route path="/admin/games/:gameId/score" element={<AdminScorePage />} />
      <Route path="/admin/games/:gameId/edit" element={<AdminGameFormPage mode="edit" />} />
      <Route path="/admin/teams" element={<AdminTeamsPage />} />
      <Route path="/admin/groups" element={<AdminGroupsPage />} />
      <Route path="/admin/rounds" element={<AdminRoundsPage />} />
      <Route path="/admin/fields" element={<AdminFieldsPage />} />
      <Route path="/admin/settings" element={<AdminSettingsPage />} />
    </Routes>
  );
}

interface NavEntry {
  to: string;
  label: string;
  icon: IconName;
}

// Single navigation model drives both the desktop sidebar and the
// mobile bottom bar, so the two can never drift apart.
export const NAV_ENTRIES: NavEntry[] = [
  { to: "/games", label: "Games", icon: "games" },
  { to: "/groups", label: "Groups", icon: "groups" },
  { to: "/teams", label: "Teams", icon: "teams" },
  { to: "/fields", label: "Fields", icon: "fields" },
  { to: "/admin/dashboard", label: "Admin", icon: "admin" },
];

export function SidebarNav() {
  return (
    <nav aria-label="Main navigation" className="sidebar__nav">
      {NAV_ENTRIES.map((entry) => (
        <NavLink key={entry.to} to={entry.to} className="sidebar__link">
          <Icon name={entry.icon} size="sm" />
          {entry.label}
        </NavLink>
      ))}
    </nav>
  );
}

// Public navigation — exact copy of the shared design system sidebar nav:
// Games 🏆, Groups ▱, Teams ♙, Fields ⌖, Rounds ◷. Admin pages are not
// part of the public nav; they stay reachable via their /admin/* URLs.
const PUBLIC_NAV_ENTRIES: Array<{ to: string; label: string; emoji: string }> = [
  { to: "/games", label: "Games", emoji: "🏆" },
  { to: "/groups", label: "Groups", emoji: "▱" },
  { to: "/teams", label: "Teams", emoji: "♙" },
  { to: "/fields", label: "Fields", emoji: "⌖" },
  { to: "/rounds", label: "Rounds", emoji: "◷" },
];

export function PublicNav() {
  return (
    <nav aria-label="Main navigation" className="nav">
      {PUBLIC_NAV_ENTRIES.map((entry) => (
        <NavLink
          key={entry.to}
          to={entry.to}
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          <span aria-hidden="true">{entry.emoji}</span>
          {entry.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function BottomNav() {
  return (
    <nav aria-label="Main navigation" className="bottom-nav">
      {NAV_ENTRIES.map((entry) => (
        <NavLink key={entry.to} to={entry.to} className="bottom-nav__item">
          <Icon name={entry.icon} size="md" />
          {entry.label}
        </NavLink>
      ))}
    </nav>
  );
}
