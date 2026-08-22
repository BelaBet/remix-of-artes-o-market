import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCents } from "@/lib/data";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

const FinanceiroTab = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [range, setRange] = useState("30");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [pixKey, setPixKey] = useState("");

  const { data: wallet, isLoading: loadingWallet } = useQuery({
    queryKey: ["artisan-wallet", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("artisan_wallets").select("*").eq("artisan_user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: transactions } = useQuery({
    queryKey: ["financial-transactions", user?.id, range], enabled: !!user,
    queryFn: async () => {
      const since = new Date(Date.now() - Number(range) * 86400000).toISOString();
      const { data, error } = await supabase.from("financial_transactions").select("*").eq("artisan_user_id", user!.id).gte("created_at", since).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: payouts } = useQuery({
    queryKey: ["payout-requests", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("payout_requests").select("*").eq("artisan_user_id", user!.id).order("requested_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const periodNet = useMemo(() => (transactions ?? []).reduce((sum, t) => sum + Number(t.net_cents || 0) * (t.direction === "debit" ? -1 : 1), 0), [transactions]);
  const requestPayout = useMutation({
    mutationFn: async () => {
      const cents = Math.round(Number(payoutAmount.replace(",", ".")) * 100);
      if (!cents || cents <= 0) throw new Error("Informe um valor válido.");
      if (cents > Number(wallet?.available_cents ?? 0)) throw new Error("O valor excede seu saldo disponível.");
      if (!pixKey.trim()) throw new Error("Informe sua chave Pix.");
      const { error } = await supabase.from("payout_requests").insert({ artisan_user_id: user!.id, amount_cents: cents, pix_key: pixKey.trim() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Solicitação de repasse enviada."); setPayoutAmount(""); setPixKey(""); qc.invalidateQueries({ queryKey: ["payout-requests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCsv = () => {
    const rows = (transactions ?? []).map(t => [t.created_at, t.type, t.description ?? "", t.gross_cents / 100, t.fee_cents / 100, t.commission_cents / 100, t.net_cents / 100, t.status].map(v => `"${String(v).replaceAll('"', '""')}"`).join(","));
    const csv = ["data,tipo,descricao,bruto,taxas,comissao,liquido,status", ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "extrato-financeiro.csv"; a.click(); URL.revokeObjectURL(url);
  };

  if (loadingWallet) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div>;

  return <div>
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5">
      <div><h2 className="font-display text-xl">Financeiro</h2><p className="text-xs text-muted-foreground mt-1">Saldo, vendas, taxas e repasses da sua loja.</p></div>
      <div className="flex gap-2"><select value={range} onChange={e => setRange(e.target.value)} className="border border-border bg-background px-2 py-2 text-xs"><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option><option value="365">1 ano</option></select><button onClick={exportCsv} className="border border-border px-3 py-2 text-xs flex items-center gap-2"><Download className="w-3.5 h-3.5" /> Exportar</button></div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <div className="border border-border p-4"><div className="font-display text-xl">{formatCents(Number(wallet?.available_cents ?? 0))}</div><div className="text-[0.58rem] uppercase tracking-wider text-muted-foreground">Disponível</div></div>
      <div className="border border-border p-4"><div className="font-display text-xl">{formatCents(Number(wallet?.pending_cents ?? 0))}</div><div className="text-[0.58rem] uppercase tracking-wider text-muted-foreground">Pendente</div></div>
      <div className="border border-border p-4"><div className="font-display text-xl">{formatCents(Number(wallet?.lifetime_sales_cents ?? 0))}</div><div className="text-[0.58rem] uppercase tracking-wider text-muted-foreground">Total vendido</div></div>
      <div className="border border-border p-4"><div className="font-display text-xl">{formatCents(Number(wallet?.lifetime_payouts_cents ?? 0))}</div><div className="text-[0.58rem] uppercase tracking-wider text-muted-foreground">Total repassado</div></div>
    </div>

    <div className="grid lg:grid-cols-[1.4fr_0.8fr] gap-4 mb-5">
      <div className="border border-border p-4">
        <div className="flex justify-between items-center mb-3"><h3 className="font-display">Solicitar repasse</h3><span className="text-xs text-muted-foreground">Saldo: {formatCents(Number(wallet?.available_cents ?? 0))}</span></div>
        <div className="grid sm:grid-cols-2 gap-2"><input inputMode="decimal" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder="Valor em R$" className="border border-border bg-background px-3 py-2 text-xs"/><input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="Chave Pix" className="border border-border bg-background px-3 py-2 text-xs"/></div>
        <button disabled={requestPayout.isPending} onClick={() => requestPayout.mutate()} className="mt-2 bg-foreground text-background px-4 py-2 text-[0.62rem] uppercase tracking-wider disabled:opacity-50">{requestPayout.isPending ? "Enviando…" : "Solicitar repasse"}</button>
      </div>
      <div className="border border-border p-4"><h3 className="font-display mb-2">Período</h3><div className="font-display text-2xl">{formatCents(periodNet)}</div><div className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Movimentação líquida</div></div>
    </div>

    <div className="border border-border overflow-x-auto mb-5"><div className="p-3 border-b border-border font-display">Extrato</div><table className="w-full text-xs"><thead><tr className="border-b border-border text-muted-foreground"><th className="p-3 text-left">Data</th><th className="p-3 text-left">Tipo</th><th className="p-3 text-left">Descrição</th><th className="p-3 text-right">Bruto</th><th className="p-3 text-right">Taxas</th><th className="p-3 text-right">Comissão</th><th className="p-3 text-right">Líquido</th><th className="p-3">Status</th></tr></thead><tbody>{(transactions ?? []).map(t => <tr key={t.id} className="border-b border-border last:border-0"><td className="p-3">{new Date(t.created_at).toLocaleDateString("pt-BR")}</td><td className="p-3 uppercase">{t.type}</td><td className="p-3">{t.description ?? "—"}</td><td className="p-3 text-right">{formatCents(Number(t.gross_cents))}</td><td className="p-3 text-right">{formatCents(Number(t.fee_cents))}</td><td className="p-3 text-right">{formatCents(Number(t.commission_cents))}</td><td className="p-3 text-right font-medium">{formatCents(Number(t.net_cents))}</td><td className="p-3">{t.status}</td></tr>)}</tbody></table>{!transactions?.length && <div className="py-10 text-center text-xs text-muted-foreground">Nenhuma movimentação no período.</div>}</div>

    <div className="border border-border overflow-x-auto"><div className="p-3 border-b border-border font-display">Solicitações de repasse</div><table className="w-full text-xs"><thead><tr className="border-b border-border text-muted-foreground"><th className="p-3 text-left">Data</th><th className="p-3 text-right">Valor</th><th className="p-3">Status</th><th className="p-3 text-left">Pix</th></tr></thead><tbody>{(payouts ?? []).map(p => <tr key={p.id} className="border-b border-border last:border-0"><td className="p-3">{new Date(p.requested_at).toLocaleDateString("pt-BR")}</td><td className="p-3 text-right font-medium">{formatCents(Number(p.amount_cents))}</td><td className="p-3 uppercase">{p.status}</td><td className="p-3">{p.pix_key}</td></tr>)}</tbody></table>{!payouts?.length && <div className="py-8 text-center text-xs text-muted-foreground">Nenhum repasse solicitado.</div>}</div>
  </div>;
};

export default FinanceiroTab;
