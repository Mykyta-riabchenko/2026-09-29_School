import { useState } from "react";
import { createField, deleteField, updateField } from "../api/client";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";

export function FieldsPage() {
  const { status, error, retry, refresh } = useAdminData();
  const state = useAdminState();
  const [name, setName] = useState("");
  const [opError, setOpError] = useState<string | null>(null);

  if (status === "loading") return <p>Loading fields…</p>;
  if (status === "error")
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" onClick={retry}>
          Retry
        </button>
      </div>
    );

  return (
    <section aria-label="Manage fields">
      <h1>Fields</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void createField(name)
            .then(() => {
              setName("");
              return refresh();
            })
            .catch((err: unknown) => setOpError(err instanceof Error ? err.message : "Create failed."));
        }}
      >
        <input aria-label="Field name" value={name} onChange={(e) => setName(e.target.value)} placeholder="New field" />
        <button type="submit">Create</button>
      </form>
      {opError ? <p role="alert">{opError}</p> : null}
      <ul>
        {[...state.fields.values()].map((f) => {
          const live = [...state.games.values()].find((g) => g.fieldId === f.fieldId && g.status === "RUNNING");
          return (
            <li key={f.fieldId}>
              {f.name} · {live ? `Occupied (${live.scoreA}:${live.scoreB})` : "Free"}{" "}
              <button
                type="button"
                onClick={() => {
                  const next = window.prompt("Rename field", f.name);
                  if (next) void updateField(f.fieldId, next).then(() => refresh());
                }}
              >
                Rename
              </button>{" "}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Delete field?")) void deleteField(f.fieldId).then(() => refresh());
                }}
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
