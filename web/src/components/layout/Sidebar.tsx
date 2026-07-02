import { NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/api/hooks";
import { clearToken } from "@/lib/auth";
import { cn } from "@/lib/format";
import { useT } from "@/lib/i18n";

const nav = [
  { to: "/dashboard", key: "nav.dashboard", icon: DashIcon },
  { to: "/library", key: "nav.library", icon: GridIcon },
  { to: "/statistics", key: "nav.statistics", icon: ChartIcon },
  { to: "/leaderboard", key: "nav.leaderboard", icon: TrophyIcon },
  { to: "/settings", key: "nav.settings", icon: GearIcon },
];

export function Sidebar() {
  const t = useT();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  function onLogout() {
    clearToken();
    queryClient.clear();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line/70 bg-surface/60">
      <div className="flex items-center gap-3 border-b border-line/40 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-md border border-accent/50 bg-accent/15 text-accent shadow-glow glow-gold">
          ◆
        </span>
        <div className="leading-tight">
          <div className="font-display text-xl font-bold tracking-tight text-ink">
            ACHIVO
          </div>
          <div className="eyebrow mt-0.5 tracking-[0.24em] text-accent/80">
            {t("brand.tag")}
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-4">
        {nav.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? // glow-soft: повільне «дихання» аури активного пункту.
                    "glow-soft border border-accent/40 bg-accent/15 text-accent shadow-glow"
                  : "border border-transparent text-muted hover:bg-raised/60 hover:text-ink",
              )
            }
          >
            <Icon />
            {t(key)}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-2 p-3">
        {me && (
          <div className="panel flex items-center gap-3 p-3">
            <img
              src={me.avatar}
              alt=""
              className="h-9 w-9 rounded-md border border-accent/30 bg-raised"
            />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold text-ink">
                {me.name}
              </div>
              <div className="truncate font-mono text-[0.65rem] text-muted">
                {me.steamId}
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="group flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-sm font-medium text-muted transition-all hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
        >
          <LogoutIcon />
          {t("nav.logout")}
        </button>
      </div>
    </aside>
  );
}

function DashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 4h12v4a6 6 0 01-12 0V4zM6 6H3v1a3 3 0 003 3M18 6h3v1a3 3 0 01-3 3M9 20h6M12 14v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4l2.1 2.1M2 12h3m14 0h3M4.2 19.8l2.1-2.1m11.4-11.4l2.1-2.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
