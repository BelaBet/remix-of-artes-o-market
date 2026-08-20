import { useState } from "react";
import ProductGrid from "@/components/ProductGrid";
import { formatCents } from "@/lib/data";
import {
  useProducts,
  CATEGORY_OPTIONS,
  STATE_OPTIONS,
  DEMO_ITEMS,
  type SortKey,
} from "@/lib/products";
import { SlidersHorizontal, X, Loader2 } from "lucide-react";

interface CatalogPageProps {
  search?: string;
}

const MAX_PRICE_CENTS = 100000;

const CatalogPage = ({ search = "" }: CatalogPageProps) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE_CENTS);
  const [sort, setSort] = useState<SortKey>("relevance");

  const { data: products, isLoading } = useProducts({
    search,
    categories,
    states,
    maxPriceCents: maxPrice < MAX_PRICE_CENTS ? maxPrice : undefined,
    sort,
  });

  const hasFilters = categories.length > 0 || states.length > 0 || maxPrice < MAX_PRICE_CENTS || !!search;
  const list = products ?? [];
  const showDemo = !isLoading && list.length === 0 && !hasFilters;

  const toggle = (value: string, list: string[], set: (v: string[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

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

      <div className="mb-5">
        <div className="text-[0.58rem] tracking-[0.18em] uppercase text-muted-foreground mb-2">Categoria</div>
        {CATEGORY_OPTIONS.map((o) => (
          <label
            key={o}
            className="flex items-center gap-2 text-[0.78rem] mb-1.5 cursor-pointer hover:text-terra transition-colors"
          >
            <input
              type="checkbox"
              className="accent-terra"
              checked={categories.includes(o)}
              onChange={() => toggle(o, categories, setCategories)}
            />
            {o}
          </label>
        ))}
      </div>

      <div className="mb-5">
        <div className="text-[0.58rem] tracking-[0.18em] uppercase text-muted-foreground mb-2">Estado (UF)</div>
        <div className="flex flex-wrap gap-1.5">
          {STATE_OPTIONS.map((uf) => (
            <button
              key={uf}
              onClick={() => toggle(uf, states, setStates)}
              className={`border px-2 py-0.5 text-[0.66rem] tracking-[0.06em] transition-colors ${
                states.includes(uf)
                  ? "border-terra bg-terra text-background"
                  : "border-border text-muted-foreground hover:border-terra"
              }`}
            >
              {uf}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <div className="text-[0.58rem] tracking-[0.18em] uppercase text-muted-foreground mb-2">Faixa de preço</div>
        <input
          type="range"
          min={0}
          max={MAX_PRICE_CENTS}
          step={1000}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-terra my-2"
        />
        <div className="flex justify-between text-[0.7rem] text-muted-foreground">
          <span>{formatCents(0)}</span>
          <span>até {formatCents(maxPrice)}</span>
        </div>
      </div>

      {hasFilters && (
        <button
          onClick={() => {
            setCategories([]);
            setStates([]);
            setMaxPrice(MAX_PRICE_CENTS);
          }}
          className="w-full border border-border py-2 font-body text-[0.66rem] tracking-[0.12em] uppercase hover:border-terra hover:text-terra transition-colors"
        >
          Limpar filtros
        </button>
      )}
    </>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[235px_1fr] min-h-[80vh]">
      <aside className="hidden lg:block bg-parchment border-r border-border p-6">{Filters}</aside>

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
              <strong className="text-foreground">{isLoading ? "…" : list.length}</strong>{" "}
              {list.length === 1 ? "produto" : "produtos"}
              {search && <span className="ml-1 text-[0.8rem]">para “{search}”</span>}
            </span>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="border border-border bg-transparent px-2.5 py-1.5 font-body text-[0.7rem] tracking-[0.06em] outline-none cursor-pointer"
          >
            <option value="relevance">Relevância</option>
            <option value="price_asc">Menor preço</option>
            <option value="newest">Mais novos</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : showDemo ? (
          <>
            <div className="border border-dashed border-terra/50 bg-terra/5 px-4 py-3 mb-5 text-[0.74rem] text-muted-foreground">
              Ainda não há produtos cadastrados. As peças abaixo são{" "}
              <strong className="text-terra">conteúdo de exemplo</strong> e não estão à venda.
            </div>
            <ProductGrid products={DEMO_ITEMS} demo />
          </>
        ) : list.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground text-[0.85rem]">
            Nenhum produto encontrado com esses filtros.
          </div>
        ) : (
          <ProductGrid products={list} />
        )}
      </div>
    </div>
  );
};

export default CatalogPage;
