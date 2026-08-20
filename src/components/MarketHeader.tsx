import { useState } from "react";
import { Menu, X, Search, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface MarketHeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isLoggedIn?: boolean;
  onSignOut?: () => void;
}

const MarketHeader = ({ currentPage, onNavigate, isLoggedIn, onSignOut }: MarketHeaderProps) => {
  const { setIsOpen, totalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const displayCount = totalItems;

  const go = (p: string) => { onNavigate(p); setMenuOpen(false); };

  const tabs = [
    { key: "home", label: "Início" },
    { key: "catalog", label: "Catálogo" },
    { key: "experiences", label: "Experiências" },
    ...(isLoggedIn
      ? [
          { key: "dashboard", label: "Painel do Artesão" },
          { key: "chat", label: "Mensagens" },
        ]
      : []),
  ];

  return (
    <>
      {/* Top banner */}
      <div className="bg-espresso text-gold-light text-center py-2 px-3 sm:px-5 text-[0.6rem] sm:text-[0.7rem] tracking-[0.08em] sm:tracking-[0.1em] font-medium leading-snug">
        ✈️ Frete grátis Brasil acima de R$200 · Enviamos para 50+ países
      </div>

      {/* Header */}
      <header className="sticky top-0 z-[200] bg-background/95 backdrop-blur-[18px] border-b border-border px-4 md:px-9">
        <div className="max-w-[1320px] mx-auto flex items-center h-[58px] md:h-[68px] gap-3 md:gap-5">
          <div
            className="font-display font-semibold text-[1.15rem] md:text-[1.42rem] tracking-[0.04em] text-foreground cursor-pointer flex items-center gap-2 shrink-0"
            onClick={() => go("home")}
          >
            Feito <em className="italic text-terra">à Mão</em>
            <span className="hidden sm:inline font-body text-[0.52rem] tracking-[0.16em] uppercase bg-espresso text-gold-light px-1.5 py-0.5 font-semibold">
              🇧🇷 Brasil
            </span>
          </div>

          {/* Desktop search */}
          <div className="hidden md:flex flex-1 max-w-[320px] items-center gap-2 border-b border-border pb-1 focus-within:border-terra transition-colors">
            <span className="text-muted-foreground text-[0.88rem]">⌕</span>
            <input
              className="flex-1 border-none bg-transparent outline-none font-body text-[0.8rem] text-foreground placeholder:text-muted-foreground"
              placeholder="Buscar artesanato, artesãos…"
            />
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 ml-auto shrink-0">
            <button
              onClick={() => onNavigate("catalog")}
              className="bg-transparent border-none cursor-pointer font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-muted-foreground px-3 py-1.5 hover:text-foreground transition-colors whitespace-nowrap"
            >
              Catálogo
            </button>
            <button
              onClick={() => onNavigate("experiences")}
              className="bg-transparent border-none cursor-pointer font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-muted-foreground px-3 py-1.5 hover:text-foreground transition-colors whitespace-nowrap"
            >
              Experiências
            </button>

            {isLoggedIn && (
              <>
                <button
                  onClick={() => onNavigate("chat")}
                  className="bg-transparent border-none cursor-pointer font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-muted-foreground px-3 py-1.5 hover:text-foreground transition-colors whitespace-nowrap"
                >
                  Mensagens
                </button>
                <button
                  onClick={() => onNavigate("dashboard")}
                  className="bg-transparent border-none cursor-pointer font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-muted-foreground px-3 py-1.5 hover:text-foreground transition-colors whitespace-nowrap"
                >
                  Minha Loja
                </button>
              </>
            )}

            <button
              onClick={() => setIsOpen(true)}
              className="bg-transparent border-none cursor-pointer font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-muted-foreground px-3 py-1.5 hover:text-foreground transition-colors whitespace-nowrap"
            >
              Carrinho
              {displayCount > 0 && (
                <span className="inline-flex items-center justify-center bg-terra text-background w-[15px] h-[15px] rounded-full text-[0.56rem] font-semibold ml-0.5">
                  {displayCount}
                </span>
              )}
            </button>

            {isLoggedIn ? (
              <button
                onClick={onSignOut}
                className="bg-transparent border border-foreground cursor-pointer font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-foreground px-4 py-1.5 hover:bg-foreground hover:text-background transition-colors whitespace-nowrap"
              >
                Sair
              </button>
            ) : (
              <button
                onClick={() => onNavigate("artisan-login")}
                className="bg-transparent border border-foreground cursor-pointer font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-foreground px-4 py-1.5 hover:bg-foreground hover:text-background transition-colors whitespace-nowrap"
              >
                Entrar
              </button>
            )}
          </nav>

          {/* Mobile actions */}
          <div className="flex lg:hidden items-center gap-1 ml-auto shrink-0">
            <button
              onClick={() => setSearchOpen(s => !s)}
              aria-label="Buscar"
              className="md:hidden p-2 text-foreground"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => setIsOpen(true)}
              aria-label="Carrinho"
              className="relative p-2 text-foreground"
            >
              <ShoppingBag className="w-[18px] h-[18px]" />
              {displayCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center bg-terra text-background min-w-[16px] h-[16px] rounded-full text-[0.55rem] font-semibold px-1">
                  {displayCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
              className="p-2 text-foreground"
            >
              {menuOpen ? <X className="w-[20px] h-[20px]" /> : <Menu className="w-[20px] h-[20px]" />}
            </button>
          </div>
        </div>

        {/* Mobile search input */}
        {searchOpen && (
          <div className="md:hidden pb-3 px-1 flex items-center gap-2 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              className="flex-1 border-none bg-transparent outline-none font-body text-sm py-1 placeholder:text-muted-foreground"
              placeholder="Buscar artesanato, artesãos…"
            />
          </div>
        )}

        {/* Mobile menu panel */}
        {menuOpen && (
          <div className="lg:hidden border-t border-border bg-background py-3 -mx-4 md:-mx-9 px-4 md:px-9">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => go(t.key)}
                className={`block w-full text-left py-3 font-body text-[0.78rem] tracking-[0.1em] uppercase border-b border-border/60 ${
                  currentPage === t.key ? "text-terra" : "text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
            <div className="pt-4">
              {isLoggedIn ? (
                <button
                  onClick={() => { onSignOut?.(); setMenuOpen(false); }}
                  className="w-full border border-foreground py-2.5 font-body text-[0.72rem] tracking-[0.14em] uppercase"
                >
                  Sair
                </button>
              ) : (
                <button
                  onClick={() => go("artisan-login")}
                  className="w-full border border-foreground py-2.5 font-body text-[0.72rem] tracking-[0.14em] uppercase"
                >
                  Entrar
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Desktop tabs */}
      <div className="hidden md:flex bg-parchment border-b border-border px-9 overflow-x-auto">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`bg-transparent border-none cursor-pointer font-body text-[0.68rem] font-medium tracking-[0.12em] uppercase py-3 px-4 border-b-2 -mb-px transition-all whitespace-nowrap ${
              currentPage === key
                ? "text-foreground border-b-terra"
                : "text-muted-foreground border-b-transparent hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
};

export default MarketHeader;
