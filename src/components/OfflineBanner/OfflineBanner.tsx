import { useState } from "react";
import { Button } from "../Button/Button";
import { Badge } from "../Badge/Badge";
import {
  formatCacheAge,
  loadTournamentCache,
} from "../../state/cache";

// Banner shown when the visible data comes from the persistent cache
// because the connection was lost. It MUST NOT replace the data —
// the cached list stays on screen underneath. Warning semantic
// tokens come from the shared system (style doc §25).
export function OfflineBanner({
  message,
  onRetry,
  liveStatus,
}: {
  message?: string | null;
  onRetry?: () => void;
  liveStatus?: string;
}) {
  // Read the cache timestamp lazily so the banner shows the age of
  // the data actually on screen.
  const [savedAt] = useState<string | null>(() => {
    try {
      return loadTournamentCache()?.savedAt ?? null;
    } catch {
      return null;
    }
  });

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <div className="offline-banner-text">
        <span>
          <Badge variant="warning">Cached</Badge>{" "}
          <strong>
            {liveStatus === "failed"
              ? "Live updates unavailable — showing cached data"
              : "Connection lost — showing cached data"}
          </strong>
        </span>
        <span className="text-body">
          {savedAt
            ? ` Last updated ${formatCacheAge(savedAt)}.`
            : " Last known data."}
          {message ? ` ${message}` : ""}
        </span>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
