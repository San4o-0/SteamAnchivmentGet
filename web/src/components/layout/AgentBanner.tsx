import { useAgentHealth } from "@/api/hooks";
import { useT } from "@/lib/i18n";
import { isWindows } from "@/lib/platform";
import { cn } from "@/lib/format";

const DOWNLOAD_URL = import.meta.env.VITE_AGENT_DOWNLOAD_URL;

export function AgentBanner() {
  const t = useT();
  const { data, isError, isLoading } = useAgentHealth();
  const win = isWindows();

  if (isLoading) return null;

  const offline = isError || !data;
  const steamDown = data && !data.steamRunning;

  if (!offline && !steamDown) return null;

  // На Linux/macOS агент фізично не запуститься — це не помилка юзера, тож
  // показуємо спокійне інфо (не червоний алярм) і БЕЗ кнопки завантаження
  // непрацюючого exe.
  const info = offline && !win;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 border-b px-6 py-2.5 text-sm shadow-[inset_0_-1px_0_rgba(0,0,0,0.3)]",
        info
          ? "border-line/60 bg-surface/70 text-muted"
          : "border-danger/40 bg-danger/10 text-danger",
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full",
            info ? "bg-accent/50" : "animate-ping bg-danger/60",
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            info ? "bg-accent" : "bg-danger",
          )}
        />
      </span>

      {steamDown ? (
        <span>{t("banner.steamDown")}</span>
      ) : info ? (
        <span>{t("banner.windowsOnly")}</span>
      ) : (
        <span>{t("banner.offline")}</span>
      )}

      {offline && win && DOWNLOAD_URL && (
        <a
          href={DOWNLOAD_URL}
          download
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-danger/50 bg-danger/10 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-danger transition-colors hover:bg-danger/20"
        >
          <DownloadIcon /> {t("banner.download")}
        </a>
      )}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
