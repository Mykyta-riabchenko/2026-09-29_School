import type { Team } from "../../domain/team";
import { sortTeamsByName } from "../../domain/team";
import type { Group } from "../../domain/group";
import { Badge } from "../Badge/Badge";

// Stacked team cards (style doc §14) with class/group metadata badges.
// Group names resolve via lookup; raw opaque IDs are never shown when
// the group is known.
export function TeamList({
  teams,
  groupsById,
}: {
  teams: Team[];
  groupsById?: Map<string, Group>;
}) {
  const sorted = sortTeamsByName(teams);
  return (
    <ul className="card-grid" aria-label="Teams">
      {sorted.map((t) => (
        <li key={t.teamId} className="team-card">
          <h3 className="team-card__name">{t.name}</h3>
          <div className="team-card__meta">
            <Badge variant="neutral">{t.class}</Badge>
            <Badge variant="brand">
              {groupsById?.get(t.groupId)?.name ?? t.groupId}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
