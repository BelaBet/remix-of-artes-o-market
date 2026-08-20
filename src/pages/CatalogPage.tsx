import { useState } from "react";
import ProductGrid from "@/components/ProductGrid";
import { formatPrice } from "@/lib/data";
import { SlidersHorizontal, X } from "lucide-react";

const CatalogPage = () => {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const Filters = (
    <>
      <div className="font-display text-[1.08rem] mb-5 pb-3 border-b border-border flex items-center justify-between">
        <span>Filtros</span>
        <button
          onClick={() => setFiltersOpen(false)}
          aria-label="Fechar filtros"
          className="lg:hidden p-1 text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {[
        { label: "Categoria", opts: ["Cerâmica", "Madeira", "Macramê", "Palha", "Pedra-Sabão"] },
        { label: "Avaliação", opts: ["5 estrelas", "4+ estrelas", "3+ estrelas"] },
        { label: "Estado", opts: ["Minas Gerais", "Bahia", "Pernambuco", "São Paulo"] },
      ].map((g) => (
        <div key={g.label} className="mb-5">
          <div className="text-[0.58rem] tracking-[0.18em] uppercase text-muted-foreground mb-2">{g.label}</div>
          {g.opts.map((o) => (
            <label key={o} className="flex items-center gap-2 text-[0.78rem] mb-1.5 cursor-pointer hover:text-terra transition-colors">
              <input type="checkbox" className="accent-terra" />{o}
            </label>
          ))}
        </div>
      ))}
      <div className="mb-5">
        <div className="text-[0.58rem] tracking-[0.18em] uppercase text-muted-foreground mb-2">Faixa de preço</div>
        <input type="range" min="0" max="500" defaultValue={250} className="w-full accent-terra my-2" />
        <div className="flex justify-between text-[0.7rem] text-muted-foreground">
          <span>{formatPrice(0)}</span><span>{formatPrice(500)}</span>
        </div>
      </div>
      <label className="flex items-center gap-2 text-[0.78rem] cursor-pointer hover:text-terra transition-colors mt-1">
        <input type="checkbox" className="accent-terra" />✈️ Frete grátis
      </label>
    </>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[235px_1fr] min-h-[80vh]">
      <aside className="hidden lg:block bg-parchment border-r border-border p-6">{Filters}</aside>

      {/* Mobile drawer */}
      {filtersOpen && (
        <div className="lg:hidden fixed inset-0 z-[300] flex">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setFiltersOpen(false)} />
          <aside className="relative bg-parchment border-r border-border p-6 w-[85%] max-w-[320px] overflow-y-auto animate-[fadeIn_0.2s_ease]">
            {Filters}
          </aside>
        </div>
      )}

      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-border flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFiltersOpen(true)}
              className="lg:hidden flex items-center gap-1.5 border border-border px-3 py-1.5 font-body text-[0.68rem] tracking-[0.08em] uppercase"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
            </button>
            <span className="font-display text-[0.92rem] sm:text-[0.98rem] text-muted-foreground">
              <strong className="text-foreground">856</strong> produtos
            </span>
          </div>
          <select className="border border-border bg-transparent px-2.5 py-1.5 font-body text-[0.7rem] tracking-[0.06em] outline-none cursor-pointer">
            <option>Relevância</option><option>Menor preço</option><option>Melhor avaliação</option><option>Mais novos</option>
          </select>
        </div>
        <ProductGrid />
      </div>
    </div>
  );
};

export default CatalogPage;
