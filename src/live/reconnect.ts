// Reconnect backoff (doc §6): 1s → 2s → 4s → 8s → 16s → max 30s.
// Pure function so it is trivially unit-testable.

export const RECONNECT_STEPS_MS = [1000, 2000, 4000, 8000, 16000, 30000];
export const MAX_RECONNECT_DELAY_MS = 30000;

export function getReconnectDelay(attempt: number): number {
  if (attempt < 0) return RECONNECT_STEPS_MS[0];
  if (attempt < RECONNECT_STEPS_MS.length) return RECONNECT_STEPS_MS[attempt];
  return MAX_RECONNECT_DELAY_MS;
}
