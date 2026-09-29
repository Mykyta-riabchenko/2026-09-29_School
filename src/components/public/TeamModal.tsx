import { useEffect } from "react";
import type { Game } from "../../domain/game";
import type { Team } from "../../domain/team";
import type { Field } from "../../domain/field";
import type { Round } from "../../domain/round";
import { formatScore } from "../../domain/game";
import { toPublicStatus, publicStatusLabel } from "./publicHelpers";

// Fight-arena pop-up — shared design system team modal. Opened ONLY by
// clicking a game (Games page cards, Fields live courts), never by
// clicking a team. Shows the clicked game; scores come from the live
// store value passed in, so WS updates swap in place while open.
export function TeamModal({
  game,
  lookups,
  onClose,
}: {
  game: Game | null;
  lookups: {
    teamsById: Map<string, Team>;
    fieldsById: Map<string, Field>;
    roundsById: Map<string, Round>;
    groupNameOf: (team: Team) => string;
  };
  onClose: () => void;
}) {
  useEffect(() => {
    if (!game) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [game, onClose]);

  const open = game !== null;
  const teamA = game ? lookups.teamsById.get(game.teamAId) : undefined;
  const teamB = game ? lookups.teamsById.get(game.teamBId) : undefined;
  const referee = game ? lookups.teamsById.get(game.refereeTeamId) : undefined;
  const field = game ? lookups.fieldsById.get(game.fieldId) : undefined;
  const round = game ? lookups.roundsById.get(game.roundId) : undefined;
  const status = game ? toPublicStatus(game) : ("waiting" as const);

  return (
    <div
      id="teamModal"
      className={`modal-backdrop${open ? " open" : ""}`}
      aria-hidden={open ? "false" : "true"}
      onClick={(e) => {
        if (e.target instanceof HTMLElement && e.target.id === "teamModal")
          onClose();
      }}
    >
      {game ? (
        <div className="team-modal" role="dialog" aria-modal="true">
          <button className="close" onClick={onClose} aria-label="Close">
            ×
          </button>
          <div className="fight-title">
            {`${round ? `Round ${round.number}` : "Game"} · ${publicStatusLabel(status)}`}
          </div>
          <div className="score-arena">
            <div className="fighter blue">
              <div className="fighter-name">
                {teamA?.name ?? game.teamAId}
              </div>
              <div className="fighter-class">
                {teamA
                  ? `${lookups.groupNameOf(teamA)} · ${teamA.class}`
                  : ""}
              </div>
              <div className="big-score">{formatScore(game.scoreA)}</div>
            </div>
            <div className="versus">VS</div>
            <div className="fighter red">
              <div className="fighter-name">
                {teamB?.name ?? game.teamBId}
              </div>
              <div className="fighter-class">
                {teamB
                  ? `${lookups.groupNameOf(teamB)} · ${teamB.class}`
                  : ""}
              </div>
              <div className="big-score">{formatScore(game.scoreB)}</div>
            </div>
          </div>
          <div className="team-stats">
            <div className="stat">
              <b>{publicStatusLabel(status)}</b>
              <span>Status</span>
            </div>
            <div className="stat">
              <b>{field?.name ?? game.fieldId}</b>
              <span>Field</span>
            </div>
            <div className="stat">
              <b>{round ? `Round ${round.number}` : game.roundId}</b>
              <span>Round</span>
            </div>
            <div className="stat">
              <b>{referee?.name ?? game.refereeTeamId}</b>
              <span>Referee team</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
