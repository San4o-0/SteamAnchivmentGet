import { useUnlock } from "@/api/hooks";
import { cn } from "@/lib/format";
import { Spinner } from "./Spinner";

interface Props {
  appId: number;
  ids: string[];
  unlocked?: boolean;
  label?: string;
  size?: "sm" | "md";
  className?: string;
  onDone?: () => void;
}

// Стани: idle → loading → done | error. Часткова невдача (ok:false з
// per-id results) теж показується як error.
export function UnlockButton({
  appId,
  ids,
  unlocked = false,
  label = "Unlock",
  size = "md",
  className,
  onDone,
}: Props) {
  const mutation = useUnlock(appId);

  const sizing =
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  if (unlocked) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-done/30 bg-done/10 font-mono font-medium uppercase tracking-wider text-done",
          sizing,
          className,
        )}
      >
        <CheckIcon /> Unlocked
      </span>
    );
  }

  const partialFail =
    mutation.isSuccess && mutation.data && !mutation.data.ok;
  const isError = mutation.isError || partialFail;
  const isDone = mutation.isSuccess && mutation.data?.ok;

  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-mono font-semibold uppercase tracking-wider transition-all duration-150 disabled:cursor-not-allowed";

  if (isDone) {
    return (
      <span
        className={cn(
          base,
          sizing,
          "border border-done/40 bg-done/15 text-done",
          className,
        )}
      >
        <CheckIcon /> Done
      </span>
    );
  }

  return (
    <div className={cn("inline-flex flex-col items-end gap-1", className)}>
      <button
        type="button"
        disabled={mutation.isPending}
        onClick={() =>
          mutation.mutate(ids, {
            onSuccess: (data) => {
              if (data.ok) onDone?.();
            },
          })
        }
        className={cn(
          base,
          sizing,
          isError
            ? "border border-danger/50 bg-danger/10 text-danger hover:bg-danger/20"
            : "border border-accent/50 bg-accent/15 text-accent hover:border-accent hover:bg-accent/25 active:translate-y-px",
        )}
      >
        {mutation.isPending ? (
          <>
            <Spinner /> Unlocking…
          </>
        ) : isError ? (
          <>
            <RetryIcon /> Повторити
          </>
        ) : (
          <>
            <LockIcon /> {label}
          </>
        )}
      </button>
      {isError && (
        <span className="max-w-[16rem] text-right text-[0.68rem] leading-tight text-danger/90">
          {partialFail
            ? mutation.data?.error
            : "Агент не відповів. Спробуйте ще раз."}
        </span>
      )}
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 10V7a5 5 0 0110 0v3m-11 0h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12a8 8 0 018-8 8 8 0 016.9 4M20 4v4h-4M20 12a8 8 0 01-8 8 8 8 0 01-6.9-4M4 20v-4h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
