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
