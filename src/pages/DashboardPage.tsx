import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCents } from "@/lib/data";
import ProductsTab from "@/pages/dashboard/ProductsTab";
import OrdersTab, { useArtisanOrders, StatusBadge } from "@/pages/dashboard/OrdersTab";
import RecebimentoTab from "@/pages/dashboard/RecebimentoTab";
import FinanceiroTab from "@/pages/dashboard/FinanceiroTab";
import SuperAdminSalesPage from "@/pages/SuperAdminSalesPage";
import { Download, Loader2 } from "lucide-react";

function greeting(): string { const h = new Date().getHours(); if (h < 12) return "Bom dia"; if (h < 18) return "Boa tarde"; return "Boa noite"; }

const DashboardPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [financeRange, setFinanceRange] = useState("30");
  const { data: orders, isLoading: loadingOrders } = useArtisanOrders();
  const { data: products } = useQuery({ queryKey: ["my-products", user?.id], enabled: !!user, queryFn: async () => { const { data, error } = await supabase.from("products").select("*").eq("artisan_user_id", user!.id).order("created_at", { ascending: false }); if (error) throw error; return data; } });
  const { data: reviews } = useQuery({ queryKey: ["my-reviews", user?.id], enabled: !!user, queryFn: async () => { const { data, error } = await supabase.from("reviews").select("*").eq("artisan_user_id", user!.id).order("created_at", { ascending: false }); if (error) throw error; return data; } });
  const { data: isAdmin } = useQuery({ queryKey: ["is-admin", user?.id], enabled: !!user, queryFn: async () => { const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin").maybeSingle(); if (error) throw error; return !!data; } });
  const displayName = (user?.user_metadata?.display_name as string | undefined)?.trim() || user?.email?.split("@")[0] || "artesão";
  const paid = (orders ?? []).filter((o) => o.status === "paid");
  const revenueCents = paid.reduce((s, o) => s + o.artisanTotalCents, 0);
  const avgRating = reviews?.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const cutoff = useMemo(() => Date.now() - Number(financeRange) * 86400000, [financeRange]);
  const periodPaid = paid.filter((o) => new Date(o.created_at).getTime() >= cutoff);
  const periodRevenue = periodPaid.reduce((s, o) => s + o.artisanTotalCents, 0);
  const exportStatement = () => { const rows = periodPaid.map((o) => [o.id, o.created_at, o.buyer_name, o.payment_method, o.status, o.artisanTotalCents / 100].map((v) => `"${String(v ?? "").split('"').join('""')}"`).join(",")); const csv = ["pedido,data,cliente,pagamento,status,valor_artesao", ...rows].join("\n"); const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `extrato-vendas-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url); };
  const tabs = [
    { key: "overview", icon: "⊞", label: "Visão Geral" }, { key: "products", icon: "◈", label: "Produtos" }, { key: "orders", icon: "⬡", label: "Pedidos" }, { key: "finance", icon: "◎", label: "Financeiro" }, { key: "recebimento", icon: "◉", label: "Recebimento" }, { key: "reviews", icon: "◇", label: "Avaliações" }, { key: "settings", icon: "⊙", label: "Configurações" }, ...(isAdmin ? [{ key: "admin-sales", icon: "▣", label: "Super Admin · Vendas" }] : []),
  ];
  if (tab === "admin-sales" && isAdmin) return <SuperAdminSalesPage />;
  const metrics = [{ icon: "◎", val: formatCents(revenueCents), label: "Receita paga" }, { icon: "⬡", val: String(orders?.length ?? 0), label: "Pedidos" }, { icon: "◈", val: String(products?.length ?? 0), label: "Produtos" }, { icon: "◇", val: avgRating, label: "Avaliação" }];
  return <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] min-h-[80vh]">
    <aside className="bg-espresso p-4"><div className="font-display text-[0.88rem] text-parchment mb-1">Feito à Mão</div><div className="text-[0.58rem] tracking-[0.14em] uppercase text-parchment/25 mb-4 lg:mb-6">Painel do Artesão</div><div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-1">{tabs.map(({ key, icon, label }) => <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 bg-transparent border-none cursor-pointer font-body text-[0.7rem] tracking-[0.05em] py-2 px-2.5 text-left border-l-2 whitespace-nowrap shrink-0 ${tab === key ? "text-gold-light border-l-terra bg-parchment/5" : "text-parchment/40 border-l-transparent hover:text-parchment/70 hover:bg-parchment/[0.04]"}`}><span className="opacity-50">{icon}</span>{label}</button>)}</div></aside>
    <main className="p-4 md:p-7 bg-background">
      {tab === "overview" && <><div className="font-display text-[1.5rem] sm:text-[1.8rem] mb-1">{greeting()}, {displayName}!</div><div className="text-[0.72rem] text-muted-foreground mb-5 sm:mb-6">Resumo real da sua loja</div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">{metrics.map((m) => <div key={m.label} className="bg-background border border-border p-3 sm:p-4"><span className="text-[1.05rem]">{m.icon}</span><div className="font-display text-[1.4rem] sm:text-[1.75rem]">{m.val}</div><div className="text-[0.6rem] tracking-[0.1em] uppercase text-muted-foreground">{m.label}</div></div>)}</div><div className="bg-background border border-border"><div className="flex items-center justify-between p-3 border-b border-border"><span className="font-display text-[0.95rem]">Pedidos recentes</span><button onClick={() => setTab("orders")} className="border border-border px-2 py-1 text-[0.58rem] uppercase">Ver todos</button></div>{loadingOrders ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : (orders?.length ?? 0) === 0 ? <div className="py-10 text-center text-xs text-muted-foreground">Nenhuma venda registrada ainda.</div> : orders!.slice(0, 7).map((o) => <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border last:border-b-0"><div><div className="text-xs font-medium">{o.buyer_name}</div><div className="text-[0.66rem] text-muted-foreground">{o.items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}</div></div><span className="font-display text-sm">{formatCents(o.artisanTotalCents)}</span><StatusBadge status={o.status} /></div>)}</div></>}
      {tab === "products" && <ProductsTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "finance" && <FinanceiroTab />}
      {tab === "recebimento" && <RecebimentoTab />}
      {tab === "reviews" && <div><h2 className="font-display text-xl mb-4">Avaliações</h2>{!reviews?.length ? <div className="border border-dashed border-border py-14 text-center text-xs text-muted-foreground">Você ainda não recebeu avaliações.</div> : <div className="grid md:grid-cols-2 gap-3">{reviews.map((r) => <div key={r.id} className="border border-border p-4"><div className="flex justify-between"><span className="text-xs font-medium">{r.reviewer_name}</span><span className="text-gold">{"★".repeat(r.rating)}</span></div><div className="text-[0.62rem] text-muted-foreground mt-1">{r.reviewer_city}</div><p className="text-xs text-muted-foreground mt-2">{r.comment}</p></div>)}</div>}</div>}
      {tab === "settings" && <div><h2 className="font-display text-xl mb-4">Configurações</h2><div className="border border-border p-5 text-xs space-y-2"><div><span className="text-muted-foreground">E-mail: </span>{user?.email}</div><div><span className="text-muted-foreground">Nome: </span>{displayName}</div></div></div>}
    </main>
  </div>;
};
export default DashboardPage;
