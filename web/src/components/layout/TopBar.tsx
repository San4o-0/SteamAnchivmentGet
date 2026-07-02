import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useMe, useNotifications } from "@/api/hooks";
import { clearToken } from "@/lib/auth";
import { cn } from "@/lib/format";
import { useT } from "@/lib/i18n";

// Глобальний HUD-бар: дзвіночок сповіщень і чіп профілю.
// Пошук навмисно живе лише в Бібліотеці (там, де є що фільтрувати).
export function TopBar() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { data: notifications } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);

  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  function onLogout() {
    clearToken();
    queryClient.clear();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex items-center justify-end gap-4 border-b border-line/70 bg-surface/70 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <Link
          to="/notifications"
          aria-label={t("topbar.notifications")}
          className="relative grid h-9 w-9 place-items-center rounded-md border border-line/70 bg-raised/60 text-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          {/* Дзвіночок легенько «дзвонить» раз на ~6с лише коли є непрочитані */}
          <span className={unread > 0 ? "bell-swing" : "inline-flex"} aria-hidden>
            <BellIcon />
          </span>
          {unread > 0 && (
            // key={unread}: зміна лічильника перемонтовує бейдж → pop-in.
            <span
              key={unread}
              className="badge-pop pointer-events-none absolute -right-1.5 -top-1.5 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-accent px-1 font-mono text-[0.62rem] font-bold leading-none text-white shadow-glow"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={cn(
              "flex items-center gap-2.5 rounded-md border px-2 py-1.5 transition-colors",
              menuOpen
                ? "border-accent/50 bg-accent/10 shadow-glow"
                : "border-line/70 bg-raised/60 hover:border-accent/40",
            )}
          >
            <img
              src={me?.avatar}
              alt=""
              className="h-7 w-7 rounded-md border border-accent/30 bg-raised object-cover"
            />
            <div className="hidden text-left leading-tight sm:block">
              <div className="max-w-[9rem] truncate text-xs font-semibold text-ink">
                {me?.name ?? "…"}
              </div>
              <div className="font-mono text-[0.6rem] uppercase tracking-wider text-accent/80">
                {t("topbar.sessionActive")}
              </div>
            </div>
            <ChevronIcon />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div
                role="menu"
                className="panel absolute right-0 z-20 mt-2 w-48 p-1.5 shadow-glow"
              >
                <Link
                  to="/settings"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-raised/60 hover:text-ink"
                >
                  <GearIcon /> {t("topbar.settings")}
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={onLogout}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <LogoutIcon /> {t("topbar.logout")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="text-muted">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4l2.1 2.1M2 12h3m14 0h3M4.2 19.8l2.1-2.1m11.4-11.4l2.1-2.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 12H4m0 0l3.5-3.5M4 12l3.5 3.5M14 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
