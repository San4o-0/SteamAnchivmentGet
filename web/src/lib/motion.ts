import { useEffect, useRef, useState, type CSSProperties } from "react";

// Чи просить користувач мінімум руху — тоді всі JS-анімації одразу
// стрибають у фінальний стан (CSS глушиться глобальним media-override).
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Затримка для стаггер-входів (animate-rise + animationDelay). Індекс
// обрізається, щоб довгі списки не «в'їжджали» вічність.
export function stagger(index: number, stepMs = 40, cap = 12): CSSProperties {
  return { animationDelay: `${Math.min(index, cap) * stepMs}ms` };
}

// Число, що «набігає» до цілі через rAF з ease-out. При reduced-motion —
// одразу цільове значення. Анімує і наступні зміни цілі (від поточного).
export function useCountUp(
  target: number,
  opts: { duration?: number } = {},
): number {
  const duration = opts.duration ?? 700;
  const [value, setValue] = useState(() =>
    prefersReducedMotion() ? target : 0,
  );
  const fromRef = useRef(prefersReducedMotion() ? target : 0);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    if (prefersReducedMotion()) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const from = fromRef.current;
    if (from === target) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const v = from + (target - from) * eased;
      fromRef.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

// true через кадр після монтування — запускає CSS-transition до фінального
// стану (напр. заповнення ProgressBar). При reduced-motion — одразу true.
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setMounted(true);
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setMounted(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);
  return mounted;
}
