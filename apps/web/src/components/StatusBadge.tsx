import type { StatusTone } from '../lib/status';

export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span className={`status-badge status-badge--${tone}`} role="status">
      {label}
    </span>
  );
}
