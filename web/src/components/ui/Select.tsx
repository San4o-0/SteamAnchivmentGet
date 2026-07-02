import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";

export interface SelectOption<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  /** Маленький префікс-лейбл ліворуч у тригері (uppercase eyebrow). */
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (id: T) => void;
  className?: string;
  /** Компактніший тригер (менше вертикального падінгу). */
  dense?: boolean;
}

// Кастомний listbox у стилі проекту — заміна нативному <select>, чий
// випадаючий список неможливо застилізувати (ОС малює його сама).
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  dense,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  // Активний (підсвічений з клавіатури) індекс, поки меню відкрите.
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedIdx = Math.max(0, options.findIndex((o) => o.id === value));
  const current = options[selectedIdx]?.label ?? "";

  // Відкриваючись, ставимо активним поточний вибір.
  useEffect(() => {
    if (open) setActive(selectedIdx);
  }, [open, selectedIdx]);

  // Клік поза межами → закрити.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Тримаємо активний пункт у полі зору при навігації з клавіатури.
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function commit(idx: number) {
    const opt = options[idx];
    if (opt) onChange(opt.id);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => (i - 1 + options.length) % options.length);
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(active);
        break;
    }
  }

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md border bg-surface/60 pl-3 pr-2.5 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-ink transition-colors focus:shadow-glow focus:outline-none",
          dense ? "py-1.5" : "py-2",
          open
            ? "border-accent/60 shadow-glow"
            : "border-line/70 hover:border-accent/40 focus:border-accent/60",
        )}
      >
        <span className="text-[0.62rem] tracking-[0.14em] text-muted">
          {label}
        </span>
        <span className="min-w-0 flex-1 truncate text-left text-accent">
          {current}
        </span>
        <svg
          aria-hidden
          className={cn(
            "shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className="panel dropdown-in absolute right-0 z-30 mt-2 max-h-72 min-w-full overflow-auto p-1.5 shadow-glow"
        >
          {options.map((opt, i) => {
            const selected = opt.id === value;
            const isActive = i === active;
            return (
              <li
                key={opt.id}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 font-mono text-[0.72rem] uppercase tracking-[0.08em] transition-colors",
                  isActive ? "bg-raised/70" : "bg-transparent",
                  selected ? "text-accent" : "text-muted",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                    selected ? "bg-accent shadow-glow" : "bg-line",
                  )}
                />
                <span className="flex-1 truncate">{opt.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
