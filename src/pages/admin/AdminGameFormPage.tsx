import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAdminData } from "../../features/admin/useAdminData";
import { useTournamentState, useTournamentStore } from "../../state/store";
import {
  createTeacherGame,
  updateTeacherGame,
  validateTeacherGameInput,
  type TeacherGameInput,
} from "../../api/teacher/games";
import { TeacherApiError } from "../../api/teacher/errors";
import { LoadingState } from "../../components/LoadingState/LoadingState";
import { ErrorState } from "../../components/ErrorState/ErrorState";
import { Button } from "../../components/Button/Button";

// Create + edit game (admin doc §8). Validation runs client-side first
// (teamA ≠ teamB, referee distinct, integer scores ≥ 0, referee options
// filtered); the backend remains authoritative and its message wins.
export function AdminGameFormPage({ mode }: { mode: "create" | "edit" }) {
  const { status, error, retry } = useAdminData();
  const state = useTournamentState();
  const store = useTournamentStore();
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();

  const existing =
    mode === "edit" && gameId
      ? (state.games.get(decodeURIComponent(gameId)) ?? null)
      : null;

  const teams = useMemo(
    () =>
      [...state.teams.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [state.teams],
  );
  const rounds = useMemo(
    () => [...state.rounds.values()].sort((a, b) => a.number - b.number),
    [state.rounds],
  );
  const fields = useMemo(
    () =>
      [...state.fields.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [state.fields],
  );

  const [roundId, setRoundId] = useState(existing?.roundId ?? "");
  const [fieldId, setFieldId] = useState(existing?.fieldId ?? "");
  const [teamAId, setTeamAId] = useState(existing?.teamAId ?? "");
  const [teamBId, setTeamBId] = useState(existing?.teamBId ?? "");
  const [refereeTeamId, setRefereeTeamId] = useState(existing?.refereeTeamId ?? "");
  const [scoreA, setScoreA] = useState(existing ? String(existing.scoreA) : "0");
  const [scoreB, setScoreB] = useState(existing ? String(existing.scoreB) : "0");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Invalid referee choices are filtered out of the dropdown.
  const refereeOptions = useMemo(
    () => teams.filter((t) => t.teamId !== teamAId && t.teamId !== teamBId),
    [teams, teamAId, teamBId],
  );

  if (status === "loading") {
    return (
      <section className="page page--with-bottom-nav" aria-label="Game form">
        <LoadingState label="Loading…" />
      </section>
    );
  }
  if (status === "error") {
    return (
      <section className="page page--with-bottom-nav" aria-label="Game form">
        <ErrorState message={error ?? "Could not load."} onRetry={retry} />
      </section>
    );
  }
  if (mode === "edit" && !existing) {
    return (
      <section className="page page--with-bottom-nav" aria-label="Game form">
        <ErrorState notFound message="Game not found." />
      </section>
    );
  }

  async function submit() {
    // Scores default to 0 : 0 (admin doc §8) and MUST be integers ≥ 0.
    const toScore = (s: string): number => Number(s);
    const input: TeacherGameInput = {
      roundId,
      fieldId,
      teamAId,
      teamBId,
      refereeTeamId,
      scoreA: toScore(scoreA),
      scoreB: toScore(scoreB),
    };
    const invalid = validateTeacherGameInput(input);
    if (invalid) {
      setFormError(invalid);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (mode === "create") {
        const created = await createTeacherGame(input);
        store.upsertGame(created);
        setCreatedId(created.gameId);
      } else if (existing) {
        const saved = await updateTeacherGame(existing.gameId, input);
        store.upsertGame(saved);
        navigate("/admin/games");
      }
    } catch (e) {
      // 409/400 show the backend message and preserve the form.
      setFormError(
        e instanceof TeacherApiError
          ? `${e.code}: ${e.message}`
          : e instanceof Error
            ? e.message
            : "Save failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (createdId) {
    return (
      <section className="page page--with-bottom-nav" aria-label="Game created">
        <p className="text-body">Game created successfully.</p>
        <Button variant="primary" onClick={() => navigate(`/admin/games/${encodeURIComponent(createdId)}/score`)}>
          Open Score
        </Button>{" "}
        <Button variant="secondary" onClick={() => navigate("/admin/games")}>
          Back to Games
        </Button>
      </section>
    );
  }

  return (
    <section className="page page--with-bottom-nav" aria-label="Game form">
      <header className="page-header">
        <h1 className="text-page-title">
          {mode === "create" ? "Create game" : "Edit game"}
        </h1>
      </header>
      <div className="page-content">
        <div className="form-grid">
          <label className="field">
            <span className="label">Round</span>
            <select className="select" aria-label="Round" value={roundId} onChange={(e) => setRoundId(e.target.value)}>
              <option value="">Select...</option>
              {rounds.map((r) => (
                <option key={r.roundId} value={r.roundId}>Round {r.number}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Field</span>
            <select className="select" aria-label="Field" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
              <option value="">Select...</option>
              {fields.map((f) => (
                <option key={f.fieldId} value={f.fieldId}>{f.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Team A</span>
            <select className="select" aria-label="Team A" value={teamAId} onChange={(e) => setTeamAId(e.target.value)}>
              <option value="">Select...</option>
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>{t.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Team B</span>
            <select className="select" aria-label="Team B" value={teamBId} onChange={(e) => setTeamBId(e.target.value)}>
              <option value="">Select...</option>
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>{t.name}</option>
              ))}
            </select>
          </label>
          <label className="field full">
            <span className="label">Referee Team</span>
            <select className="select" aria-label="Referee Team" value={refereeTeamId} onChange={(e) => setRefereeTeamId(e.target.value)}>
              <option value="">Select...</option>
              {refereeOptions.map((t) => (
                <option key={t.teamId} value={t.teamId}>{t.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Initial Score A</span>
            <input className="input" aria-label="Initial Score A" type="number" min={0} step={1} value={scoreA} placeholder="0" onChange={(e) => setScoreA(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Initial Score B</span>
            <input className="input" aria-label="Initial Score B" type="number" min={0} step={1} value={scoreB} placeholder="0" onChange={(e) => setScoreB(e.target.value)} />
          </label>
        </div>
        {formError ? <p role="alert" className="text-body">{formError}</p> : null}
        <div style={{ marginTop: 18 }}>
          <Button variant="primary" block onClick={() => void submit()} loading={saving}>
            {mode === "create" ? "Create Game" : "Save"}
          </Button>
        </div>
        <div className="btn-row" style={{ marginTop: 10 }}>
          <Button variant="secondary" onClick={() => navigate("/admin/games")} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </section>
  );
}
