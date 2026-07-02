import { NavLink } from "react-router-dom";
import { useMe } from "@/api/hooks";
import { cn } from "@/lib/format";

const nav = [
  { to: "/dashboard", label: "Дашборд", icon: DashIcon },
  { to: "/library", label: "Бібліотека", icon: GridIcon },
];

export function Sidebar() {
  const { data: me } = useMe();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line/70 bg-surface/40">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold/15 text-gold shadow-gold">
          ★
        </span>
        <div className="leading-tight">
          <div className="font-display text-lg font-bold tracking-wide">
            ACHIVO
          </div>
          <div className="font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted">
            100% tracker
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-2">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-raised/60 hover:text-ink",
              )
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-3">
        {me && (
          <div className="panel flex items-center gap-3 p-3">
            <img
              src={me.avatar}
              alt=""
              className="h-9 w-9 rounded-md border border-line bg-raised"
            />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-medium">{me.name}</div>
              <div className="truncate font-mono text-[0.65rem] text-muted">
                {me.steamId}
              </div>
            </div>
          </div>
        )}
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
