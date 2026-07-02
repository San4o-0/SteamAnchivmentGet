import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setToken } from "@/lib/auth";
import { Spinner } from "@/components/ui/Spinner";

// Точка приземлення після Steam OpenID: /auth/callback?token=<jwt>.
export function AuthCallbackPage() {
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
    <div className="grid min-h-full place-items-center">
      <Spinner />
    </div>
  );
}
