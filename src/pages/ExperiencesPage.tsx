import { useState } from "react";
import { Star, MapPin, Play, Users, Award, ChevronRight, Sparkles, Clock } from "lucide-react";
import { IMAGES, formatPrice } from "@/lib/data";
import ShareMenu from "@/components/ShareMenu";

type ExpType = "ao vivo" | "gravado" | "presencial" | "mentoria";

interface Experience {
  id: number;
  featured?: boolean;
  type: ExpType;
  badge: string;
  icon: JSX.Element;
  title: string;
  desc?: string;
  creator: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
  meta: string;
  img: string;
}

const EXPERIENCES: Experience[] = [
  {
    id: 1,
    featured: true,
    type: "ao vivo",
    badge: "Ao Vivo",
    icon: <Sparkles className="w-3 h-3" />,
    title: "Torneamento em Barro: do Bloco à Peça",
    desc: "Uma manhã inteira com Ana Lima, aprendendo a girar o torno e dar forma ao barro como há cinco gerações em Ouro Preto.",
    creator: "Ana Lima",
    location: "Ouro Preto, MG",
    rating: 4.9,
    reviews: 64,
    price: 89,
    meta: "2h · Turma de 12",
    img: IMAGES.pottery,
  },
  {
    id: 2,
    type: "gravado",
    badge: "Gravado",
    icon: <Play className="w-3 h-3" />,
    title: "Macramê Essencial: 6 Pontos para Sempre",
    creator: "Carla B.",
    location: "Salvador, BA",
    rating: 5.0,
    reviews: 132,
    price: 65,
    meta: "5 módulos · Vitalício",
    img: IMAGES.weave,
  },
  {
    id: 3,
    type: "presencial",
    badge: "Presencial",
    icon: <Users className="w-3 h-3" />,
    title: "Vivência: Escultura em Madeira",
    creator: "Maria S.",
    location: "Caruaru, PE",
    rating: 4.8,
    reviews: 41,
    price: 220,
    meta: "Dia inteiro · Limitado",
    img: IMAGES.wood,
  },
  {
    id: 4,
    type: "mentoria",
    badge: "Mentoria",
    icon: <Award className="w-3 h-3" />,
    title: "Mentoria 1:1 — Trançado de Buriti",
    creator: "João N.",
    location: "Tocantins, TO",
    rating: 5.0,
    reviews: 18,
    price: 150,
    meta: "60 min · Individual",
    img: IMAGES.straw1,
  },
  {
    id: 5,
    type: "gravado",
    badge: "Gravado",
    icon: <Play className="w-3 h-3" />,
    title: "Cestaria Tradicional em Vídeo",
    creator: "Rosa A.",
    location: "Campina Grande, PB",
    rating: 4.9,
    reviews: 76,
    price: 70,
    meta: "4 módulos · Vitalício",
    img: IMAGES.basket,
  },
  {
    id: 6,
    type: "ao vivo",
    badge: "Ao Vivo",
    icon: <Sparkles className="w-3 h-3" />,
    title: "Pedra-Sabão: Caixas Decorativas",
    creator: "Teresa C.",
    location: "Limoeiro, PE",
    rating: 4.7,
    reviews: 29,
    price: 110,
    meta: "3h · Turma de 8",
    img: IMAGES.stone,
  },
];

const CATEGORIES: { label: string; value: "todos" | ExpType; icon?: JSX.Element }[] = [
  { label: "Todas", value: "todos" },
  { label: "Ao Vivo", value: "ao vivo", icon: <Sparkles className="w-3 h-3" /> },
  { label: "Gravado", value: "gravado", icon: <Play className="w-3 h-3" /> },
  { label: "Presencial", value: "presencial", icon: <Users className="w-3 h-3" /> },
  { label: "Mentoria", value: "mentoria", icon: <Award className="w-3 h-3" /> },
];

