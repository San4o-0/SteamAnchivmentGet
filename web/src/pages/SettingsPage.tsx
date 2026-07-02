import { useEffect, useRef, useState } from "react";
import { useAgentHealth, useSettings, useUpdateSettings } from "@/api/hooks";
import { PageLoader, Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/lib/format";
import { useT } from "@/lib/i18n";
import {
  ACCENTS,
  applyAccent,
  applyBackground,
  applyLang,
  getAccent,
  getBackground,
  getLang,
  getTheme,
  isStored,
} from "@/lib/appearance";
import type {
  Settings,
  SettingsAccent,
  SettingsBackground,
  SettingsLanguage,
} from "@/api/types";

// Міні-прев'ю фонів — статичні CSS-градієнти, що передають характер сцени.
const BG_OPTIONS: {
  value: SettingsBackground;
  labelKey: string;
  preview: string;
}[] = [
  {
    value: "cosmos",
    labelKey: "set.bgCosmos",
    preview:
      "radial-gradient(circle at 20% 30%, rgba(232,234,237,0.9) 1px, transparent 1.5px), radial-gradient(circle at 70% 20%, rgba(232,234,237,0.8) 1px, transparent 1.5px), radial-gradient(circle at 45% 70%, rgba(236,72,153,0.9) 1px, transparent 1.5px), radial-gradient(circle at 85% 60%, rgba(232,234,237,0.7) 1px, transparent 1.5px), linear-gradient(130deg, #241a3e, #14202e 45%, #2c1430)",
  },
  {
    value: "aurora",
    labelKey: "set.bgAurora",
    preview:
      "radial-gradient(ellipse 60% 80% at 25% 20%, rgba(63,206,124,0.55), transparent 65%), radial-gradient(ellipse 55% 70% at 80% 75%, rgba(45,212,191,0.45), transparent 65%), #0e0f13",
  },
  {
    value: "rain",
    labelKey: "set.bgRain",
    preview:
      "repeating-linear-gradient(90deg, transparent 0 9px, rgba(63,206,124,0.55) 9px 10.5px, transparent 10.5px 22px), linear-gradient(180deg, #0e0f13, #0e1712)",
  },
  {
    value: "grid",
    labelKey: "set.bgGrid",
    preview:
      "radial-gradient(ellipse 40% 55% at 50% 46%, rgba(255,71,179,0.5), transparent 70%), linear-gradient(180deg, #150a18 0 46%, transparent 46%), repeating-linear-gradient(90deg, rgba(34,211,238,0.5) 0 1px, transparent 1px 12px), repeating-linear-gradient(0deg, rgba(255,71,179,0.5) 0 1px, transparent 1px 9px), linear-gradient(180deg, #16101f, #0e0f13)",
  },
  {
    value: "fireflies",
    labelKey: "set.bgFireflies",
    preview:
      "radial-gradient(circle at 25% 40%, rgba(245,166,35,0.95) 2px, transparent 3.5px), radial-gradient(circle at 60% 65%, rgba(163,230,53,0.9) 2px, transparent 3.5px), radial-gradient(circle at 80% 30%, rgba(245,166,35,0.85) 2px, transparent 3.5px), radial-gradient(ellipse 100% 60% at 50% 110%, rgba(245,166,35,0.25), transparent 70%), #0e0f13",
  },
  {
    value: "off",
    labelKey: "set.bgOff",
    preview:
      "radial-gradient(circle at 30% 35%, rgba(232,234,237,0.9) 1px, transparent 1.5px), radial-gradient(circle at 75% 60%, rgba(232,234,237,0.7) 1px, transparent 1.5px), radial-gradient(ellipse 70% 80% at 15% 10%, rgba(139,92,246,0.4), transparent 60%), radial-gradient(ellipse 60% 60% at 85% 90%, rgba(76,141,255,0.3), transparent 65%), #0e0f13",
  },
];

export function SettingsPage() {
  const t = useT();
  const { data, isLoading, isError, refetch } = useSettings();

  if (isLoading) return <PageLoader label={t("set.loading")} />;
  if (isError || !data)
    return <ErrorState title={t("set.unavailable")} onRetry={() => refetch()} />;

  return <SettingsForm saved={data} />;
}

/* Форма живе окремо: локальний стан сідиться з кешу, а "брудність"
   рахується проти останнього збереженого значення з сервера. */
// Форма показує ФАКТИЧНО застосований вигляд: якщо користувач уже явно обрав
// щось на цьому пристрої (isStored), беремо локальне значення, а не серверне —
// інакше селектори «відкочувалися» б до застарілого серверного вибору.
function seedForm(saved: Settings): Settings {
  return {
    ...saved,
    theme: isStored("theme") ? getTheme() : saved.theme,
    accent: isStored("accent") ? getAccent() : saved.accent,
    language: isStored("lang") ? getLang() : saved.language,
    background: isStored("background") ? getBackground() : saved.background,
  };
}

function SettingsForm({ saved }: { saved: Settings }) {
  const t = useT();
  const [form, setForm] = useState<Settings>(() => seedForm(saved));
  const mutation = useUpdateSettings();
  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

  // Якщо кеш оновився ззовні (інша вкладка, рефетч) — пересіюємо форму
  // з фактично застосованого вигляду.
  useEffect(() => {
    setForm(seedForm(saved));
  }, [saved]);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const dirty =
    form.agentUrl !== saved.agentUrl ||
    form.language !== saved.language ||
    form.theme !== saved.theme ||
    form.accent !== saved.accent ||
    form.background !== saved.background ||
    form.privateProfile !== saved.privateProfile ||
    form.autoRoadmap !== saved.autoRoadmap;

  function patch<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // Акцент/мова/фон застосовуються МИТТЄВО (живий прев'ю), а не лише по "Зберегти".
    if (key === "accent") applyAccent(value as SettingsAccent);
    if (key === "language") applyLang(value as Settings["language"]);
    if (key === "background") applyBackground(value as SettingsBackground);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || mutation.isPending) return;
    setJustSaved(false);
    mutation.mutate(
      { ...form, agentUrl: form.agentUrl.trim() },
      {
        onSuccess: () => {
          setJustSaved(true);
          clearTimeout(savedTimer.current);
          savedTimer.current = setTimeout(() => setJustSaved(false), 2600);
        },
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="animate-rise mx-auto max-w-3xl space-y-6 pb-24">
      {/* Заголовок сторінки */}
      <header className="panel relative overflow-hidden p-6 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-grid-fade" aria-hidden />
        <div className="relative">
          <div className="eyebrow">{t("set.title")}</div>
          <h1 className="mt-1.5 font-display text-4xl font-bold leading-tight tracking-tight text-ink">
            {t("set.heading")}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted">{t("set.subtitle")}</p>
        </div>
      </header>

      {/* 1. Локальний агент */}
      <section className="panel p-6 sm:p-7">
        <div className="eyebrow">{t("set.agentSection")}</div>
        <h2 className="mt-1 font-display text-xl font-semibold text-ink">
          {t("set.agentConn")}
        </h2>

        <label
          htmlFor="agent-url"
          className="mt-5 block font-mono text-xs uppercase tracking-wider text-muted"
        >
          {t("set.agentAddr")}
        </label>
        <input
          id="agent-url"
          value={form.agentUrl}
          onChange={(e) => patch("agentUrl", e.target.value)}
          placeholder="http://127.0.0.1:57343"
          autoComplete="off"
          spellCheck={false}
          className="mt-2 w-full rounded-md border border-line bg-raised/40 px-4 py-3 font-mono text-sm text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-accent/60"
        />

        <AgentStatusLine />
      </section>

      {/* 2. Інтерфейс */}
      <section className="panel p-6 sm:p-7">
        <div className="eyebrow">{t("set.uiSection")}</div>
        <h2 className="mt-1 font-display text-xl font-semibold text-ink">
          {t("set.uiHeading")}
        </h2>

        {/* Тему прибрано — поки лише темна. Світлу додамо пізніше. */}
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <SegmentedGroup<SettingsLanguage>
            label={t("set.language")}
            value={form.language}
            onChange={(v) => patch("language", v)}
            options={[
              { value: "uk", label: "Українська" },
              { value: "en", label: "English" },
            ]}
          />
        </div>

        {/* Вибір акценту — свотчі. Клік застосовує колір миттєво. */}
        <div className="mt-6">
          <div className="font-mono text-xs uppercase tracking-wider text-muted">
            {t("set.accent")}
          </div>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {ACCENTS.map((a) => {
              const active = form.accent === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  aria-pressed={active}
                  aria-label={a.label}
                  title={a.label}
                  onClick={() => patch("accent", a.value)}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 transition-transform",
                    active
                      ? "scale-110 border-ink shadow-glow"
                      : "border-line hover:scale-105",
                  )}
                  style={{ backgroundColor: a.swatch }}
                />
              );
            })}
          </div>
        </div>

        {/* Вибір живого фону — картки з міні-прев'ю. Клік застосовує миттєво. */}
        <div className="mt-6">
          <div className="font-mono text-xs uppercase tracking-wider text-muted">
            {t("set.background")}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {BG_OPTIONS.map((b) => {
              const active = form.background === b.value;
              return (
                <button
                  key={b.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => patch("background", b.value)}
                  className={cn(
                    "group overflow-hidden rounded-lg border text-left transition-all",
                    active
                      ? "border-accent/70 shadow-glow"
                      : "border-line hover:border-accent/40",
                  )}
                >
                  <span
                    aria-hidden
                    className="block h-14 w-full"
                    style={{ background: b.preview }}
                  />
                  <span
                    className={cn(
                      "block px-3 py-2 font-mono text-[0.68rem] uppercase tracking-wider",
                      active ? "text-accent" : "text-muted group-hover:text-ink",
                    )}
                  >
                    {t(b.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Приватність та маршрут */}
      <section className="panel p-6 sm:p-7">
        <div className="eyebrow">{t("set.privacySection")}</div>
        <h2 className="mt-1 font-display text-xl font-semibold text-ink">
          {t("set.privacyHeading")}
        </h2>

        <div className="mt-5 divide-y divide-line/60">
          <ToggleRow
            label={t("set.privateProfile")}
            description={t("set.privateProfileDesc")}
            checked={form.privateProfile}
            onChange={(v) => patch("privateProfile", v)}
          />
          <ToggleRow
            label={t("set.autoRoadmap")}
            description={t("set.autoRoadmapDesc")}
            checked={form.autoRoadmap}
            onChange={(v) => patch("autoRoadmap", v)}
          />
        </div>
      </section>

      {/* Липкий футер збереження */}
      <div className="sticky bottom-4 z-10">
        <div className="panel flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="min-h-[1.25rem] text-sm" aria-live="polite">
            {mutation.isError ? (
              <span className="text-danger">{t("set.saveError")}</span>
            ) : justSaved ? (
              <span className="animate-rise font-mono text-xs uppercase tracking-wider text-done">
                {t("set.saved")}
              </span>
            ) : dirty ? (
              <span className="font-mono text-xs uppercase tracking-wider text-muted">
                {t("set.dirty")}
              </span>
            ) : (
              <span className="font-mono text-xs uppercase tracking-wider text-muted/50">
                {t("set.clean")}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!dirty || mutation.isPending}
            className={cn(
              "inline-flex items-center gap-2.5 rounded-lg border px-6 py-3 font-display text-sm font-semibold transition-all active:translate-y-px",
              "border-accent/60 bg-accent/15 text-white shadow-glow hover:border-accent hover:bg-accent/25",
              "disabled:cursor-not-allowed disabled:border-line disabled:bg-raised/40 disabled:text-muted disabled:shadow-none",
            )}
          >
            {mutation.isPending ? (
              <>
                <Spinner className="h-4 w-4" />
                {t("set.saving")}
              </>
            ) : (
              t("set.save")
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

/* Живий статус агента: зелена крапка — все ок, золота — Steam не запущено,
   червона — агент офлайн. Стосується лише агента за замовчуванням. */
function AgentStatusLine() {
  const t = useT();
  const { data, isError, isLoading } = useAgentHealth();

  let dot = "bg-muted";
  let glow = "";
  let text: React.ReactNode = t("set.agentChecking");
  let tone = "text-muted";

  if (isError) {
    dot = "bg-danger";
    glow = "shadow-[0_0_8px_rgba(255,89,100,0.8)]";
    tone = "text-danger";
    text = t("set.agentOffline");
  } else if (data) {
    if (data.steamRunning) {
      dot = "bg-done";
      glow = "shadow-[0_0_8px_rgba(63,206,124,0.8)]";
      tone = "text-done";
      text = `${t("set.agentOnline")} · ${t("set.steamRunning")} · v${data.version}`;
    } else {
      dot = "bg-gold";
      glow = "shadow-[0_0_8px_rgba(245,166,35,0.8)]";
      tone = "text-gold";
      text = `${t("set.agentOnline")} · ${t("set.steamNotRunning")} · v${data.version}`;
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2.5" aria-live="polite">
      {isLoading ? (
        <Spinner className="h-3 w-3 text-muted" />
      ) : (
        <span
          className={cn("h-2 w-2 shrink-0 rounded-full", dot, glow)}
          aria-hidden
        />
      )}
      <span className={cn("font-mono text-xs tracking-wide", tone)}>{text}</span>
    </div>
  );
}

/* Сегментований перемикач: два-три варіанти, активний — епічний фіолет. */
function SegmentedGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-wider text-muted">
        {label}
      </div>
      <div
        role="group"
        aria-label={label}
        className="mt-2 grid grid-flow-col auto-cols-fr gap-1 rounded-md border border-line bg-raised/40 p-1"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded px-3 py-2 font-display text-sm font-semibold transition-all",
                active
                  ? "border border-accent/60 bg-accent/20 text-accent shadow-glow"
                  : "border border-transparent text-muted hover:bg-raised/80 hover:text-ink",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Доступний тумблер: button[role=switch], фіолетовий у ввімкненому стані. */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="font-display text-sm font-semibold text-ink">
          {label}
        </div>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "inline-flex h-6 w-11 shrink-0 items-center rounded-full border px-0.5 transition-colors duration-200",
          checked
            ? "border-accent/70 bg-accent shadow-glow"
            : "border-line bg-raised/60",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "h-4 w-4 rounded-full transition-transform duration-200",
            checked ? "translate-x-5 bg-white" : "translate-x-0 bg-muted",
          )}
        />
      </button>
    </div>
  );
}
