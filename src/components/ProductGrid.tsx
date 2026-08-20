import { formatCents } from "@/lib/data";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/hooks/useFavorites";
import type { GridItem } from "@/lib/products";
import { toast } from "sonner";

interface ProductGridProps {
  products: GridItem[];
  /** Conteúdo de exemplo: sem carrinho, sem favoritos. */
  demo?: boolean;
}

const ProductGrid = ({ products, demo = false }: ProductGridProps) => {
  const { addItem } = useCart();
  const { favoriteIds, isEnabled, toggleFavorite } = useFavorites();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4">
      {products.map((p) => (
        <div
          key={p.id}
          className="bg-background border border-border border-r-0 border-b-0 last:border-r [&:nth-child(2n)]:border-r lg:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(4n)]:border-r hover:bg-parchment transition-colors relative group"
        >
          <div className="aspect-square overflow-hidden relative bg-parchment">
            {!demo && isEnabled && (
              <button
                aria-label="Favoritar"
                className={`absolute top-2.5 right-2.5 bg-background/90 border border-border w-7 h-7 rounded-full cursor-pointer text-[0.78rem] flex items-center justify-center transition-all z-[2] hover:bg-background ${
                  favoriteIds.has(p.id) ? "text-terra" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(p.id);
                }}
              >
                {favoriteIds.has(p.id) ? "♥" : "♡"}
              </button>
            )}
            {p.imageUrl ? (
              <img
                src={p.imageUrl}
                alt={p.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-[550ms] saturate-[0.86]"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[0.7rem] tracking-[0.1em] uppercase">
                Sem imagem
              </div>
            )}
            <span className="absolute bottom-2 left-2 bg-espresso/70 backdrop-blur px-2 py-0.5 text-[0.52rem] tracking-[0.12em] uppercase text-gold-light font-semibold">
              🇧🇷 Made in Brasil
            </span>
          </div>
          <div className="p-3.5 pb-4">
            <div className="font-display font-medium text-[0.98rem] leading-tight mb-1">{p.name}</div>
            <div className="text-[0.67rem] tracking-[0.05em] text-muted-foreground mb-3">
              por <strong className="text-terra font-medium">{p.artist}</strong>
              {p.city ? ` · ${p.city}` : ""}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-display text-[1.15rem] font-medium">{formatCents(p.priceCents)}</span>
                {!demo && (
                  <div className="text-[0.6rem] text-muted-foreground tracking-[0.06em]">
                    {p.stock > 0 ? `${p.stock} em estoque` : "Esgotado"}
                  </div>
                )}
              </div>
              {!demo && (
                <button
                  disabled={p.stock <= 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    addItem({
                      id: p.id,
                      name: p.name,
                      artist: p.artist,
                      priceCents: p.priceCents,
                      imageUrl: p.imageUrl,
                    });
                    toast.success("Adicionado ao carrinho");
                  }}
                  className="bg-transparent border border-border cursor-pointer px-3 py-1 font-body text-[0.6rem] tracking-[0.12em] uppercase font-medium hover:bg-foreground hover:text-background hover:border-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-foreground"
                >
                  Adicionar
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductGrid;
