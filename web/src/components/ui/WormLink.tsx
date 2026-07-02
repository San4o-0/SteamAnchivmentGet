import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/format";

// Кнопка-посилання з квадратною напівпрозорою акцентною рамкою, по якій біжить
// міні-«черв'ячок» (стилі .worm-* у index.css). Розмір/типографіку задає
// className, а рамку й колір тексту — сам компонент.
export function WormLink({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "worm-link inline-flex items-center justify-center uppercase tracking-wider text-accent",
        className,
      )}
    >
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      <svg className="worm-svg" aria-hidden="true">
        <rect className="worm-track" />
        <rect className="worm-crawler" />
      </svg>
    </Link>
  );
}
