/**
 * The single error-display primitive: every feature (save conflicts, generation failures,
 * network errors) renders its already-parsed message through this component instead of a
 * bespoke banner per feature.
 */
export function ErrorBanner({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="error-banner" role="alert">
      <span className="error-banner__message">{message}</span>
      {actionLabel && onAction ? (
        <button type="button" className="error-banner__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
