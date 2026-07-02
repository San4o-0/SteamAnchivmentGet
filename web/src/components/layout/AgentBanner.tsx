import { useAgentHealth } from "@/api/hooks";

const DOWNLOAD_URL = import.meta.env.VITE_AGENT_DOWNLOAD_URL;

export function AgentBanner() {
  const { data, isError, isLoading } = useAgentHealth();

  if (isLoading) return null;

  const offline = isError || !data;
  const steamDown = data && !data.steamRunning;

  if (!offline && !steamDown) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-danger/30 bg-danger/10 px-6 py-2.5 text-sm text-danger"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger/60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
      </span>
      {offline ? (
        <span>
          Локальний агент не запущений. Завантаж і запусти застосунок-агент, щоб
          розблоковувати ачивки.
        </span>
      ) : (
        <span>
          Агент працює, але Steam не запущено. Відкрий Steam і зайди в акаунт.
        </span>
      )}

      {offline && DOWNLOAD_URL && (
        <a
          href={DOWNLOAD_URL}
          download
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-danger/50 bg-danger/10 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-danger transition-colors hover:bg-danger/20"
        >
          <DownloadIcon /> Завантажити агент
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
