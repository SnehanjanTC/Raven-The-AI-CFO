/** Format a number as currency */
export function formatCurrency(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  }
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

/** Get relative time string from ISO timestamp */
export function getTimeAgo(timestamp: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

/** Generate a short random ID */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
