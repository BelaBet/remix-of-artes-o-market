import { useState } from "react";
import { ORDERS, STATUS_MAP, formatPrice } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const DashboardPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const displayName =
    (user?.user_metadata?.display_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "artesão";
  const tabs = [
    { key: "overview", icon: "⊞", label: "Visão Geral" },
    { key: "products", icon: "◈", label: "Produtos" },
    { key: "orders", icon: "⬡", label: "Pedidos" },
    { key: "finance", icon: "◎", label: "Financeiro" },
    { key: "reviews", icon: "◇", label: "Avaliações" },
    { key: "settings", icon: "⊙", label: "Configurações" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] min-h-[80vh]">
      <aside className="bg-espresso p-4 lg:p-4">
        <div className="font-display text-[0.88rem] text-parchment mb-1">Feito à Mão</div>
        <div className="text-[0.58rem] tracking-[0.14em] uppercase text-parchment/25 mb-4 lg:mb-6">Painel do Artesão</div>
        <div className="flex lg:flex-col gap-1 lg:gap-0 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:pb-0">
          {tabs.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 bg-transparent border-none cursor-pointer font-body text-[0.7rem] tracking-[0.05em] py-2 px-2.5 mb-0 lg:mb-0.5 text-left transition-all border-l-2 lg:border-l-2 whitespace-nowrap shrink-0 ${
                tab === key
                  ? "text-gold-light border-l-terra bg-parchment/5"
                  : "text-parchment/40 border-l-transparent hover:text-parchment/70 hover:bg-parchment/[0.04]"
              }`}
            >
              <span className="opacity-50">{icon}</span>{label}
            </button>
          ))}
        </div>
      </aside>
      <main className="p-4 md:p-7 bg-background">
        <div className="font-display text-[1.5rem] sm:text-[1.8rem] mb-1">
          {greeting()}, {displayName}! 👋
        </div>
        <div className="text-[0.72rem] sm:text-[0.74rem] text-muted-foreground mb-5 sm:mb-6">Resumo da sua loja hoje</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { icon: "◎", val: formatPrice(2847), label: "Receita", badge: "↑ +18%", up: true },
            { icon: "⬡", val: "43", label: "Pedidos", badge: "↑ +12%", up: true },
            { icon: "◈", val: "28", label: "Produtos", badge: "→", up: false },
            { icon: "◇", val: "4.9", label: "Avaliação", badge: "↑ +0.1", up: true },
          ].map((m, i) => (
            <div key={i} className="bg-background border border-border p-3 sm:p-4 hover:border-terra transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[1.05rem]">{m.icon}</span>
                <span className={`text-[0.55rem] sm:text-[0.58rem] tracking-[0.07em] font-semibold px-1.5 py-0.5 ${m.up ? "bg-sage/10 text-sage" : "bg-gold/10 text-gold"}`}>{m.badge}</span>
              </div>
              <div className="font-display text-[1.4rem] sm:text-[1.75rem]">{m.val}</div>
              <div className="text-[0.6rem] sm:text-[0.62rem] tracking-[0.1em] uppercase text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>
        <div className="bg-background border border-border">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="font-display text-[0.95rem] sm:text-[1rem]">Pedidos Recentes</span>
            <button className="bg-transparent border border-border px-2 py-1 font-body text-[0.58rem] tracking-[0.1em] uppercase cursor-pointer hover:bg-foreground hover:text-background hover:border-foreground transition-all">
              Ver todos
            </button>
          </div>
          <div className="hidden lg:grid grid-cols-5 gap-4 px-4 py-2 text-[0.6rem] tracking-[0.12em] uppercase text-muted-foreground border-b border-border">
            <span>Nº</span><span>Comprador</span><span>Valor</span><span>Status</span><span>Ação</span>
          </div>
          {ORDERS.map((o) => (
            <div key={o.id} className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 items-start lg:items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-parchment/50 transition-colors">
              <span className="text-[0.72rem] font-medium text-muted-foreground">{o.id}</span>
              <div className="lg:order-none order-2 col-span-2 lg:col-span-1">
                <div className="text-[0.78rem] font-medium">{o.buyer}</div>
                <div className="text-[0.66rem] text-muted-foreground">{o.items}</div>
              </div>
              <span className="font-display text-[0.92rem] text-right lg:text-left">{formatPrice(o.val)}</span>
              <span className={`inline-block text-[0.55rem] sm:text-[0.56rem] tracking-[0.1em] uppercase font-semibold px-2 py-0.5 w-fit ${STATUS_MAP[o.status].className}`}>
                {STATUS_MAP[o.status].label}
              </span>
              <button className="bg-transparent border border-border px-2 py-1 font-body text-[0.58rem] tracking-[0.1em] uppercase cursor-pointer hover:bg-foreground hover:text-background hover:border-foreground transition-all w-fit col-span-2 lg:col-span-1">
                Detalhes
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
