import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Only allow same-origin, path-only redirects.
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  try {
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
    return raw;
  } catch {
    return "/";
  }
}

const LoginPage = () => {
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace(next);
    });
  }, [next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}${next}`,
        },
      });
      if (error) toast.error(error.message);
      else if (data.session) {
        // Confirmação de email desativada: já existe sessão, pode seguir.
        toast.success("Conta criada com sucesso!");
        window.location.replace(next);
      } else {
        // Confirmação pendente: NÃO redirecionar, não há sessão.
        toast.success("Conta criada! Confirme seu email para entrar.");
        setMode("login");
        setPassword("");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else window.location.replace(next);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10">
          <div className="font-display font-semibold text-[2rem] mb-2">
            Feito <em className="italic text-terra">à Mão</em>
          </div>
          <div className="text-[0.63rem] tracking-[0.2em] uppercase text-terra mb-3">
            {mode === "login" ? "Entrar" : "Criar Conta"}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="bg-background border border-border p-8">
          {mode === "register" && (
            <div className="mb-5">
              <label className="block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2">
                Nome
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors"
                required
              />
            </div>
          )}
          <div className="mb-5">
            <label className="block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors"
              required
            />
          </div>
          <div className="mb-7">
            <label className="block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-espresso text-parchment border-none py-3 cursor-pointer font-body font-medium text-[0.7rem] tracking-[0.16em] uppercase hover:brightness-125 transition-all disabled:opacity-50"
          >
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar Conta"}
          </button>
        </form>
        <div className="text-center mt-5">
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="bg-transparent border-none cursor-pointer font-body text-[0.76rem] text-muted-foreground hover:text-terra transition-colors"
          >
            {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
