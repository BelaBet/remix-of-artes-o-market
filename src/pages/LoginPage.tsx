import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SocialAuthButtons from "@/components/SocialAuthButtons";

// Only allow same-origin, path-only redirects.
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

type Role = "buyer" | "artisan";

const LoginPage = () => {
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<"login" | "register">(
    params.get("mode") === "register" ? "register" : "login",
  );
  const [role, setRole] = useState<Role>(params.get("role") === "artisan" ? "artisan" : "buyer");
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
          // O papel é apenas sugerido aqui; quem grava é o trigger no banco,
          // que só aceita buyer/artisan.
          data: { display_name: displayName, role },
          emailRedirectTo: `${window.location.origin}${next}`,
        },
      });
      if (error) toast.error(error.message);
      else if (data.session) {
        toast.success("Conta criada com sucesso!");
        window.location.replace(next);
      } else {
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

  const inputCls =
    "w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors";
  const labelCls =
    "block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2";

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="font-display font-semibold text-[2rem] mb-2">
            Feito <em className="italic text-terra">à Mão</em>
          </div>
          <div className="text-[0.63rem] tracking-[0.2em] uppercase text-terra">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </div>
        </div>

        <div className="bg-background border border-border p-8">
          {mode === "register" && (
            <div className="mb-6">
              <span className={labelCls}>Como você vai usar a plataforma?</span>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "buyer", label: "Quero comprar", hint: "Descobrir peças" },
                  { key: "artisan", label: "Quero vender", hint: "Abrir minha loja" },
                ] as const).map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setRole(o.key)}
                    className={`border p-3 text-left transition-colors ${
                      role === o.key ? "border-terra bg-terra/[0.06]" : "border-border hover:border-foreground"
                    }`}
                  >
                    <div className="font-medium text-[0.78rem]">{o.label}</div>
                    <div className="text-[0.62rem] text-muted-foreground">{o.hint}</div>
                  </button>
                ))}
              </div>
              <p className="text-[0.62rem] text-muted-foreground mt-2">
                Dá para abrir uma loja depois, a qualquer momento.
              </p>
            </div>
          )}

          <SocialAuthButtons next={next} role={role} disabled={loading} />

          <div className="flex items-center gap-3 my-6">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[0.58rem] tracking-[0.16em] uppercase text-muted-foreground">ou com e-mail</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="mb-5">
                <label className={labelCls}>Nome</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
            )}
            <div className="mb-5">
              <label className={labelCls}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div className="mb-7">
              <label className={labelCls}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-espresso text-parchment border-none py-3 cursor-pointer font-body font-medium text-[0.7rem] tracking-[0.16em] uppercase hover:brightness-125 transition-all disabled:opacity-50"
            >
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>
        </div>

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
