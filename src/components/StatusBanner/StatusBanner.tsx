// Dark navy tournament status banner (style doc §8): primary
// information surface for the overview. Shows scheduled-rounds
// progress with the gold accent progress bar.

export function StatusBanner({
  title,
  subtitle,
  progressLabel,
  progressValue,
}: {
  title: string;
  subtitle?: string;
  progressLabel?: string;
  progressValue?: number;
}) {
  const clamped =
    typeof progressValue === "number"
      ? Math.min(1, Math.max(0, progressValue))
      : null;
  return (
    <div className="status-banner" role="status">
      <div className="status-banner__title">{title}</div>
      {subtitle ? (
        <div className="status-banner__subtitle">{subtitle}</div>
      ) : null}
      {clamped !== null ? (
        <>
          {progressLabel ? (
            <div className="status-banner__subtitle">{progressLabel}</div>
          ) : null}
          <div
            className="status-banner__progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clamped * 100)}
            aria-label={progressLabel ?? "Tournament progress"}
          >
            <div
              className="status-banner__progress-value"
              style={{ width: `${clamped * 100}%` }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
