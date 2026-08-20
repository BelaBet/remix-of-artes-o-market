import { IMAGES, formatPrice } from "@/lib/data";

interface HeroSectionProps {
  onExplore: () => void;
  onOpenShop?: () => void;
}

const HeroSection = ({ onExplore, onOpenShop }: HeroSectionProps) => {
  const heroItems = [
    { img: "pottery", name: "Cerâmica Torneada", price: 175 },
    { img: "stone", name: "Pedra-Sabão Pintada", price: 129 },
    { img: "weave", name: "Macramê Artesanal", price: 85 },
    { img: "wood", name: "Escultura em Madeira", price: 210 },
  ];

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 lg:min-h-[88vh] relative overflow-hidden">
      {/* Left */}
      <div className="bg-espresso px-5 sm:px-8 md:px-[52px] py-12 md:py-[68px] flex flex-col justify-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.065] bg-cover bg-center"
          style={{ backgroundImage: `url(${IMAGES.weave})` }}
        />
        <div className="relative z-10">
          <div className="text-[0.6rem] sm:text-[0.64rem] tracking-[0.18em] sm:tracking-[0.24em] uppercase text-gold-light font-medium mb-5 sm:mb-6 animate-[fadeIn_1s_ease_both_0.2s]">
            <span className="inline-block w-6 h-px bg-gold align-middle mr-2.5" />
            Marketplace Artesanal Brasileiro
          </div>
          <h1 className="font-display font-light text-[2rem] sm:text-[2.5rem] md:text-[3.5rem] leading-[1.08] text-parchment mb-4 sm:mb-5 animate-[fadeUp_1s_ease_both_0.35s]">
            Artesanato Brasileiro
            <em className="italic text-gold-light block">para o Mundo</em>
          </h1>
          <p className="text-[0.82rem] sm:text-[0.87rem] font-light leading-[1.75] sm:leading-[1.85] text-parchment/55 max-w-[380px] mb-7 sm:mb-8 animate-[fadeUp_1s_ease_both_0.5s]">
            Peças únicas feitas por mãos brasileiras, entregues na sua porta em qualquer lugar do planeta.
          </p>
          <div className="flex gap-2.5 animate-[fadeUp_1s_ease_both_0.65s] flex-wrap">
            <button
              onClick={onExplore}
              className="bg-terra text-background border-none px-6 sm:px-7 py-3 cursor-pointer font-body font-medium text-[0.68rem] sm:text-[0.71rem] tracking-[0.14em] uppercase hover:brightness-90 hover:-translate-y-px transition-all"
            >
              Explorar Catálogo
            </button>
            <button onClick={onOpenShop} className="bg-transparent text-parchment border border-parchment/30 px-6 sm:px-7 py-3 cursor-pointer font-body font-medium text-[0.68rem] sm:text-[0.71rem] tracking-[0.14em] uppercase hover:border-parchment transition-all">
              Abrir Minha Loja
            </button>
          </div>
          <div className="flex gap-x-3 gap-y-2 mt-6 sm:mt-7 animate-[fadeUp_1s_ease_both_0.78s] flex-wrap">
            {["✈️ 50+ países", "🔒 Checkout seguro", "↩️ 30 dias devolução", "🇧🇷 100% Brasileiro"].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5 text-[0.62rem] sm:text-[0.67rem] text-parchment/45 tracking-[0.05em]">
                {t}
                {i < 3 && <span className="hidden sm:inline-block w-px h-4 bg-parchment/15 ml-2" />}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-6 sm:gap-7 mt-8 sm:mt-9 pt-7 border-t border-parchment/10 animate-[fadeIn_1s_ease_both_0.9s]">
            {[
              { n: "12k", l: "Artesãos" },
              { n: "85k", l: "Peças" },
              { n: "4.9", l: "Avaliação" },
            ].map((s, i) => (
              <div key={i}>
                <div className="font-display text-[1.6rem] sm:text-[1.9rem] text-gold-light font-light">{s.n}</div>
                <div className="text-[0.6rem] sm:text-[0.64rem] tracking-[0.12em] uppercase text-parchment/30 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right grid */}
      <div className="hidden lg:grid grid-cols-2 grid-rows-2">
        {heroItems.map((item, i) => (
          <div
            key={i}
            className="relative overflow-hidden cursor-pointer bg-espresso/80 group"
            onClick={onExplore}
          >
            <img
              src={IMAGES[item.img]}
              alt={item.name}
              className="w-full h-full object-cover brightness-[0.78] saturate-[0.88] group-hover:scale-[1.04] group-hover:brightness-[0.68] transition-all duration-[600ms]"
            />
            <span className="absolute top-2.5 right-2.5 bg-espresso/80 backdrop-blur border border-gold/30 px-2 py-1 z-[2] text-[0.54rem] tracking-[0.14em] uppercase text-gold-light font-semibold">
              🇧🇷 Brasil
            </span>
            <div className="absolute bottom-0 left-0 right-0 p-3.5 bg-gradient-to-t from-espresso/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="text-background text-[0.7rem] font-medium tracking-[0.06em]">{item.name}</div>
              <div className="text-gold-light font-display text-[0.95rem]">{formatPrice(item.price)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HeroSection;
