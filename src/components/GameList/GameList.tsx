import { Link } from "react-router-dom";
import { formatScore } from "../../domain/game";
import type { Game } from "../../domain/game";
import type { Team } from "../../domain/team";
import type { Field } from "../../domain/field";
import type { Round } from "../../domain/round";
import { Badge } from "../Badge/Badge";

export interface GameListLookups {
  teamsById: Map<string, Team>;
  fieldsById: Map<string, Field>;
  roundsById?: Map<string, Round>;
}

// Game view follows the §30 visual hierarchy: status, round/field
// metadata, Team A score, Team B score, referee/supporting info.
// Scores use tabular numerals so live updates stay stable (§16).
export function GameList({
  games,
  lookups,
}: {
  games: Game[];
  lookups: GameListLookups;
}) {
  return (
    <ul className="card-grid" aria-label="Games">
      {games.map((g) => {
        const teamA = lookups.teamsById.get(g.teamAId);
        const teamB = lookups.teamsById.get(g.teamBId);
        const referee = lookups.teamsById.get(g.refereeTeamId);
        const field = lookups.fieldsById.get(g.fieldId);
        const round = lookups.roundsById?.get(g.roundId);
        return (
          <li key={g.gameId} className="game-card">
            <div className="game-card__header">
              <Badge variant="neutral">
                {round ? `Round ${round.number}` : "Game"}
              </Badge>
              <Badge variant="neutral">
                {field?.name ?? g.fieldId}
              </Badge>
            </div>
            <div className="game-card__teams">
              <div className="game-card__team">
                <Link
                  className="game-card__team-name"
                  to={`/games/${encodeURIComponent(g.gameId)}`}
                >
                  {teamA?.name ?? g.teamAId}
                </Link>
                <span className="game-card__score">{formatScore(g.scoreA)}</span>
              </div>
              <div className="game-card__team">
                <span className="game-card__team-name">
                  {teamB?.name ?? g.teamBId}
                </span>
                <span className="game-card__score">{formatScore(g.scoreB)}</span>
              </div>
            </div>
            <div className="game-card__footer">
              <span>Referee: {referee?.name ?? g.refereeTeamId}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
