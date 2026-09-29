import type { ReactNode } from "react";
import type { GameStatus } from "../../domain/game";

export type BadgeVariant =
  | "neutral"
  | "live"
  | "success"
  | "warning"
  | "brand";

// Small uppercase metadata label (style doc §12), e.g. GRUPPE A,
// FELD 1, LIVE, ABGESCHLOSSEN.
export function Badge({
  variant = "neutral",
  children,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
}) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}

export type StatusKind = "live" | "completed" | "warning" | "info" | "neutral";

// Semantic status badge using the §25 state colours — never red/green
// ad hoc. Maps live/completed/warning/info to the right tokens.
export function StatusBadge({
  status,
  children,
}: {
  status: StatusKind;
  children: ReactNode;
}) {
  const variant: BadgeVariant =
    status === "live"
      ? "live"
      : status === "completed"
        ? "success"
        : status === "warning"
          ? "warning"
          : status === "info"
            ? "neutral"
            : "neutral";
  return <Badge variant={variant}>{children}</Badge>;
}

// Game display-state badge (admin doc §7, §13).
// Renders ONLY the explicit lifecycle status carried by the Game object
// (SCHEDULED → Planned, LIVE → Live, COMPLETED → Completed).
// A missing status renders nothing: the display state is unknown and
// MUST NOT be inferred from scores alone.
export function GameStatusBadge({ status }: { status?: GameStatus }) {
  if (status === "LIVE") return <Badge variant="live">Live</Badge>;
  if (status === "COMPLETED") return <Badge variant="success">Completed</Badge>;
  if (status === "SCHEDULED") return <Badge variant="neutral">Planned</Badge>;
  return null;
}
