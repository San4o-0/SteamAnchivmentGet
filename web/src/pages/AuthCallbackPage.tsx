import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setToken } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { Spinner } from "@/components/ui/Spinner";

// Точка приземлення після Steam OpenID: /auth/callback?token=<jwt>.
export function AuthCallbackPage() {
  const t = useT();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      setToken(token);
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [params, navigate]);

  return (
    <div className="relative grid min-h-full place-items-center overflow-hidden px-6">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/12 blur-[120px]" />
      <div className="relative flex flex-col items-center gap-5 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-accent/50 bg-accent/12 text-accent shadow-glow glow-gold">
          <Spinner />
        </div>
        <p className="eyebrow text-muted/70">{t("login.loadingProfile")}</p>
      </div>
    </div>
  );
}
