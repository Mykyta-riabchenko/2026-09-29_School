import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createGame, validateGameInput, type GameInput } from "../api/client";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";

export function GameCreatePage() {
  const { status, error, retry } = useAdminData();
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
  const [errorMsg, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (status === "loading") return <p role="status">Loading…</p>;
  if (status === "error")
    return (
      <div>
        <p role="alert">{error ?? "Could not load form data."}</p>
        <button type="button" onClick={retry}>
          Retry
        </button>
      </div>
    );

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
      <Link to="/games" aria-label="Back to games">
        Back
      </Link>
      <h1>Create game</h1>
      <form onSubmit={(e) => void onSubmit(e)}>
        <label>
          Round{" "}
          <select required value={form.roundId} onChange={(e) => set("roundId", e.target.value)}>
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
          <select required value={form.fieldId} onChange={(e) => set("fieldId", e.target.value)}>
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
          <select required value={form.teamAId} onChange={(e) => set("teamAId", e.target.value)}>
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
          <select required value={form.teamBId} onChange={(e) => set("teamBId", e.target.value)}>
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
          <select required value={form.refereeTeamId} onChange={(e) => set("refereeTeamId", e.target.value)}>
            <option value="">Select</option>
            {[...state.teams.values()].map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.name}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          Score A{" "}
          <input
            type="number"
            min={0}
            step={1}
            required
            value={form.scoreA}
            onChange={(e) => set("scoreA", e.target.value === "" ? 0 : Number(e.target.value))}
          />
        </label>{" "}
        <label>
          Score B{" "}
          <input
            type="number"
            min={0}
            step={1}
            required
            value={form.scoreB}
            onChange={(e) => set("scoreB", e.target.value === "" ? 0 : Number(e.target.value))}
          />
        </label>{" "}
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create"}
        </button>
      </form>
      {errorMsg ? <p role="alert">{errorMsg}</p> : null}
    </section>
  );
}
