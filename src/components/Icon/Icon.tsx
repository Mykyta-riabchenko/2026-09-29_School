// One icon system: single custom inline-SVG set (style doc §29).
// Icons inherit text colour (currentColor). Do not mix in other sets.

export type IconName = "games" | "groups" | "teams" | "fields" | "admin";
export type IconSize = "xs" | "sm" | "md" | "lg";

const PATHS: Record<IconName, string> = {
  // Trophy cup for games/schedule.
  games:
    "M7 4h10v5a5 5 0 0 1-10 0V4z M7 5H4a1 1 0 0 0-1 1c0 2.5 2 4.5 4.5 4.7 M17 5h3a1 1 0 0 1 1 1c0 2.5-2 4.5-4.5 4.7 M12 14v3 M8.5 20.5h7 M10 17h4",
  // Layered squares for groups.
  groups:
    "M12 3.5 20.5 8 12 12.5 3.5 8 12 3.5z M4.5 11.5 12 15.5l7.5-4 M4.5 15 12 19l7.5-4",
  // Two person silhouettes for teams.
  teams:
    "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M3.5 20a5.5 5.5 0 0 1 11 0 M15.5 11.5a3 3 0 1 0-1.6-5.5 M16 14.7a5.5 5.5 0 0 1 4.5 5.3",
  // Map pin for fields/courts.
  fields:
    "M12 21s6.5-5.6 6.5-10.5A6.5 6.5 0 0 0 5.5 10.5C5.5 15.4 12 21 12 21z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  // Shield with check for the admin section.
  admin:
    "M12 3.5 19.5 6v6c0 4.5-3.2 7.6-7.5 8.5C7.7 19.6 4.5 16.5 4.5 12V6L12 3.5z M9 12l2 2 4-4.5",
};

export function Icon({
  name,
  size = "md",
  label,
}: {
  name: IconName;
  size?: IconSize;
  label?: string;
}) {
  return (
    <svg
      className={`icon icon--${size}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
