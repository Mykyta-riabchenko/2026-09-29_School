import { useEffect, useState } from "react";
import { getFields, getGames, getTeams } from "../api/client";
import { useTournamentState, useTournamentStore } from "../state/store";
import { statusLabel } from "../components/status";

export function FieldsPage() {
  const store = useTournamentStore();
  const state = useTournamentState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [games, teams, fields] = await Promise.all([getGames(), getTeams(), getFields()]);
        if (cancelled) return;
        store.setGames(games);
        store.setTeams(teams);
        store.setFields(fields);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load fields.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store, attempt]);

  if (loading) return <p role="status">Loading fields…</p>;
  if (error)
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </button>
      </div>
    );
  const games = [...state.games.values()];
  const fields = [...state.fields.values()];
  if (fields.length === 0) {
    return (
      <section aria-label="Fields">
        <h1>Fields</h1>
        <p>No fields yet.</p>
      </section>
    );
  }
  return (
    <section aria-label="Fields">
      <h1>Fields</h1>
      <ul>
        {[...state.fields.values()].map((f) => {
          const current = games.find((g) => g.fieldId === f.fieldId && g.status === "RUNNING") ?? null;
          return (
            <li key={f.fieldId}>
              {f.name} ·{" "}
              {current
                ? `${state.teams.get(current.teamAId)?.name ?? current.teamAId} ${current.scoreA}:${current.scoreB} ${state.teams.get(current.teamBId)?.name ?? current.teamBId} · ${statusLabel(current.status)}`
                : "Free"}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
