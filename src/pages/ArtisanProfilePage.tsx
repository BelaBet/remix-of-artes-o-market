import { useState } from "react";
import { IMAGES, PRODUCTS, ARTISANS, formatPrice, BADGE_MAP } from "@/lib/data";
import { useCart } from "@/contexts/CartContext";

interface ArtisanProfilePageProps {
  artisanIndex: number;
  onBack: () => void;
}

// Demo reviews per artisan
const DEMO_REVIEWS = [
  [
    { name: "Juliana P.", city: "São Paulo, SP", rating: 5, comment: "Peça incrível! A caixinha de pedra-sabão é ainda mais linda ao vivo. Embalagem impecável.", product: "Caixas de Pedra-Sabão", date: "2025-02-15" },
    { name: "Roberto M.", city: "Rio de Janeiro, RJ", rating: 5, comment: "Presente perfeito para minha esposa. Trabalho artesanal de altíssima qualidade.", product: "Vaso de Cerâmica", date: "2025-02-02" },
    { name: "Sophie L.", city: "Paris, FR", rating: 4, comment: "Beautiful craftsmanship! Shipping was fast and the piece arrived in perfect condition.", product: "Caixas de Pedra-Sabão", date: "2025-01-20" },
    { name: "Carlos T.", city: "Belo Horizonte, MG", rating: 5, comment: "Compro sempre com a Ana. Qualidade incomparável e atendimento maravilhoso.", product: "Peças de Barro Rústico", date: "2025-01-10" },
  ],
  [
    { name: "Fernanda R.", city: "Curitiba, PR", rating: 5, comment: "O macramê ficou perfeito na minha sala! Peça única e cheia de personalidade.", product: "Peça de Macramê", date: "2025-02-18" },
    { name: "Mark R.", city: "Toronto, CA", rating: 5, comment: "Absolutely stunning work. Maria is a true artist. Will definitely order again!", product: "Peça de Macramê", date: "2025-02-05" },
    { name: "Camila S.", city: "Salvador, BA", rating: 5, comment: "Arte de verdade! Cada detalhe mostra o cuidado e a dedicação da artesã.", product: "Peça de Macramê", date: "2025-01-25" },
  ],
  [
    { name: "Felipe A.", city: "Brasília, DF", rating: 5, comment: "Escultura magnífica! O João tem um talento incrível com madeira.", product: "Escultura em Madeira", date: "2025-02-10" },
    { name: "Ana B.", city: "Recife, PE", rating: 4, comment: "Peça linda e colorida. Ficou perfeita na estante da sala.", product: "Escultura em Madeira", date: "2025-01-28" },
    { name: "Bruna L.", city: "London, UK", rating: 5, comment: "The wood sculpture is a conversation starter. Everyone asks where I got it!", product: "Escultura em Madeira", date: "2025-01-15" },
  ],
];

