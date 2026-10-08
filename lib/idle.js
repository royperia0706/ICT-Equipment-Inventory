export const IDLE_MS = 15 * 60 * 1000;

export function idleExpired(session, now = Date.now()) {
  if (!session?.username) return false;
  const activeAt = Number(session.activeAt) || 0;
  if (!activeAt) return false;
  return now - activeAt >= IDLE_MS;
}
