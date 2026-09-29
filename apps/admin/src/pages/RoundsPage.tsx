import { useState } from "react";
import { createRound, deleteRound, generateConsolation, generateKnockout, generateRoundRobin, updateRound } from "../api/client";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";

export function RoundsPage() {
  const { status, error, retry, refresh } = useAdminData();
  const state = useAdminState();
  const [number, setNumber] = useState(1);
  const [opError, setOpError] = useState<string | null>(null);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  if (status === "loading") return <p role="status">Loading rounds…</p>;
  if (status === "error")
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" onClick={retry}>
          Retry
        </button>
      </div>
    );

  async function run(kind: "round-robin" | "knockout" | "consolation", roundId: string) {
    if (generatingId) return;
    setGenMsg(null);
    setOpError(null);
    setGeneratingId(roundId + kind);
    try {
      const games =
        kind === "round-robin"
          ? await generateRoundRobin(roundId)
          : kind === "knockout"
            ? await generateKnockout(roundId)
            : await generateConsolation(roundId);
      setGenMsg(`Generated ${games.length} games (${kind}).`);
      await refresh();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGeneratingId(null);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isInteger(number) || number <= 0) {
      setOpError("Round number must be an integer greater than 0.");
      return;
    }
    setSaving(true);
    setOpError(null);
    try {
      await createRound(number);
      setGenMsg(null);
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onEdit(roundId: string, current: number) {
    const next = window.prompt("Round number", String(current));
    if (next === null) return;
    const parsed = Number(next);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setOpError("Round number must be an integer greater than 0.");
      return;
    }
    try {
      await updateRound(roundId, parsed);
      setOpError(null);
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Update failed.");
    }
  }

  async function onDelete(roundId: string) {
    if (!window.confirm("Delete round?")) return;
    try {
      await deleteRound(roundId);
      setOpError(null);
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const rounds = [...state.rounds.values()].sort((a, b) => a.number - b.number);

  return (
    <section aria-label="Manage rounds">
      <h1>Rounds</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onCreate(e);
        }}
      >
        <input
          aria-label="Round number"
          type="number"
          min={1}
          step={1}
          required
          value={number}
          onChange={(e) => setNumber(e.target.value === "" ? 0 : Number(e.target.value))}
        />
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create"}
        </button>
      </form>
      {opError ? <p role="alert">{opError}</p> : null}
      {genMsg ? <p role="status">{genMsg}</p> : null}
      {rounds.length === 0 ? <p>No rounds yet. Create the first round above.</p> : null}
      <ul>
        {rounds.map((r) => (
          <li key={r.roundId}>
            Round {r.number}{" "}
            <button type="button" disabled={generatingId !== null} onClick={() => void run("round-robin", r.roundId)}>
              Generate round-robin
            </button>{" "}
            <button type="button" disabled={generatingId !== null} onClick={() => void run("knockout", r.roundId)}>
              Generate knockout
            </button>{" "}
            <button type="button" disabled={generatingId !== null} onClick={() => void run("consolation", r.roundId)}>
              Generate consolation
            </button>{" "}
            <button type="button" onClick={() => void onEdit(r.roundId, r.number)}>
              Edit
            </button>{" "}
            <button
              type="button"
              onClick={() => {
                void onDelete(r.roundId);
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
