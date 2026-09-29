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

  if (status === "loading") return <p>Loading rounds…</p>;
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
    setGenMsg(null);
    setOpError(null);
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
    }
  }

  return (
    <section aria-label="Manage rounds">
      <h1>Rounds</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void createRound(number).then(() => refresh());
        }}
      >
        <input aria-label="Round number" type="number" value={number} onChange={(e) => setNumber(Number(e.target.value))} />
        <button type="submit">Create</button>
      </form>
      {opError ? <p role="alert">{opError}</p> : null}
      {genMsg ? <p role="status">{genMsg}</p> : null}
      <ul>
        {[...state.rounds.values()]
          .sort((a, b) => a.number - b.number)
          .map((r) => (
            <li key={r.roundId}>
              Round {r.number}{" "}
              <button type="button" onClick={() => void run("round-robin", r.roundId)}>
                Generate round-robin
              </button>{" "}
              <button type="button" onClick={() => void run("knockout", r.roundId)}>
                Generate knockout
              </button>{" "}
              <button type="button" onClick={() => void run("consolation", r.roundId)}>
                Generate consolation
              </button>{" "}
              <button
                type="button"
                onClick={() => {
                  const next = window.prompt("Round number", String(r.number));
                  if (next) void updateRound(r.roundId, Number(next)).then(() => refresh());
                }}
              >
                Edit
              </button>{" "}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Delete round?")) void deleteRound(r.roundId).then(() => refresh());
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
