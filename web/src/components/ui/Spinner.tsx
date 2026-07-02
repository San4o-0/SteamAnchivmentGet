import { cn } from "@/lib/format";
import { useT } from "@/lib/i18n";

export function Spinner({ className }: { className?: string }) {
  const t = useT();
  return (
    <span
      role="status"
      aria-label={t("common.loading")}
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}

export function PageLoader({ label }: { label?: string }) {
  const t = useT();
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted">
      <Spinner className="h-6 w-6 text-accent" />
      <span className="font-mono text-xs uppercase tracking-widest">
        {label ?? t("common.loadingEllipsis")}
      </span>
    </div>
  );
}
