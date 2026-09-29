import { Button } from "../Button/Button";

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  notFound = false,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  notFound?: boolean;
}) {
  return (
    <div role="alert" className="state state-error">
      <h2 className="text-section-title">{notFound ? "Not found" : title}</h2>
      {message ? <p className="text-body">{message}</p> : null}
      {onRetry && !notFound ? (
        <Button variant="primary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
