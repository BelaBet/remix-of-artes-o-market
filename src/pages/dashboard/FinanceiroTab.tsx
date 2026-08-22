import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCents } from "@/lib/data";
import { csvCell } from "@/lib/sales-metrics";
import { Download, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

/**
 * Extrato financeiro do artesão.
 *
 * A versão anterior consultava as tabelas artisan_wallets,
 * financial_transactions e payout_requests — que NÃO existem no banco. A aba
 * quebrava ao abrir.
 *
 * Também não faz sentido ter carteira nem pedido de saque neste modelo: com
 * split, a parte do artesão é liquidada direto pelo gateway na conta dele.
 * Não há saldo em custódia para sacar. O extrato correto é o histórico das
 * vendas, derivado de order_items + orders — que é o que esta versão mostra.
 */

interface Linha {
  order_id: string;
  data: string;
  status: string;
  produto: string;
  quantidade: number;
  bruto: number;
  comissao: number;
  liquido: number;
}

const LIQUIDADO = ["paid", "processing", "shipped", "delivered"];

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em preparo",
  shipped: "Enviado",
  delivered: "Entregue",
  failed: "Falhou",
  canceled: "Cancelado",
  refunded: "Estornado",
};

function useExtrato() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["extrato-artesao", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Linha[]> => {
      const { data, error } = await supabase
        .from("order_items")
        .select(
          "order_id, product_name, quantity, total_cents, platform_fee_cents, artisan_amount_cents, created_at, orders(status, created_at)",
        )
        .eq("artisan_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data ?? []).map((i) => {
        const o = i.orders as unknown as { status: string; created_at: string } | null;
        return {
          order_id: i.order_id as string,
          data: o?.created_at ?? (i.created_at as string),
          status: o?.status ?? "pending",
          produto: i.product_name as string,
          quantidade: i.quantity as number,
          bruto: i.total_cents as number,
          comissao: i.platform_fee_cents as number,
          liquido: i.artisan_amount_cents as number,
        };
      });
    },
  });
}

const Card = ({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) => (
  <div className="border border-border p-4">
    <div className="text-[0.55rem] tracking-[0.16em] uppercase text-muted-foreground mb-1">
      {rotulo}
    </div>
    <div className="font-display text-[1.4rem]">{valor}</div>
    {nota && <div className="text-[0.6rem] text-muted-foreground mt-0.5">{nota}</div>}
  </div>
);

const FinanceiroTab = () => {
  const { data: linhas, isLoading, error } = useExtrato();
  const [filtro, setFiltro] = useState<"todos" | "liquidado" | "pendente">("todos");

  const totais = useMemo(() => {
    const l = linhas ?? [];
    const liq = l.filter((x) => LIQUIDADO.includes(x.status));
    const pend = l.filter((x) => x.status === "pending");
    const est = l.filter((x) => x.status === "refunded");
    return {
      recebido: liq.reduce((s, x) => s + x.liquido, 0),
      comissao: liq.reduce((s, x) => s + x.comissao, 0),
      bruto: liq.reduce((s, x) => s + x.bruto, 0),
      pendente: pend.reduce((s, x) => s + x.liquido, 0),
      estornado: est.reduce((s, x) => s + x.liquido, 0),
      vendas: liq.length,
    };
  }, [linhas]);

  const visiveis = useMemo(() => {
    const l = linhas ?? [];
    if (filtro === "liquidado") return l.filter((x) => LIQUIDADO.includes(x.status));
    if (filtro === "pendente") return l.filter((x) => x.status === "pending");
    return l;
  }, [linhas, filtro]);

  const exportarCsv = () => {
    if (visiveis.length === 0) {
      toast.error("Nada para exportar.");
      return;
    }
    const linhasCsv = visiveis.map((x) =>
      [
        new Date(x.data).toLocaleDateString("pt-BR"),
        STATUS_LABEL[x.status] ?? x.status,
        x.produto,
        x.quantidade,
        (x.bruto / 100).toFixed(2).replace(".", ","),
        (x.comissao / 100).toFixed(2).replace(".", ","),
        (x.liquido / 100).toFixed(2).replace(".", ","),
      ]
        .map(csvCell)
        .join(","),
    );
    const csv = [
      "data,situacao,produto,quantidade,bruto,comissao,liquido",
      ...linhasCsv,
    ].join("\n");
    // BOM para o Excel abrir acentuação corretamente.
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extrato-feito-a-mao.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-destructive/30 bg-destructive/[0.05] p-5 text-[0.82rem]">
        Não foi possível carregar seu extrato agora. Tente novamente em instantes.
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-[1.3rem] mb-1">Financeiro</h2>
      <p className="text-[0.75rem] text-muted-foreground mb-4">
        Sua parte de cada venda é depositada automaticamente na conta cadastrada em Recebimento,
        já descontada a comissão. Não é preciso pedir saque.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card
          rotulo="Recebido"
          valor={formatCents(totais.recebido)}
          nota={`${totais.vendas} venda${totais.vendas === 1 ? "" : "s"}`}
        />
        <Card rotulo="Comissão da plataforma" valor={formatCents(totais.comissao)} />
        <Card rotulo="Aguardando pagamento" valor={formatCents(totais.pendente)} />
        <Card rotulo="Estornado" valor={formatCents(totais.estornado)} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {(
          [
            ["todos", "Tudo"],
            ["liquidado", "Recebidas"],
            ["pendente", "Pendentes"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFiltro(k)}
            className={`px-3 py-1.5 text-[0.62rem] tracking-[0.12em] uppercase border transition-colors ${
              filtro === k
                ? "border-terra text-terra bg-terra/[0.06]"
                : "border-border text-muted-foreground hover:border-foreground"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={exportarCsv}
          className="ml-auto flex items-center gap-1.5 border border-foreground px-3 py-1.5 text-[0.62rem] tracking-[0.12em] uppercase hover:bg-foreground hover:text-background transition-colors"
        >
          <Download className="w-3 h-3" />
          Exportar CSV
        </button>
      </div>

      {visiveis.length === 0 ? (
        <div className="border border-dashed border-border py-14 text-center">
          <p className="text-[0.85rem] text-muted-foreground mb-1">Nenhuma venda registrada ainda.</p>
          <p className="text-[0.7rem] text-muted-foreground">
            Assim que sua primeira peça for vendida, ela aparece aqui.
          </p>
        </div>
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-[0.78rem]">
            <thead>
              <tr className="border-b border-border text-left">
                {["Data", "Peça", "Situação", "Bruto", "Comissão", "Você recebe"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-[0.55rem] tracking-[0.16em] uppercase text-muted-foreground font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiveis.map((x, i) => (
                <tr key={`${x.order_id}-${i}`} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                    {new Date(x.data).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-3 py-2.5">
                    {x.produto}
                    {x.quantidade > 1 && (
                      <span className="text-muted-foreground"> × {x.quantidade}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[0.7rem]">{STATUS_LABEL[x.status] ?? x.status}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{formatCents(x.bruto)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                    −{formatCents(x.comissao)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap font-medium">
                    {formatCents(x.liquido)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[0.66rem] text-muted-foreground mt-3">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        Os valores seguem o calendário de liquidação do meio de pagamento — cartão costuma levar
        mais tempo que PIX. Consulte o extrato do seu banco para as datas exatas de depósito.
      </p>
    </div>
  );
};

export default FinanceiroTab;
