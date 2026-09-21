/**
 * Utility functions for human-readable relative time formatting matching Claude's aesthetic.
 */

export function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  let parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  parsed = new Date(dateStr + 'Z');
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

export function formatRelativeTime(dateStr?: string): string {
  const parsed = parseDate(dateStr);
  if (!parsed) return '';

  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (parsed.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric';
  }
  return parsed.toLocaleDateString(undefined, options);
}

export function formatShortRelativeTime(dateStr?: string): string {
  const parsed = parseDate(dateStr);
  if (!parsed) return '';

  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return '1d';
  if (diffDays < 7) return `${diffDays}d`;

  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
