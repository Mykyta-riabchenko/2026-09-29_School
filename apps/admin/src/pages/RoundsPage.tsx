import { useState } from "react";
import { createRound, deleteRound, generateConsolation, generateKnockout, generateRoundRobin, updateRound } from "../api/client";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminState } from "../state/store";
import { ConfirmDialog, Modal } from "../components/ui";

export function RoundsPage() {
  const { status, error, retry, refresh } = useAdminData();
  const state = useAdminState();
  const [modal, setModal] = useState<{ id: string | null; number: number } | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (status === "loading") return <p role="status">Loading rounds…</p>;
  if (status === "error")
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" className="btn" onClick={retry}>
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

  async function onSave() {
    if (!modal) return;
    if (!Number.isInteger(modal.number) || modal.number <= 0) {
      setOpError("Round number must be an integer greater than 0.");
      return;
    }
    setSaving(true);
    try {
      if (modal.id) await updateRound(modal.id, modal.number);
      else await createRound(modal.number);
      setModal(null);
      setOpError(null);
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteConfirmed() {
    if (!deleteId) return;
    try {
      await deleteRound(deleteId);
      setDeleteId(null);
      setOpError(null);
      await refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const rounds = [...state.rounds.values()].sort((a, b) => a.number - b.number);
  const nextNumber = rounds.length > 0 ? Math.max(...rounds.map((r) => r.number)) + 1 : 1;

  return (
    <section aria-label="Manage rounds" className="view">
      <div className="head">
        <div>
          <div className="eyebrow">Turnierlogik</div>
          <h1>Runden</h1>
          <p className="muted">Runden verwalten und später für Paarungen verwenden.</p>
        </div>
        <button type="button" className="btn primary" onClick={() => { setOpError(null); setModal({ id: null, number: nextNumber }); }}>
          ＋ Runde
        </button>
      </div>
      {opError ? <p role="alert">{opError}</p> : null}
      {genMsg ? <p role="status">{genMsg}</p> : null}
      <div className="list">
        {rounds.length === 0 ? <div className="card empty">Noch keine Runden.</div> : null}
        {rounds.map((r) => (
          <div className="list-item" key={r.roundId}>
            <div className="list-main">
              <div className="list-title">Runde {r.number}</div>
              <div className="list-sub">{[...state.games.values()].filter((g) => g.roundId === r.roundId).length} Spiele</div>
            </div>
            <div className="actions">
              <button type="button" className="btn" disabled={generatingId !== null} onClick={() => void run("round-robin", r.roundId)}>
                Generate round-robin
              </button>
              <button type="button" className="btn" disabled={generatingId !== null} onClick={() => void run("knockout", r.roundId)}>
                Generate knockout
              </button>
              <button type="button" className="btn" disabled={generatingId !== null} onClick={() => void run("consolation", r.roundId)}>
                Generate consolation
              </button>
              <button type="button" className="btn" onClick={() => { setOpError(null); setModal({ id: r.roundId, number: r.number }); }}>
                Bearbeiten
              </button>
              <button type="button" className="btn danger" onClick={() => setDeleteId(r.roundId)}>
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>
      {modal ? (
        <Modal title={modal.id ? "Runde bearbeiten" : "Neue Runde"} onClose={() => setModal(null)}>
          <div className="form">
            <label>
              Nummer
              <input
                aria-label="Round number"
                type="number"
                min={1}
                step={1}
                value={modal.number}
                onChange={(e) => setModal({ ...modal, number: e.target.value === "" ? 0 : Number(e.target.value) })}
              />
            </label>
            {opError ? <p role="alert">{opError}</p> : null}
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setModal(null)}>
                Abbrechen
              </button>
              <button type="button" className="btn primary" disabled={saving} onClick={() => void onSave()}>
                {saving ? "Saving…" : "Speichern"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
      {deleteId ? (
        <ConfirmDialog
          title="Runde löschen?"
          message="Runde wirklich löschen? Nur möglich ohne zugeordnete Spiele."
          confirmLabel="Löschen"
          onCancel={() => setDeleteId(null)}
          onConfirm={() => void onDeleteConfirmed()}
        />
      ) : null}
    </section>
  );
}
