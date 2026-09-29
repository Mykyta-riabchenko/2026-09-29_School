// Scoreboard numbers (style doc §16): strong tabular numerals that
// stay visually stable on live updates. The leader gets the navy
// winner colour; the trailer is muted. Draws are neutral.
export function Score({
  scoreA,
  scoreB,
}: {
  scoreA: number;
  scoreB: number;
}) {
  const aClass =
    scoreA > scoreB ? "score--winner" : scoreA < scoreB ? "score--loser" : "";
  const bClass =
    scoreB > scoreA ? "score--winner" : scoreB < scoreA ? "score--loser" : "";
  return (
    <div
      className="score"
      role="status"
      aria-label={`Score ${scoreA} to ${scoreB}`}
    >
      <span className={aClass}>{scoreA}</span>
      <span className="score-sep" aria-hidden="true">
        :
      </span>
      <span className={bClass}>{scoreB}</span>
    </div>
  );
}
