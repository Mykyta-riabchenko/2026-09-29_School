import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createGame, validateGameInput, type GameInput } from "../api/client";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";

export function GameCreatePage() {
  const { status } = useAdminData();
  const state = useAdminState();
  const navigate = useNavigate();
  const [form, setForm] = useState<GameInput>({
    roundId: "",
    fieldId: "",
    teamAId: "",
    teamBId: "",
    refereeTeamId: "",
    scoreA: 0,
    scoreB: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (status === "loading") return <p>Loading…</p>;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validateGameInput(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createGame(form);
      navigate(`/games/${encodeURIComponent(created.gameId)}/score`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof GameInput>(key: K, value: GameInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <section aria-label="Create game">
      <Link to="/games">Back</Link>
      <h1>Create game</h1>
      <form onSubmit={(e) => void onSubmit(e)}>
        <label>
          Round{" "}
          <select value={form.roundId} onChange={(e) => set("roundId", e.target.value)}>
            <option value="">Select</option>
            {[...state.rounds.values()].map((r) => (
              <option key={r.roundId} value={r.roundId}>
                Round {r.number}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          Field{" "}
          <select value={form.fieldId} onChange={(e) => set("fieldId", e.target.value)}>
            <option value="">Select</option>
            {[...state.fields.values()].map((f) => (
              <option key={f.fieldId} value={f.fieldId}>
                {f.name}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          Team A{" "}
          <select value={form.teamAId} onChange={(e) => set("teamAId", e.target.value)}>
            <option value="">Select</option>
            {[...state.teams.values()].map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.name}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          Team B{" "}
          <select value={form.teamBId} onChange={(e) => set("teamBId", e.target.value)}>
            <option value="">Select</option>
            {[...state.teams.values()].map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.name}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          Referee{" "}
          <select value={form.refereeTeamId} onChange={(e) => set("refereeTeamId", e.target.value)}>
            <option value="">Select</option>
            {[...state.teams.values()].map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.name}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          Score A <input type="number" min={0} value={form.scoreA} onChange={(e) => set("scoreA", Number(e.target.value))} />
        </label>{" "}
        <label>
          Score B <input type="number" min={0} value={form.scoreB} onChange={(e) => set("scoreB", Number(e.target.value))} />
        </label>{" "}
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create"}
        </button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
