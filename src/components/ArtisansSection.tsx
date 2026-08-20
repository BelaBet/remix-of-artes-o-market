import { IMAGES, ARTISANS } from "@/lib/data";

interface ArtisansSectionProps {
  onViewProfile?: (index: number) => void;
}

const ArtisansSection = ({ onViewProfile }: ArtisansSectionProps) => (
  <section className="py-14 sm:py-[72px] px-4 md:px-9 bg-espresso">
    <div className="max-w-[1320px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8 sm:mb-10">
        <div>
          <div className="text-[0.6rem] sm:text-[0.63rem] tracking-[0.18em] sm:tracking-[0.2em] uppercase text-parchment/30 mb-2">Conheça quem faz</div>
          <h2 className="font-display font-light text-[1.65rem] sm:text-[2.1rem] text-parchment">
            Artesãos <em className="italic text-gold-light">em destaque</em>
          </h2>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px">
        {ARTISANS.map((a, i) => (
          <div key={i} className="bg-parchment/[0.03] border border-parchment/[0.07] cursor-pointer relative overflow-hidden group hover:bg-parchment/[0.055] transition-colors">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-terra to-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-[400ms]" />
            <div className="h-[180px] sm:h-[200px] overflow-hidden relative">
              <img src={IMAGES[a.img]} alt={a.name} className="w-full h-full object-cover brightness-[0.55] saturate-[0.68] group-hover:scale-[1.04] transition-transform duration-500" />
              <span className="absolute bottom-2.5 right-2.5 bg-espresso/75 border border-gold/30 px-2 py-0.5 text-[0.52rem] tracking-[0.13em] uppercase text-gold-light font-semibold">
                ✈️ Envia para o mundo
              </span>
            </div>
            <div className="p-5">
              <div className="font-display text-[1.25rem] sm:text-[1.38rem] text-parchment mb-1">
                {a.name} {a.verified && <span className="text-[0.6rem] text-sage font-body">✓</span>}
              </div>
              <div className="text-[0.62rem] sm:text-[0.64rem] tracking-[0.1em] uppercase text-parchment/35 mb-1">📍 {a.loc}</div>
              <div className="font-display italic text-[0.9rem] sm:text-[0.94rem] text-gold-light mb-4">{a.spec}</div>
              <div className="h-px bg-parchment/[0.08] mb-3" />
              <div className="flex flex-wrap gap-4 sm:gap-5 mb-4">
                {[
                  { v: a.sales, l: "Vendas" },
                  { v: a.rating, l: "Avaliação" },
                  { v: a.followers, l: "Seguidores" },
                ].map((n, j) => (
                  <div key={j}>
                    <div className="font-display text-[1.3rem] sm:text-[1.45rem] text-gold-light font-light">{n.v}</div>
                    <div className="text-[0.56rem] sm:text-[0.58rem] tracking-[0.12em] uppercase text-parchment/30">{n.l}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onViewProfile?.(i)}
                  className="flex-1 bg-terra text-background border-none py-2 cursor-pointer font-body text-[0.62rem] sm:text-[0.64rem] tracking-[0.14em] uppercase font-medium hover:brightness-90 transition-colors"
                >
                  Visitar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ArtisansSection;
