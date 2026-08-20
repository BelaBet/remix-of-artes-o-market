import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Provider = "google" | "apple";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
    <path
      fill="#4285F4"
      d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.96 3.44-8.56z"
    />
    <path
      fill="#34A853"
      d="M12 23.5c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.74H1.7v2.98A11.5 11.5 0 0 0 12 23.5z"
    />
    <path
      fill="#FBBC05"
      d="M5.55 14.18a6.9 6.9 0 0 1 0-4.36V6.84H1.7a11.5 11.5 0 0 0 0 10.32l3.85-2.98z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.26 15.1.5 12 .5 7.51.5 3.63 3.08 1.7 6.84l3.85 2.98C6.46 7.1 9 4.75 12 4.75z"
    />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
    <path d="M17.05 12.54c-.03-2.62 2.14-3.88 2.24-3.94-1.22-1.79-3.12-2.03-3.8-2.06-1.62-.16-3.16.95-3.98.95-.82 0-2.08-.93-3.42-.9-1.76.02-3.38 1.02-4.28 2.6-1.83 3.17-.47 7.86 1.31 10.43.87 1.26 1.9 2.67 3.26 2.62 1.31-.05 1.8-.85 3.39-.85 1.58 0 2.03.85 3.41.82 1.41-.02 2.3-1.28 3.16-2.55.99-1.46 1.4-2.87 1.42-2.94-.03-.01-2.72-1.05-2.75-4.15zM14.6 4.6c.72-.88 1.21-2.09 1.08-3.3-1.04.04-2.3.69-3.05 1.56-.67.77-1.25 2-1.09 3.19 1.16.09 2.34-.59 3.06-1.45z" />
  </svg>
);

/**
 * Login social. O papel escolhido (comprador/artesão) viaja em queryParams e é
 * lido pelo trigger handle_new_user no primeiro acesso — o banco decide o papel,
 * o cliente apenas sugere, e 'admin' nunca é aceito por essa via.
 */
const SocialAuthButtons = ({
  next = "/",
  role = "buyer",
  disabled = false,
}: {
  next?: string;
  role?: "buyer" | "artisan";
  disabled?: boolean;
}) => {
  const [busy, setBusy] = useState<Provider | null>(null);

  const signIn = async (provider: Provider) => {
    setBusy(provider);
    try {
      const redirectTo = `${window.location.origin}${next.startsWith("/") ? next : "/"}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: { role },
        },
      });
      if (error) throw error;
      // Sucesso redireciona para fora da página; nada a fazer aqui.
    } catch (e) {
      setBusy(null);
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        /provider is not enabled/i.test(msg)
          ? `Login com ${provider === "google" ? "Google" : "Apple"} ainda não está configurado.`
          : "Não foi possível iniciar o login. Tente novamente.",
      );
    }
  };

  const base =
    "w-full flex items-center justify-center gap-2.5 border py-3 font-body font-medium text-[0.7rem] tracking-[0.12em] uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => signIn("google")}
        disabled={disabled || busy !== null}
        className={`${base} border-border bg-background hover:border-foreground`}
      >
        {busy === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
        Continuar com Google
      </button>
      <button
        type="button"
        onClick={() => signIn("apple")}
        disabled={disabled || busy !== null}
        className={`${base} border-foreground bg-foreground text-background hover:bg-espresso hover:border-espresso`}
      >
        {busy === "apple" ? <Loader2 className="w-4 h-4 animate-spin" /> : <AppleIcon />}
        Continuar com Apple
      </button>
    </div>
  );
};

export default SocialAuthButtons;
