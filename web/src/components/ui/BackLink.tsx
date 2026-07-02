import { Link } from "react-router-dom";

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-muted transition-colors hover:text-accent"
    >
      <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">
        ←
      </span>{" "}
      {label}
    </Link>
  );
}
