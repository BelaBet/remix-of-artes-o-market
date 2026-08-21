import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCents } from "@/lib/data";
import SEO from "@/components/SEO";
import { computeSalesMetrics, buildLeaderboard, csvCell } from "@/lib/sales-metrics";
import { Loader2, Download, Search, RefreshCw, Eye, ChevronDown } from "lucide-react";

const STATUSES = ["all", "pending", "paid", "failed", "canceled", "refunded"];
const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando",
  paid: "Pago",
  failed: "Falhou",
  canceled: "Cancelado",
  refunded: "Reembolsado",
};

interface OrderItem { id: string; order_id: string; artisan_user_id: string | null; product_name: string; quantity: number; unit_price_cents: number }
interface Order { id: string; buyer_name: string; buyer_email: string; buyer_phone: string | null; buyer_document: string; status: string; payment_method: string; subtotal_cents: number; total_cents: number; created_at: string; paid_at: string | null; updated_at: string; shipping_address: unknown }
interface Profile { user_id: string; display_name: string | null; shop_name: string | null; city: string | null; state: string | null }

const statusClass = (status: string) => {
  if (status === "paid") return "bg-sage/10 text-sage";
  if (status === "pending") return "bg-gold/10 text-gold";
  if (status === "failed") return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
};

const SuperAdminSalesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const adminQuery = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Consulta a tabela em vez de rpc('has_role'): a plataforma pode mover a
      // função para o schema private, e o PostgREST só expõe o public.
      // A RLS de user_roles já garante que só dá para ler os próprios papéis.
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const ordersQuery = useQuery({
    queryKey: ["admin-orders"],
    enabled: !!user && adminQuery.data === true,
    queryFn: async () => {
      const [{ data: orders, error: ordersError }, { data: items, error: itemsError }, { data: profiles, error: profilesError }] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("order_items").select("id, order_id, artisan_user_id, product_name, quantity, unit_price_cents"),
        supabase.from("profiles").select("user_id, display_name, shop_name, city, state"),
      ]);
      if (ordersError) throw ordersError;
      if (itemsError) throw itemsError;
      if (profilesError) throw profilesError;
      return { orders: (orders ?? []) as Order[], items: (items ?? []) as OrderItem[], profiles: (profiles ?? []) as Profile[] };
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: string }) => {
      const patch: { status: string; updated_at: string; paid_at?: string } = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };
      if (nextStatus === "paid") patch.paid_at = new Date().toISOString();
      const { error } = await supabase.from("orders").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); setSelected(null); },
  });

  const data = ordersQuery.data;
  const profileMap = useMemo(() => new Map((data?.profiles ?? []).map((p) => [p.user_id, p])), [data?.profiles]);
  const itemsByOrder = useMemo(() => {
    const map = new Map<string, OrderItem[]>();
    for (const item of data?.items ?? []) map.set(item.order_id, [...(map.get(item.order_id) ?? []), item]);
    return map;
  }, [data?.items]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.orders ?? []).filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (startDate && o.created_at.slice(0, 10) < startDate) return false;
      if (endDate && o.created_at.slice(0, 10) > endDate) return false;
      if (!term) return true;
      const items = itemsByOrder.get(o.id) ?? [];
      const artisanNames = items.map((i) => profileMap.get(i.artisan_user_id ?? "")?.shop_name ?? profileMap.get(i.artisan_user_id ?? "")?.display_name ?? "").join(" ");
      return [o.id, o.buyer_name, o.buyer_email, o.payment_method, artisanNames, ...items.map((i) => i.product_name)].join(" ").toLowerCase().includes(term);
    });
  }, [data?.orders, status, search, startDate, endDate, itemsByOrder, profileMap]);

  const metrics = useMemo(
    () => computeSalesMetrics(data?.orders ?? [], data?.items ?? []),
    [data],
  );

  const leaderboard = useMemo(
    () =>
      buildLeaderboard(data?.orders ?? [], data?.items ?? [])
        .slice(0, 10)
        .map(([artisanId, total]) => ({ profile: profileMap.get(artisanId), total })),
    [data, profileMap],
  );

  const exportCsv = () => {
    const rows = filteredOrders.map((o) => [o.id, o.created_at, o.buyer_name, o.buyer_email, o.payment_method, o.status, o.subtotal_cents / 100, o.total_cents / 100].map((v) => `"${String(v ?? "").split('"').join('""')}"`).join(","));
    const csv = ["id,data,cliente,email,pagamento,status,subtotal,total", ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `vendas-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (adminQuery.isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!adminQuery.data) return <div className="p-8"><h1 className="font-display text-2xl">Acesso restrito</h1><p className="text-muted-foreground mt-2">Esta área é exclusiva para administradores.</p></div>;

  return (
    <main className="p-4 md:p-7 bg-background min-h-[80vh]">
      <SEO title="Central de vendas" description="Painel de vendas." path="/admin/vendas" noindex />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div><div className="text-[0.62rem] tracking-[0.18em] uppercase text-terra mb-2">Super Admin</div><h1 className="font-display text-2xl md:text-3xl">Central de vendas</h1><p className="text-[0.72rem] text-muted-foreground mt-1">Visão financeira, operacional e comercial de todo o marketplace.</p></div>
        <div className="flex gap-2"><button onClick={() => ordersQuery.refetch()} className="border border-border px-3 py-2 text-xs flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Atualizar</button><button onClick={exportCsv} className="bg-foreground text-background px-3 py-2 text-xs flex items-center gap-2"><Download className="w-3.5 h-3.5" /> Exportar CSV</button></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        {[["Receita paga", formatCents(metrics.gross)], ["Pedidos pagos", metrics.paid], ["Ticket médio", formatCents(metrics.average)], ["Aguardando", formatCents(metrics.pending)], ["Reembolsado", formatCents(metrics.refunded)], ["Vendas totais", metrics.total], ["Artesãos ativos", metrics.sellers]].map(([label, value]) => <div key={String(label)} className="border border-border p-4"><div className="font-display text-lg md:text-xl">{value}</div><div className="text-[0.55rem] uppercase tracking-[0.1em] text-muted-foreground mt-1">{label}</div></div>)}
      </div>

      <div className="grid xl:grid-cols-[1fr_300px] gap-6">
        <section className="min-w-0">
          <div className="border border-border bg-background mb-3">
            <div className="p-3 border-b border-border flex flex-col lg:flex-row gap-2">
              <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pedido, cliente, produto ou artesão..." className="w-full border border-border bg-transparent pl-9 pr-3 py-2 text-xs outline-none" /></div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-border bg-background px-3 py-2 text-xs">{STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "Todos os status" : STATUS_LABEL[s]}</option>)}</select>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-border bg-background px-2 py-2 text-xs" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-border bg-background px-2 py-2 text-xs" />
            </div>
            {ordersQuery.isLoading ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin" /></div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-muted/30"><tr>{["Pedido", "Cliente", "Artesão", "Data", "Pagamento", "Total", "Status", "Ação"].map((h) => <th key={h} className="px-3 py-2 font-medium text-muted-foreground">{h}</th>)}</tr></thead><tbody>{filteredOrders.map((o) => { const items = itemsByOrder.get(o.id) ?? []; const artisan = profileMap.get(items[0]?.artisan_user_id ?? ""); return <tr key={o.id} className="border-t border-border hover:bg-muted/20"><td className="px-3 py-3 font-medium">#{o.id.slice(0, 8)}</td><td className="px-3 py-3"><div>{o.buyer_name}</div><div className="text-[0.62rem] text-muted-foreground">{o.buyer_email}</div></td><td className="px-3 py-3">{artisan?.shop_name ?? artisan?.display_name ?? "—"}</td><td className="px-3 py-3 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td><td className="px-3 py-3 uppercase">{o.payment_method}</td><td className="px-3 py-3 font-medium">{formatCents(o.total_cents)}</td><td className="px-3 py-3"><span className={`px-2 py-1 text-[0.55rem] uppercase tracking-[0.08em] ${statusClass(o.status)}`}>{STATUS_LABEL[o.status] ?? o.status}</span></td><td className="px-3 py-3"><button onClick={() => setSelected(o)} className="border border-border p-1.5" title="Ver detalhes"><Eye className="w-3.5 h-3.5" /></button></td></tr>})}</tbody></table>{filteredOrders.length === 0 && <div className="py-12 text-center text-xs text-muted-foreground">Nenhuma venda encontrada com os filtros atuais.</div>}</div>}
          </div>
          <div className="text-[0.65rem] text-muted-foreground">Mostrando {filteredOrders.length} de {data?.orders.length ?? 0} pedidos. Alterações de status são auditáveis pelo histórico do pagamento quando integrado ao gateway.</div>
        </section>

        <aside className="border border-border p-4 h-fit"><h2 className="font-display text-lg mb-1">Ranking de artesãos</h2><p className="text-[0.65rem] text-muted-foreground mb-4">Receita paga atribuída às peças.</p>{leaderboard.map((x, i) => <div key={x.profile?.user_id ?? i} className="flex items-center gap-2 py-2 border-b border-border last:border-0"><span className="w-5 text-[0.65rem] text-muted-foreground">{i + 1}</span><div className="flex-1 min-w-0"><div className="text-xs truncate">{x.profile?.shop_name ?? x.profile?.display_name ?? "Artesão"}</div><div className="text-[0.58rem] text-muted-foreground">{x.profile?.city ?? ""}{x.profile?.state ? ` · ${x.profile.state}` : ""}</div></div><span className="font-display text-sm">{formatCents(x.total)}</span></div>)}{leaderboard.length === 0 && <div className="text-xs text-muted-foreground py-6">Sem vendas pagas ainda.</div>}</aside>
      </div>

      {selected && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelected(null)}><div className="bg-background border border-border w-full max-w-2xl max-h-[90vh] overflow-auto p-5" onClick={(e) => e.stopPropagation()}><div className="flex items-start justify-between mb-5"><div><div className="text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">Detalhes da venda</div><h2 className="font-display text-xl">#{selected.id.slice(0, 12)}</h2></div><button onClick={() => setSelected(null)} className="text-muted-foreground">✕</button></div><div className="grid md:grid-cols-2 gap-3 text-xs mb-5"><div className="border border-border p-3"><div className="text-muted-foreground">Cliente</div><strong>{selected.buyer_name}</strong><div>{selected.buyer_email}</div><div>{selected.buyer_phone ?? "Sem telefone"}</div></div><div className="border border-border p-3"><div className="text-muted-foreground">Pagamento</div><strong>{selected.payment_method}</strong><div>Status: {STATUS_LABEL[selected.status] ?? selected.status}</div><div>Total: {formatCents(selected.total_cents)}</div></div></div><h3 className="font-display mb-2">Itens</h3><div className="border border-border mb-5">{(itemsByOrder.get(selected.id) ?? []).map((i) => <div key={i.id} className="p-3 border-b border-border last:border-0 flex justify-between text-xs"><span>{i.quantity}× {i.product_name}</span><span>{formatCents(i.quantity * i.unit_price_cents)}</span></div>)}</div><div className="flex flex-wrap gap-2 items-center"><span className="text-xs text-muted-foreground mr-1">Alterar status:</span>{["pending", "paid", "canceled", "refunded", "failed"].map((s) => <button key={s} disabled={updateStatus.isPending || selected.status === s} onClick={() => updateStatus.mutate({ id: selected.id, nextStatus: s })} className="border border-border px-2.5 py-1.5 text-[0.62rem] uppercase disabled:opacity-40">{STATUS_LABEL[s]}</button>)}</div>{updateStatus.isError && <div className="text-xs text-destructive mt-3">Não foi possível alterar a venda. Verifique as políticas RLS do Supabase.</div>}</div></div>}
    </main>
  );
};

export default SuperAdminSalesPage;
