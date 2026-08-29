import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

/**
 * Modo demo: popula o banco com artesãos e produtos de exemplo (as mesmas 8
 * imagens que já ilustravam a home antes de haver produtos reais), para
 * evitar tela vazia na primeira apresentação do sistema.
 *
 * Os dados demo NÃO habilitam compra real — os artesãos ficam com
 * shipping_carrier 'combinar' e sem KYC aprovado, então o checkout recusa
 * com mensagem clara em vez de tentar usar um recebedor falso no gateway.
 * Tudo é marcado no banco (is_demo / raw_user_meta_data), então "Desativar"
 * remove exatamente o que "Ativar" criou — nada além disso.
 */
const DemoDataControl = () => {
  const [status, setStatus] = useState<{ ativo: boolean; produtos: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);

  const carregar = async () => {
    const { data, error } = await supabase.rpc("status_dados_demo");
    if (!error && data?.[0]) {
      setStatus({ ativo: data[0].ativo, produtos: data[0].produtos });
    }
    setLoading(false);
  };

  useEffect(() => {
    void carregar();
  }, []);

  const alternar = async () => {
    setProcessando(true);
    const fn = status?.ativo ? "desativar_dados_demo" : "ativar_dados_demo";
    const { error } = await supabase.rpc(fn);
    setProcessando(false);
    if (error) {
      toast.error("Não foi possível alterar os dados demo.");
      return;
    }
    toast.success(status?.ativo ? "Dados demo removidos." : "Dados demo criados!");
    await carregar();
  };

  if (loading) return null;

  return (
    <div className="mb-6 border border-terra/30 bg-terra/[0.04] px-4 py-3 flex flex-wrap items-center gap-3">
      <Sparkles className="w-4 h-4 text-terra shrink-0" />
      <div className="flex-1 min-w-[220px]">
        <p className="text-[0.78rem] font-medium">
          Dados de exemplo {status?.ativo ? `ativos (${status.produtos} produtos)` : "desativados"}
        </p>
        <p className="text-[0.66rem] text-muted-foreground">
          Popula a vitrine com 3 artesãos e 8 produtos de exemplo. Não habilita compra real.
        </p>
      </div>
      <button
        onClick={alternar}
        disabled={processando}
        className={`shrink-0 px-4 py-2 text-[0.64rem] tracking-[0.12em] uppercase transition-colors disabled:opacity-50 flex items-center gap-1.5 ${
          status?.ativo
            ? "border border-destructive text-destructive hover:bg-destructive hover:text-background"
            : "bg-espresso text-parchment hover:brightness-125"
        }`}
      >
        {processando && <Loader2 className="w-3 h-3 animate-spin" />}
        {status?.ativo ? "Remover dados demo" : "Ativar dados demo"}
      </button>
    </div>
  );
};

export default DemoDataControl;