const Stars = ({ rating }: { rating: number }) => (
  <span className="inline-flex items-center gap-0.5">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${i < Math.round(rating) ? "fill-gold text-gold" : "text-border"}`}
      />
    ))}
    <span className="ml-1 text-[0.7rem] text-muted-foreground">{rating.toFixed(1)}</span>
  </span>
);

const Eyebrow = ({ children, color = "text-terra" }: { children: React.ReactNode; color?: string }) => (
  <div className={`flex items-center gap-2 text-[0.6rem] sm:text-[0.63rem] tracking-[0.18em] sm:tracking-[0.2em] uppercase mb-2 ${color}`}>
    <span className="inline-block w-6 h-px bg-current" />
    {children}
  </div>
);

const TypeBadge = ({ icon, children, light }: { icon: JSX.Element; children: React.ReactNode; light?: boolean }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-1 text-[0.54rem] tracking-[0.14em] uppercase font-semibold backdrop-blur ${
      light
        ? "bg-espresso/80 border border-gold/30 text-gold-light"
        : "bg-parchment text-foreground border border-border"
    }`}
  >
    {icon}
    {children}
  </span>
);

const FeaturedCard = ({ exp }: { exp: Experience }) => (
  <article className="grid grid-cols-1 md:grid-cols-2 bg-espresso text-parchment overflow-hidden">
    <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[380px] lg:min-h-[460px] overflow-hidden">
      <img src={exp.img} alt={exp.title} className="absolute inset-0 w-full h-full object-cover brightness-[0.78] saturate-[0.9]" />
      <div className="absolute top-3 left-3 flex gap-2 flex-wrap max-w-[calc(100%-4rem)]">
        <TypeBadge icon={exp.icon} light>{exp.badge}</TypeBadge>
        <TypeBadge icon={<Sparkles className="w-3 h-3" />} light>Destaque</TypeBadge>
      </div>
      <div className="absolute top-3 right-3">
        <ShareMenu title={exp.title} variant="dark" />
      </div>
    </div>
    <div className="p-6 sm:p-9 md:p-10 lg:p-14 flex flex-col justify-center">
      <Eyebrow color="text-gold-light">Experiência em destaque</Eyebrow>
      <h2 className="font-display font-light text-[1.55rem] sm:text-[1.9rem] md:text-[2rem] lg:text-[2.6rem] leading-[1.1] mb-4 break-words">
        {exp.title}
      </h2>
      <p className="text-[0.8rem] sm:text-[0.85rem] font-light leading-[1.75] text-parchment/60 mb-6 sm:mb-7 max-w-[460px]">{exp.desc}</p>

      <div className="flex items-center gap-3 mb-6 sm:mb-7">
        <div className="w-10 h-10 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center font-display text-gold-light shrink-0">
          {exp.creator.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="text-[0.78rem] text-parchment truncate">{exp.creator}</div>
          <div className="text-[0.66rem] text-parchment/50 flex items-center gap-1 flex-wrap">
            <MapPin className="w-3 h-3 shrink-0" /> {exp.location} · <Stars rating={exp.rating} /> ({exp.reviews})
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-5 sm:pt-6 border-t border-parchment/15 flex-wrap">
        <div>
          <div className="font-display text-[1.5rem] sm:text-[1.8rem] text-gold-light">{formatPrice(exp.price)}</div>
          <div className="text-[0.62rem] tracking-[0.12em] uppercase text-parchment/40 mt-0.5">{exp.meta}</div>
        </div>
        <button disabled title="Funcionalidade em breve" className="disabled:opacity-50 disabled:cursor-not-allowed bg-terra text-background border-none px-5 sm:px-7 py-3 cursor-pointer font-body font-medium text-[0.68rem] sm:text-[0.71rem] tracking-[0.14em] uppercase hover:brightness-90 hover:-translate-y-px transition-all whitespace-nowrap">
          Em breve
        </button>
      </div>
    </div>
  </article>
);

const ExperienceCard = ({ exp }: { exp: Experience }) => (
  <article className="bg-card border border-border flex flex-col group h-full">
    <div className="relative aspect-[4/3] overflow-hidden">
      <img
        src={exp.img}
        alt={exp.title}
        className="absolute inset-0 w-full h-full object-cover brightness-[0.92] group-hover:scale-[1.04] group-hover:brightness-[0.82] transition-all duration-[600ms]"
      />
      <div className="absolute top-3 left-3 max-w-[calc(100%-3.5rem)]"><TypeBadge icon={exp.icon} light>{exp.badge}</TypeBadge></div>
      <div className="absolute top-3 right-3"><ShareMenu title={exp.title} /></div>
      <div className="absolute bottom-3 left-3 right-3 inline-flex items-center gap-1 bg-background/85 backdrop-blur px-2 py-1 text-[0.58rem] tracking-[0.1em] uppercase text-foreground w-fit max-w-full truncate">
        <Clock className="w-3 h-3 shrink-0" /> <span className="truncate">{exp.meta}</span>
      </div>
    </div>
    <div className="p-4 sm:p-5 flex flex-col flex-1">
      <h3 className="font-display text-[1.05rem] sm:text-[1.15rem] leading-[1.2] mb-2 break-words">{exp.title}</h3>
      <div className="text-[0.7rem] text-muted-foreground mb-3 break-words">
        por <span className="text-foreground">{exp.creator}</span> · {exp.location}
      </div>
      <div className="mb-4"><Stars rating={exp.rating} /> <span className="text-[0.68rem] text-muted-foreground">({exp.reviews})</span></div>
      <div className="mt-auto flex items-center justify-between gap-3 pt-4 border-t border-border flex-wrap">
        <div className="font-display text-[1.15rem] sm:text-[1.25rem] text-terra">{formatPrice(exp.price)}</div>
        <button disabled title="Funcionalidade em breve" className="disabled:opacity-50 disabled:cursor-not-allowed bg-terra text-background px-3.5 sm:px-4 py-2 font-body text-[0.62rem] sm:text-[0.66rem] tracking-[0.14em] uppercase hover:bg-[hsl(18,56%,36%)] transition-colors whitespace-nowrap">
          Em breve
        </button>
      </div>
    </div>
  </article>
);

const ExperiencesPage = ({ onExplore }: { onExplore?: () => void }) => {
  const [tab, setTab] = useState<"todos" | ExpType>("todos");
  const featured = EXPERIENCES.find((e) => e.featured)!;
  const rest = EXPERIENCES.filter((e) => !e.featured);
  const filtered = tab === "todos" ? rest : rest.filter((e) => e.type === tab);

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="bg-espresso text-parchment px-5 sm:px-9 py-14 sm:py-20 md:py-24 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06] bg-cover bg-center"
          style={{ backgroundImage: `url(${IMAGES.weave})` }}
        />
        <div className="max-w-[1320px] mx-auto relative z-10">
          <Eyebrow color="text-gold-light">Experiências Artesanais</Eyebrow>
          <h1 className="font-display font-light text-[2.2rem] sm:text-[3rem] md:text-[3.8rem] leading-[1.05] mb-5 max-w-[820px]">
            Aprenda com as <em className="italic text-gold-light">mãos que criam</em>
          </h1>
          <p className="text-[0.88rem] font-light leading-[1.85] text-parchment/55 max-w-[520px] mb-8">
            Aulas, vivências e mentorias direto com os artesãos por trás de cada peça —
            conhecimento de geração em geração, agora ao seu alcance.
          </p>
          <div className="flex gap-2.5 flex-wrap">
            <button
              onClick={onExplore}
              className="bg-terra text-background px-7 py-3 font-body font-medium text-[0.71rem] tracking-[0.14em] uppercase hover:brightness-90 hover:-translate-y-px transition-all"
            >
              Explorar Experiências
            </button>
            <button disabled title="Funcionalidade em breve" className="disabled:opacity-50 disabled:cursor-not-allowed bg-transparent text-parchment border border-parchment/30 px-7 py-3 font-body font-medium text-[0.71rem] tracking-[0.14em] uppercase hover:border-parchment transition-all">
              Em breve
            </button>
          </div>
          <div className="flex flex-wrap gap-7 mt-10 pt-7 border-t border-parchment/10">
            {[["340+", "Experiências"], ["4.9", "Avaliação"], ["12k", "Alunos"]].map(([n, l]) => (
              <div key={l}>
                <div className="font-display text-[1.9rem] text-gold-light font-light">{n}</div>
                <div className="text-[0.64rem] tracking-[0.12em] uppercase text-parchment/30 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="px-4 md:px-9 py-12 sm:py-16">
        <div className="max-w-[1320px] mx-auto"><FeaturedCard exp={featured} /></div>
      </section>

      {/* Filters */}
      <section className="px-4 md:px-9">
        <div className="max-w-[1320px] mx-auto flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between pb-5 border-b border-border">
          <div>
            <Eyebrow>Curadoria</Eyebrow>
            <h2 className="font-display font-normal text-[1.65rem] sm:text-[2.1rem] leading-[1.15]">
              Mais <em className="italic text-terra">experiências</em>
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = tab === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setTab(c.value)}
                  className={`px-3.5 py-2 text-[0.62rem] tracking-[0.12em] uppercase flex items-center gap-1.5 border transition-colors ${
                    active
                      ? "bg-espresso text-cream border-espresso"
                      : "bg-transparent text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {c.icon}
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="px-4 md:px-9 py-10 sm:py-14">
        <div className="max-w-[1320px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((exp) => <ExperienceCard key={exp.id} exp={exp} />)}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-[1320px] mx-auto h-px bg-gold/30 mx-4 md:mx-9" />

      {/* Instructor spotlight */}
      <section className="px-4 md:px-9 py-14 sm:py-20">
        <div className="max-w-[1320px] mx-auto">
          <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
            <div>
              <Eyebrow>Conheça quem ensina</Eyebrow>
              <h2 className="font-display font-normal text-[1.65rem] sm:text-[2.1rem] leading-[1.15]">
                Instrutores em <em className="italic text-terra">destaque</em>
              </h2>
            </div>
            <button disabled title="Funcionalidade em breve" className="disabled:opacity-50 disabled:cursor-not-allowed font-body text-[0.66rem] tracking-[0.14em] uppercase text-muted-foreground hover:text-terra transition-colors inline-flex items-center gap-1">
              Em breve <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] bg-parchment border border-border">
            <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[380px] overflow-hidden">
              <img src={IMAGES.ceramic} alt="Ana Lima" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="p-7 sm:p-10 flex flex-col justify-center">
              <h3 className="font-display text-[1.6rem] mb-1 flex items-center gap-2">
                Ana Lima <Award className="w-4 h-4 text-gold" />
              </h3>
              <div className="text-[0.72rem] text-muted-foreground flex items-center gap-1 mb-3">
                <MapPin className="w-3 h-3" /> Ouro Preto, MG
              </div>
              <p className="text-[0.85rem] text-foreground/70 leading-relaxed mb-6">Pedra-Sabão & Cerâmica</p>
              <div className="grid grid-cols-3 gap-4 mb-7 py-5 border-y border-border">
                {[["8", "Experiências"], ["4.9", "Avaliação"], ["1.2k", "Alunos"]].map(([n, l]) => (
                  <div key={l}>
                    <div className="font-display text-[1.4rem] text-terra">{n}</div>
                    <div className="text-[0.58rem] tracking-[0.12em] uppercase text-muted-foreground mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button className="bg-espresso text-cream px-5 py-2.5 font-body text-[0.68rem] tracking-[0.14em] uppercase hover:bg-foreground transition-colors">
                  Ver Experiências
                </button>
                <button className="bg-transparent border border-foreground text-foreground px-5 py-2.5 font-body text-[0.68rem] tracking-[0.14em] uppercase hover:bg-foreground hover:text-background transition-colors">
                  Seguir
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-espresso text-parchment px-4 md:px-9 py-16 sm:py-20 text-center">
        <div className="max-w-[680px] mx-auto">
          <Sparkles className="w-6 h-6 text-gold-light mx-auto mb-4" />
          <h2 className="font-display font-light text-[2rem] sm:text-[2.6rem] leading-[1.1] mb-4">
            Você também sabe fazer algo <em className="italic text-gold-light">único?</em>
          </h2>
          <p className="text-[0.88rem] font-light leading-[1.85] text-parchment/55 mb-7">
            Transforme sua técnica em renda extra. Crie sua primeira experiência em poucos minutos.
          </p>
          <button disabled title="Funcionalidade em breve" className="disabled:opacity-50 disabled:cursor-not-allowed bg-terra text-background px-8 py-3.5 font-body font-medium text-[0.72rem] tracking-[0.14em] uppercase hover:brightness-90 hover:-translate-y-px transition-all">
            Em breve
          </button>
        </div>
      </section>
    </div>
  );
};

export default ExperiencesPage;
