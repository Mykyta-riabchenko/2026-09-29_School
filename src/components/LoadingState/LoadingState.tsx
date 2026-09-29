// Skeleton loading mirrors the final card geometry (style doc §27)
// so content does not jump when data arrives.
export function LoadingState({
  label = "Loading…",
  cards = 3,
}: {
  label?: string;
  cards?: number;
}) {
  return (
    <div role="status" aria-live="polite" className="page-content">
      <span className="text-body">{label}</span>
      <div className="card-grid" aria-hidden="true">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="card">
            <div
              className="skeleton"
              style={{ height: 18, width: "55%", marginBottom: 12 }}
            />
            <div
              className="skeleton"
              style={{ height: 36, marginBottom: 8 }}
            />
            <div className="skeleton" style={{ height: 36 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
