interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Не вдалося завантажити",
  message = "Перевір з'єднання з бекендом і спробуй ще раз.",
  onRetry,
}: Props) {
  return (
    <div className="panel grid place-items-center gap-3 p-12 text-center">
      <span className="text-3xl">⚠️</span>
      <p className="font-display text-lg">{title}</p>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-lg border border-accent/50 bg-accent/15 px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:bg-accent/25"
        >
          Спробувати ще раз
        </button>
      )}
    </div>
  );
}