const ArtisanProfilePage = ({ artisanIndex, onBack }: ArtisanProfilePageProps) => {
  const { addItem } = useCart();
  const [favs, setFavs] = useState<Set<number>>(new Set());
  const artisan = ARTISANS[artisanIndex];
  const reviews = DEMO_REVIEWS[artisanIndex] || DEMO_REVIEWS[0];

  // Get products associated with this artisan (demo mapping)
  const artisanProducts = artisanIndex === 0
    ? PRODUCTS.filter(p => ["stone", "pottery", "ceramic"].includes(p.img))
    : artisanIndex === 1
    ? PRODUCTS.filter(p => ["weave", "basket"].includes(p.img))
    : PRODUCTS.filter(p => ["wood", "straw1", "straw2"].includes(p.img));

  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  const toggleFav = (id: number) =>
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="min-h-[80vh]">
      {/* Hero banner */}
      <div className="relative h-[320px] overflow-hidden">
        <img
          src={IMAGES[artisan.img]}
          alt={artisan.name}
          className="w-full h-full object-cover brightness-[0.4] saturate-[0.6]"
        />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-[1320px] mx-auto w-full px-9 pb-10">
            <button
              onClick={onBack}
              className="bg-parchment/10 backdrop-blur border border-parchment/20 text-parchment px-4 py-1.5 font-body text-[0.64rem] tracking-[0.12em] uppercase cursor-pointer hover:bg-parchment/20 transition-colors mb-6"
            >
              ← Voltar
            </button>
            <div className="flex items-end gap-6">
              <div className="w-[100px] h-[100px] rounded-full border-[3px] border-parchment/30 overflow-hidden shrink-0">
                <img src={IMAGES[artisan.img]} alt={artisan.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-display text-[2.4rem] text-parchment font-light leading-tight">
                  {artisan.name}
                  {artisan.verified && <span className="text-[0.7rem] text-sage font-body ml-2">✓ Verificado</span>}
                </div>
                <div className="text-[0.72rem] tracking-[0.08em] text-parchment/50 mt-1">
                  📍 {artisan.loc} · <span className="text-gold-light italic font-display text-[0.85rem]">{artisan.spec}</span>
                </div>
                <div className="flex gap-6 mt-3">
                  {[
                    { v: artisan.sales, l: "Vendas" },
                    { v: avgRating, l: "Avaliação" },
                    { v: artisan.followers, l: "Seguidores" },
                    { v: String(artisanProducts.length), l: "Produtos" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="font-display text-[1.3rem] text-gold-light font-light">{s.v}</span>
                      <span className="text-[0.56rem] tracking-[0.12em] uppercase text-parchment/30">{s.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bio section */}
      <div className="bg-parchment border-b border-border">
        <div className="max-w-[1320px] mx-auto px-9 py-8 flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1">
            <div className="text-[0.6rem] tracking-[0.2em] uppercase text-terra mb-2">Sobre o artesão</div>
            <p className="text-[0.86rem] font-light leading-[1.9] text-muted-foreground max-w-[600px]">
              {artisanIndex === 0
                ? "Ana trabalha com pedra-sabão e cerâmica há mais de 20 anos em Ouro Preto. Suas peças unem tradição mineira com design contemporâneo, cada uma esculpida e pintada à mão com tintas naturais."
                : artisanIndex === 1
                ? "Maria é mestre em macramê e fibras naturais, criando peças que transformam qualquer ambiente. Seu trabalho preserva técnicas tradicionais do Nordeste brasileiro."
                : "João esculpe madeira desde criança, aprendendo com seu avô no Tocantins. Suas esculturas coloridas são reconhecidas internacionalmente pela originalidade e riqueza de detalhes."
              }
            </p>
          </div>
          <div className="flex gap-3">
            <button className="bg-transparent text-foreground border border-foreground px-5 py-2.5 cursor-pointer font-body font-medium text-[0.66rem] tracking-[0.14em] uppercase hover:bg-foreground hover:text-background transition-all">
              Seguir
            </button>
          </div>
        </div>
      </div>

      {/* Products */}
      <section className="py-10 sm:py-12 px-4 md:px-9">
        <div className="max-w-[1320px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-7 sm:mb-8 pb-3 border-b border-border">
            <div>
              <div className="text-[0.6rem] sm:text-[0.63rem] tracking-[0.18em] sm:tracking-[0.2em] uppercase text-terra mb-2">Loja</div>
              <h2 className="font-display font-normal text-[1.55rem] sm:text-[2rem] leading-[1.15]">
                Produtos de <em className="italic text-terra">{artisan.name}</em>
              </h2>
            </div>
            <span className="font-display text-[0.85rem] sm:text-[0.9rem] text-muted-foreground">{artisanProducts.length} produtos</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {artisanProducts.map((p) => (
              <div key={p.id} className="bg-background cursor-pointer border border-border border-r-0 border-b-0 last:border-r hover:bg-parchment transition-colors relative group">
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
                </div>
                <div className="p-3 sm:p-3.5 pb-4">
                  <div className="font-display font-medium text-[0.92rem] sm:text-[0.98rem] leading-tight mb-1">{p.name}</div>
                  <div className="text-[0.64rem] sm:text-[0.67rem] tracking-[0.05em] text-muted-foreground mb-3">{p.city}</div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="text-gold text-[0.62rem] sm:text-[0.64rem] tracking-[1px]">
                        {"★".repeat(p.stars)}{"☆".repeat(5 - p.stars)}
                        <span className="text-muted-foreground text-[0.6rem] ml-0.5 tracking-normal">({p.reviews})</span>
                      </div>
                      <span className="font-display text-[1.05rem] sm:text-[1.15rem] font-medium">{formatPrice(p.price)}</span>
                      {p.oldPrice && <span className="text-[0.68rem] sm:text-[0.7rem] text-muted-foreground line-through ml-1">{formatPrice(p.oldPrice)}</span>}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); addItem(p.id); }}
                      className="bg-transparent border border-border cursor-pointer px-3 py-1 font-body text-[0.58rem] sm:text-[0.6rem] tracking-[0.12em] uppercase font-medium hover:bg-foreground hover:text-background hover:border-foreground transition-all self-start sm:self-auto"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-10 sm:py-12 px-4 md:px-9 bg-parchment">
        <div className="max-w-[1320px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7 sm:mb-8 pb-3 border-b border-border">
            <div>
              <div className="text-[0.6rem] sm:text-[0.63rem] tracking-[0.18em] sm:tracking-[0.2em] uppercase text-terra mb-2">Avaliações</div>
              <h2 className="font-display font-normal text-[1.55rem] sm:text-[2rem] leading-[1.15]">
                O que dizem sobre <em className="italic text-terra">{artisan.name}</em>
              </h2>
            </div>
            <div className="text-left sm:text-right">
              <div className="font-display text-[1.8rem] sm:text-[2.2rem] text-terra font-light leading-tight">{avgRating}</div>
              <div className="text-gold text-[0.7rem] sm:text-[0.72rem] tracking-[1px]">{"★".repeat(Math.round(Number(avgRating)))}</div>
              <div className="text-[0.6rem] text-muted-foreground tracking-[0.08em]">{reviews.length} avaliações</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((r, i) => (
              <div key={i} className="bg-background border border-border p-5 sm:p-6 hover:border-terra/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium text-[0.85rem]">{r.name}</div>
                    <div className="text-[0.64rem] text-muted-foreground tracking-[0.06em]">📍 {r.city}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gold text-[0.68rem] tracking-[1px]">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                    <div className="text-[0.58rem] text-muted-foreground mt-0.5">
                      {new Date(r.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
                {r.product && (
                  <div className="inline-block text-[0.56rem] tracking-[0.1em] uppercase font-semibold px-2 py-0.5 bg-terra/10 text-terra mb-3">
                    {r.product}
                  </div>
                )}
                <p className="text-[0.82rem] font-light leading-[1.8] text-muted-foreground">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ArtisanProfilePage;
