import { Link } from "react-router-dom";
import { useMarkNotificationsRead, useNotifications } from "@/api/hooks";
import type { Notification, NotificationType } from "@/api/types";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn, formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { stagger } from "@/lib/motion";
import type { CSSProperties } from "react";

// Емблема типу сповіщення — маленький квадратний тайл із гліфом (inline SVG).
function TypeEmblem({ type }: { type: NotificationType }) {
  const t = useT();
  const base =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border";
  switch (type) {
    case "unlock":
      return (
        <div
          className={cn(base, "border-done/40 bg-done/10 text-done")}
          title={t("notif.type.unlock")}
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
            <path
              d="M4 10.5 8.2 15 16 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
    case "rare":
      return (
        <div
          className={cn(base, "border-gold/50 bg-gold/10 text-gold shadow-gold")}
          title={t("notif.type.rare")}
        >
          <span className="text-lg leading-none">✦</span>
        </div>
      );
    case "roadmap":
      return (
        <div
          className={cn(base, "border-accent/40 bg-accent/10 text-accent")}
          title={t("notif.type.roadmap")}
        >
          {/* Гліф маршруту: дві точки, з'єднані шляхом */}
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
            <circle cx="5" cy="15" r="2" fill="currentColor" />
            <circle cx="15" cy="5" r="2" fill="currentColor" />
            <path
              d="M5 13V9a3 3 0 0 1 3-3h4a3 3 0 0 0 3-3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray="2.5 2.5"
            />
          </svg>
        </div>
      );
    case "almost":
      return (
        <div
          className={cn(base, "border-rare/50 bg-rare/10 text-rare")}
          title={t("notif.type.almost")}
        >
          {/* Гліф прицілу: ціль зовсім поруч */}
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
            <circle cx="10" cy="10" r="5.5" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="10" cy="10" r="1.6" fill="currentColor" />
            <path
              d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );
    case "milestone":
      return (
        <div
          className={cn(base, "border-gold/50 bg-gold/10 text-gold")}
          title={t("notif.type.milestone")}
        >
          {/* Гліф кубка: досягнутий рубіж */}
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
            <path
              d="M6 3h8v4a4 4 0 0 1-8 0V3Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M6 4H3.5v1.5A2.5 2.5 0 0 0 6 8M14 4h2.5v1.5A2.5 2.5 0 0 1 14 8M10 11v3m-3 3h6m-6 0 .8-3h4.4l.8 3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
    case "system":
      return (
        <div
          className={cn(base, "border-line bg-raised text-muted")}
          title={t("notif.type.system")}
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
            <path
              d="M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0-4.5.9 2.3c.5.1 1 .3 1.4.6l2.3-1 1.5 1.5-1 2.3c.3.4.5.9.6 1.4L18 10l-2.3.9c-.1.5-.3 1-.6 1.4l1 2.3-1.5 1.5-2.3-1c-.4.3-.9.5-1.4.6L10 18l-.9-2.3c-.5-.1-1-.3-1.4-.6l-2.3 1-1.5-1.5 1-2.3a4.9 4.9 0 0 1-.6-1.4L2 10l2.3-.9c.1-.5.3-1 .6-1.4l-1-2.3 1.5-1.5 2.3 1c.4-.3.9-.5 1.4-.6L10 2Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
  }
}

function NotificationRow({
  n,
  onRead,
  style,
}: {
  n: Notification;
  onRead: (id: string) => void;
  style?: CSSProperties;
}) {
  const t = useT();
  return (
    <div
      style={style}
      role={n.read ? undefined : "button"}
      tabIndex={n.read ? undefined : 0}
      onClick={() => {
        if (!n.read) onRead(n.id);
      }}
      onKeyDown={(e) => {
        if (!n.read && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onRead(n.id);
        }
      }}
      className={cn(
        "panel animate-rise relative flex items-start gap-4 p-4 transition-colors duration-200",
        n.read
          ? "opacity-60"
          : "cursor-pointer border-l-2 border-l-accent bg-accent/[0.06] hover:bg-accent/10"
      )}
    >
      <TypeEmblem type={n.type} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display font-semibold tracking-tight">
            {n.title}
          </h3>
          {!n.read && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-glow"
              aria-label={t("notif.unread")}
            />
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted">{n.body}</p>
        <div className="mt-2 font-mono text-[0.68rem] uppercase tracking-wider text-muted">
          {formatDate(n.createdAt)}
          {n.gameName && (
            <>
              {" · "}
              {n.appId != null ? (
                <Link
                  to={`/game/${n.appId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-ink transition-colors hover:text-accent hover:underline"
                >
                  {n.gameName}
                </Link>
              ) : (
                <span>{n.gameName}</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const t = useT();
  const notifications = useNotifications();
  const markRead = useMarkNotificationsRead();

  if (notifications.isLoading) return <PageLoader label={t("notif.loading")} />;
  if (notifications.isError || !notifications.data)
    return <ErrorState onRetry={() => notifications.refetch()} />;

  const items = notifications.data;
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow text-accent">{t("notif.eyebrow")}</div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {t("notif.title")}
            </h1>
            {unread > 0 && (
              <span className="rounded-md border border-accent/50 bg-accent/15 px-2 py-0.5 font-mono text-xs font-medium tabular-nums text-accent">
                {unread} {t("notif.new")}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={unread === 0 || markRead.isPending}
          onClick={() => markRead.mutate(undefined)}
          className="rounded-lg border border-accent/60 px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent transition-[background-color,border-color,box-shadow] duration-200 hover:bg-accent/15 hover:shadow-glow active:translate-y-px disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:shadow-none disabled:hover:bg-transparent"
        >
          {markRead.isPending ? t("notif.wait") : t("notif.markAll")}
        </button>
      </header>

      {items.length === 0 ? (
        <div className="panel p-10 text-center">
          <div className="eyebrow mb-2">{t("notif.empty")}</div>
          <p className="text-sm text-muted">
            {t("notif.emptyBody")}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((n, i) => (
            <NotificationRow
              key={n.id}
              n={n}
              onRead={(id) => markRead.mutate([id])}
              style={stagger(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
