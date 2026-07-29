/**
 * Parse a backend timestamp. A value with no timezone is treated as UTC —
 * SQLite (local dev) serializes naive UTC timestamps without a zone, which the
 * browser would otherwise read as local time. Postgres sends an explicit
 * offset, which is respected.
 */
function parseTimestamp(iso: string): Date {
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso);
  return new Date(hasZone ? iso : `${iso}Z`);
}

/** Compact relative time, e.g. "just now", "5m ago", "3h ago", "2d ago". */
export function formatRelative(iso: string): string {
  const then = parseTimestamp(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((Date.now() - then) / 1000);

  if (diffSec < 45) return "just now";
  const mins = Math.round(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDate(iso: string): string {
  const d = parseTimestamp(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}
