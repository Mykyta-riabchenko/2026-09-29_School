// Public status display. Status comes from backend `status` field only.
// SCHEDULED / RUNNING / FINISHED are shown directly. Scores and status
// are independent; no score inspection happens here.
import type { Game } from "../../../../packages/contracts/src/index";

export function statusLabel(status: Game["status"]): string {
  if (status === "RUNNING") return "Live";
  if (status === "FINISHED") return "Completed";
  return "Planned";
}
