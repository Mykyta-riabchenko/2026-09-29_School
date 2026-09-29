export function EmptyState({
  title = "Nothing here yet",
  hint,
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <div className="state state-empty">
      <h2 className="text-section-title">{title}</h2>
      {hint ? <p className="text-body">{hint}</p> : null}
    </div>
  );
}
