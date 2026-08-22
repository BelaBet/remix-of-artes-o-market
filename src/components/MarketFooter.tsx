const footCols = [
  { t: "Comprar", l: ["Catálogo completo", "Artesãos", "Novidades", "Promoções"] },
  { t: "Vender", l: ["Criar minha loja", "Como funciona", "Taxas", "Suporte"] },
  { t: "Ajuda", l: ["Central de ajuda", "Trocas e devoluções", "Entrega", "Contato"] },
];

const MarketFooter = () => (
  <footer className="bg-[#100a04] py-12 sm:py-[60px] px-4 md:px-9 pb-7">
    <div className="max-w-[1320px] mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-11">
        <div className="col-span-2 md:col-span-1">
          <div className="font-display text-[1.3rem] sm:text-[1.4rem] font-semibold text-parchment mb-2 flex flex-wrap items-center gap-2">
            Feito <em className="italic text-gold">à Mão</em>
            <span className="font-body text-[0.5rem] tracking-[0.16em] uppercase bg-gold/10 text-gold-light border border-gold/20 px-1.5 py-0.5 font-semibold">
              🇧🇷 Made in Brasil
            </span>
          </div>
          <p className="text-[0.76rem] sm:text-[0.78rem] leading-[1.85] text-parchment/30 font-light max-w-[260px] mb-3">
            Feito com cuidado no Brasil, amado em todo o mundo. Conectando artesãos brasileiros desde 2024.
          </p>
          <div className="text-[0.66rem] sm:text-[0.68rem] text-parchment/25 tracking-[0.05em] pt-3 border-t border-parchment/5">
            ✈️ Frete internacional grátis em pedidos acima de R$600 · 50+ países
          </div>
        </div>
        {footCols.map((col) => (
          <div key={col.t}>
            <div className="text-[0.58rem] tracking-[0.18em] uppercase text-parchment/25 mb-3">{col.t}</div>
            <ul className="list-none">
              {col.l.map((item) => (
                <li key={item} className="mb-2 text-[0.74rem] sm:text-[0.76rem] text-parchment/40 cursor-pointer font-light hover:text-gold-light transition-colors">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-parchment/5 pt-5 flex flex-col sm:flex-row sm:justify-between gap-2 text-[0.64rem] sm:text-[0.66rem] text-parchment/15 tracking-[0.04em]">
        <span>© 2026 Feito à Mão — Todos os direitos reservados</span>
        <span className="flex gap-4">
          <a href="/termos" className="hover:text-gold-light transition-colors">Termos de uso</a>
          <a href="/privacidade" className="hover:text-gold-light transition-colors">Privacidade</a>
        </span>
      </div>
    </div>
  </footer>
);

export default MarketFooter;
