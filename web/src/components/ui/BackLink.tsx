import { WormLink } from "@/components/ui/WormLink";

// Кнопка «назад» у стилі проєкту: та сама квадратна рамка-черв'як, що й решта
// кнопок-посилань, лише компактніша. Стрілка трохи їде вліво на hover.
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <WormLink
      to={to}
      className="group gap-1.5 px-3 py-1 font-mono text-[0.7rem] font-semibold"
    >
      <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">
        ←
      </span>
      {label}
    </WormLink>
  );
}
