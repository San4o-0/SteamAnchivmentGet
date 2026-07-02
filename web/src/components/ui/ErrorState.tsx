import { useT } from "@/lib/i18n";

interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, onRetry }: Props) {
  const t = useT();
  const displayTitle = title ?? t("common.errorTitle");
  const displayMessage = message ?? t("common.errorMessage");
  return (
    <div className="panel grid place-items-center gap-3 p-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-md border border-danger/40 bg-danger/10 text-2xl text-danger shadow-[inset_0_0_0_1px_rgba(230,76,76,0.15)]">
        ⚠
      </span>
      <p className="font-display text-lg font-semibold text-ink">{displayTitle}</p>
      <p className="max-w-sm text-sm text-muted">{displayMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-md border border-accent/60 bg-accent/20 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent transition-all hover:bg-accent/30 hover:shadow-glow"
        >
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
