import { useState } from "react";
import { IMAGES, PRODUCTS, BADGE_MAP, formatPrice } from "@/lib/data";
import { useCart } from "@/contexts/CartContext";

interface ProductGridProps {
  products?: typeof PRODUCTS;
}

const ProductGrid = ({ products = PRODUCTS }: ProductGridProps) => {
  const { addItem } = useCart();
  const [favs, setFavs] = useState<Set<number>>(new Set());
  const toggleFav = (id: number) =>
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4">
      {products.map((p) => (
        <div key={p.id} className="bg-background cursor-pointer border border-border border-r-0 border-b-0 last:border-r [&:nth-child(2n)]:border-r lg:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(4n)]:border-r hover:bg-parchment transition-colors relative group">
          <div className="aspect-square overflow-hidden relative bg-parchment">
            {p.badge && (
              <span className={`absolute top-2.5 left-2.5 text-[0.56rem] tracking-[0.1em] uppercase font-semibold px-2 py-0.5 z-[2] ${BADGE_MAP[p.badge].className}`}>
                {BADGE_MAP[p.badge].label}
              </span>
            )}
            <button
              className={`absolute top-2.5 right-2.5 bg-background/90 border border-border w-7 h-7 rounded-full cursor-pointer text-[0.78rem] flex items-center justify-center transition-all z-[2] hover:bg-background ${favs.has(p.id) ? "text-terra" : ""}`}
              onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }}
            >
              {favs.has(p.id) ? "♥" : "♡"}
            </button>
            <img src={IMAGES[p.img]} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-[550ms] saturate-[0.86]" />
            <span className="absolute bottom-2 left-2 bg-espresso/70 backdrop-blur px-2 py-0.5 text-[0.52rem] tracking-[0.12em] uppercase text-gold-light font-semibold">
              🇧🇷 Made in Brasil
            </span>
          </div>
          <div className="p-3.5 pb-4">
            <div className="font-display font-medium text-[0.98rem] leading-tight mb-1">{p.name}</div>
            <div className="text-[0.67rem] tracking-[0.05em] text-muted-foreground mb-3">
              por <strong className="text-terra font-medium">{p.artist}</strong> · {p.city}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gold text-[0.64rem] tracking-[1px]">
                  {"★".repeat(p.stars)}{"☆".repeat(5 - p.stars)}
                  <span className="text-muted-foreground text-[0.61rem] ml-0.5 tracking-normal">({p.reviews})</span>
                </div>
                <span className="font-display text-[1.15rem] font-medium">{formatPrice(p.price)}</span>
                {p.oldPrice && <span className="text-[0.7rem] text-muted-foreground line-through ml-1">{formatPrice(p.oldPrice)}</span>}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); addItem(p.id); }}
                className="bg-transparent border border-border cursor-pointer px-3 py-1 font-body text-[0.6rem] tracking-[0.12em] uppercase font-medium hover:bg-foreground hover:text-background hover:border-foreground transition-all"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductGrid;
