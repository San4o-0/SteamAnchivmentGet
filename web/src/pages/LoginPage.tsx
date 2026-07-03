import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { STEAM_LOGIN_URL, api, ApiError } from "@/api/client";
import { setToken } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { stagger } from "@/lib/motion";
import type { TokenResponse } from "@/api/types";
import logo from "@/assets/logo.png";

// Дрібні частинки, що повільно спливають угору — «жива» атмосфера позаду тексту.
const PARTICLES = [
  { left: "12%", delay: "0s", dur: "7s", size: 3 },
  { left: "27%", delay: "2.4s", dur: "9s", size: 2 },
  { left: "44%", delay: "4.1s", dur: "8s", size: 4 },
  { left: "63%", delay: "1.2s", dur: "10s", size: 2 },
  { left: "78%", delay: "3.6s", dur: "7.5s", size: 3 },
  { left: "90%", delay: "5s", dur: "9.5s", size: 2 },
];

export function LoginPage() {
  const t = useT();
  const navigate = useNavigate();
  const [profile, setProfile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onManualLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<TokenResponse>("/auth/manual", {
        profile: profile.trim(),
      });
      setToken(res.token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-6 py-16">
      {/* Ambient aurora — дрейфує й «дихає». */}
      <div className="float-blob pointer-events-none absolute left-1/2 top-0 h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" />
      <div className="float-blob-alt pointer-events-none absolute bottom-0 left-1/2 h-[320px] w-[520px] -translate-x-1/2 rounded-full bg-gold/8 blur-[130px]" />

      {/* Частинки, що спливають. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute bottom-1/3 rounded-full bg-accent/70 shadow-glow"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animation: `drift-up ${p.dur} ease-in-out ${p.delay} infinite`,
            }}
          />
        ))}
      </div>

      {/* Напівпрозора фіолетова картка: контент у рамці, але фон просвічує. */}
      <div className="hero-pulse relative isolate w-full max-w-xl rounded-3xl border border-accent/20 bg-surface/30 px-8 py-12 text-center backdrop-blur-md sm:px-12">
        {/* М'яке фіолетове свічення згори всередині рамки. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_50%_-10%,rgb(var(--color-accent)/0.16),transparent_60%)]"
        />

        {/* «Черв'як», що повзе по рамці. */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          preserveAspectRatio="none"
        >
          <rect
            className="worm-tail"
            x={2}
            y={2}
            rx={24}
            ry={24}
            pathLength={100}
            fill="none"
            style={{ width: "calc(100% - 4px)", height: "calc(100% - 4px)" }}
          />
          <rect
            className="worm"
            x={2}
            y={2}
            rx={24}
            ry={24}
            pathLength={100}
            fill="none"
            style={{ width: "calc(100% - 4px)", height: "calc(100% - 4px)" }}
          />
        </svg>

        <img
          src={logo}
          alt="Achivo"
          draggable={false}
          className="animate-rise bob mx-auto mb-6 w-full max-w-[380px] select-none"
          style={stagger(0, 90)}
        />

        <div className="animate-rise eyebrow mb-4" style={stagger(1, 90)}>
          {t("login.eyebrow")}
        </div>

        <h1
          className="animate-rise font-display text-5xl font-bold leading-[1.03] tracking-tight text-ink [text-shadow:0_2px_24px_rgba(0,0,0,0.7)] sm:text-6xl"
          style={stagger(2, 90)}
        >
          {t("login.headline.pre")} <span className="text-shimmer">100%</span>
          <br />
          {t("login.headline.post")}
        </h1>

        <p
          className="animate-rise mx-auto mt-5 max-w-md text-ink/75 [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]"
          style={stagger(3, 90)}
        >
          {t("login.subtitle")}
        </p>

        <a
          href={STEAM_LOGIN_URL}
          className="cta-sheen animate-rise group relative mt-9 inline-flex items-center gap-3 overflow-hidden rounded-xl border border-accent/60 bg-accent/20 px-6 py-3.5 font-display text-[1rem] font-semibold tracking-wide text-white shadow-glow transition-all hover:border-accent hover:bg-accent/30 hover:shadow-[0_0_0_1px_rgb(var(--color-accent)/0.6),0_0_30px_-4px_rgb(var(--color-accent)/0.85)] active:translate-y-px"
          style={stagger(4, 90)}
        >
          <SteamIcon />
          {t("login.steamButton")}
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </a>

        <p
          className="animate-rise mt-6 font-mono text-[0.68rem] uppercase tracking-widest text-muted"
          style={stagger(5, 90)}
        >
          {t("login.passwordNote")}
        </p>

        <div className="animate-rise mx-auto mt-10 max-w-md" style={stagger(6, 90)}>
          <div className="mb-4 flex items-center gap-3 text-muted/70">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-line" />
            <span className="font-mono text-[0.68rem] uppercase tracking-widest">
              {t("login.divider")}
            </span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-line" />
          </div>

          <form
            onSubmit={onManualLogin}
            className="rounded-2xl border border-line/70 bg-surface/50 p-4 text-left backdrop-blur-sm"
          >
            <label className="mb-2 block text-sm text-ink/80">
              {t("login.profileLabel")}
            </label>
            <div className="flex gap-2">
              <input
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                placeholder={t("login.profilePlaceholder")}
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-xl border border-line bg-raised/60 px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-accent/60 focus:shadow-glow"
              />
              <button
                type="submit"
                disabled={loading || !profile.trim()}
                className="shrink-0 rounded-xl border border-accent/50 bg-accent/20 px-5 py-3 font-display text-sm font-semibold text-white transition-all hover:border-accent hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "…" : t("login.viewButton")}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-rare">{error}</p>}
            <p className="mt-2 text-xs text-muted">{t("login.profileHint")}</p>
          </form>
        </div>
      </div>
    </div>
  );
}

function SteamIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.6 2 2.2 6.1 2 11.3l5.4 2.2a2.9 2.9 0 011.7-.5l2.4-3.5v-.05A3.9 3.9 0 1115.4 13l-3.4 2.5a2.9 2.9 0 01-5.8.2L2.8 14.3A10 10 0 1012 2zM8.7 17.2l-1.2-.5a2.2 2.2 0 003 1.1 2.2 2.2 0 00-1.2-4.2l1.3.5a1.6 1.6 0 11-1.9 3.1zm7.9-6.4a2.6 2.6 0 10-2.6-2.6 2.6 2.6 0 002.6 2.6zm0-.9a1.7 1.7 0 111.7-1.7 1.7 1.7 0 01-1.7 1.7z" />
    </svg>
  );
}
