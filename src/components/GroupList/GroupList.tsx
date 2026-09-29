import { Link } from "react-router-dom";
import type { Group } from "../../domain/group";
import { sortGroupsByName } from "../../domain/group";

export function GroupList({ groups }: { groups: Group[] }) {
  // Derived sorted view; never mutates the cached array.
  const sorted = sortGroupsByName(groups);
  return (
    <ul className="card-grid" aria-label="Groups">
      {sorted.map((g) => (
        <li key={g.groupId} className="card card--interactive">
          <Link
            className="text-section-title"
            to={`/groups/${encodeURIComponent(g.groupId)}`}
          >
            {g.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
