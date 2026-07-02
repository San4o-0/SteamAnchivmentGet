import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { STEAM_LOGIN_URL, api, ApiError } from "@/api/client";
import { setToken } from "@/lib/auth";
import type { TokenResponse } from "@/api/types";

export function LoginPage() {
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
      setError(
        err instanceof ApiError
          ? err.message
          : "Не вдалося увійти. Спробуй ще раз.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-gold/10 blur-[120px]" />

      <div className="relative w-full max-w-xl text-center">
        <div className="mb-8 inline-grid h-16 w-16 place-items-center rounded-2xl bg-gold/12 text-3xl text-gold shadow-gold glow-gold">
          ★
        </div>

        <div className="eyebrow mb-4">Steam achievement manager</div>

        <h1 className="font-display text-5xl font-bold leading-[1.05] sm:text-6xl">
          Дійди до{" "}
          <span className="bg-gradient-to-r from-accent to-gold bg-clip-text text-transparent">
            100%
          </span>
          <br />
          швидше.
        </h1>

        <p className="mx-auto mt-5 max-w-md text-muted">
          Побач, що лишилось у кожній грі, вилови найрідкісніші ачивки й пройди
          продуманим маршрутом — від легкого старту до фінального ривка.
        </p>

        <a
          href={STEAM_LOGIN_URL}
          className="group mt-9 inline-flex items-center gap-3 rounded-xl border border-accent/50 bg-accent/15 px-6 py-3.5 font-display text-base font-semibold tracking-wide text-accent transition-all hover:border-accent hover:bg-accent/25 active:translate-y-px"
        >
          <SteamIcon />
          Увійти через Steam
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </a>

        <p className="mt-6 font-mono text-[0.68rem] uppercase tracking-widest text-muted/70">
          Пароль вводиться на офіційному сайті Steam — ми його не бачимо
        </p>

        <div className="mx-auto mt-10 max-w-md">
          <div className="mb-4 flex items-center gap-3 text-muted/60">
            <span className="h-px flex-1 bg-white/10" />
            <span className="font-mono text-[0.68rem] uppercase tracking-widest">
              або без входу
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={onManualLogin} className="text-left">
            <label className="mb-2 block text-sm text-muted">
              Встав посилання на профіль Steam
            </label>
            <div className="flex gap-2">
              <input
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                placeholder="steamcommunity.com/id/твій_нік"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted/50 focus:border-accent/60"
              />
              <button
                type="submit"
                disabled={loading || !profile.trim()}
                className="shrink-0 rounded-xl border border-accent/50 bg-accent/15 px-5 py-3 font-display text-sm font-semibold text-accent transition-all hover:border-accent hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "…" : "Переглянути"}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-rare">{error}</p>}
            <p className="mt-2 text-xs text-muted/60">
              Профіль має бути публічним (Game details = Public). Так ти лише
              переглядаєш дані — без входу й пароля.
            </p>
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
