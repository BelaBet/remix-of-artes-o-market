import stoneImg from "@/assets/stone.jpg";
import weaveImg from "@/assets/weave.jpg";
import woodImg from "@/assets/wood.jpg";
import straw1Img from "@/assets/straw1.jpg";
import potteryImg from "@/assets/pottery.jpg";
import ceramicImg from "@/assets/ceramic.jpg";
import basketImg from "@/assets/basket.jpg";
import straw2Img from "@/assets/straw2.jpg";

export const IMAGES: Record<string, string> = {
  stone: stoneImg,
  weave: weaveImg,
  wood: woodImg,
  straw1: straw1Img,
  pottery: potteryImg,
  ceramic: ceramicImg,
  basket: basketImg,
  straw2: straw2Img,
};

export const PRODUCTS = [
  { id: 1, img: "stone", name: "Caixas de Pedra-Sabão", artist: "Ana Lima", city: "Ouro Preto, MG", price: 129, badge: "dest" as const, stars: 5, reviews: 42 },
  { id: 2, img: "weave", name: "Peça de Macramê", artist: "Carla B.", city: "Salvador, BA", price: 85, badge: "off" as const, stars: 5, reviews: 87, oldPrice: 110 },
  { id: 3, img: "wood", name: "Escultura em Madeira", artist: "Maria S.", city: "Caruaru, PE", price: 210, badge: "novo" as const, stars: 4, reviews: 23 },
  { id: 4, img: "straw1", name: "Trançado de Buriti", artist: "João N.", city: "Tocantins, TO", price: 65, badge: null, stars: 4, reviews: 31 },
  { id: 5, img: "pottery", name: "Vaso de Cerâmica", artist: "Lucia F.", city: "Florianópolis, SC", price: 175, badge: "dest" as const, stars: 5, reviews: 65 },
  { id: 6, img: "ceramic", name: "Peças de Barro Rústico", artist: "Teresa C.", city: "Limoeiro, PE", price: 95, badge: null, stars: 5, reviews: 54 },
  { id: 7, img: "basket", name: "Cestos Trançados", artist: "Fernanda R.", city: "Aracaju, SE", price: 58, badge: "novo" as const, stars: 4, reviews: 18 },
  { id: 8, img: "straw2", name: "Cesta de Palha", artist: "Rosa A.", city: "Campina Grande, PB", price: 145, badge: null, stars: 5, reviews: 39 },
];

export const ARTISANS = [
  { img: "ceramic", name: "Ana Lima", loc: "Ouro Preto, MG", spec: "Pedra-Sabão & Cerâmica", sales: "342", rating: "4.9", followers: "1.2k", verified: true },
  { img: "weave", name: "Maria Souza", loc: "Caruaru, PE", spec: "Macramê & Fibras Naturais", sales: "218", rating: "5.0", followers: "894", verified: true },
  { img: "wood", name: "João Neto", loc: "Tocantins, TO", spec: "Escultura em Madeira", sales: "156", rating: "4.8", followers: "520", verified: false },
];

export const CATEGORIES = [
  { img: "stone", name: "Pedra-Sabão" },
  { img: "weave", name: "Macramê" },
  { img: "wood", name: "Madeira" },
  { img: "straw1", name: "Palha" },
  { img: "pottery", name: "Cerâmica" },
  { img: "ceramic", name: "Barro" },
  { img: "basket", name: "Cestos" },
  { img: "straw2", name: "Tecidos" },
];

export const ORDERS = [
  { id: "#4521", buyer: "Juliana P.", items: "Pedra-Sabão × 1", val: 129, status: "novo" as const },
  { id: "#4520", buyer: "Roberto M.", items: "Macramê × 2", val: 170, status: "prod" as const },
  { id: "#4519", buyer: "Camila S.", items: "Cesta de Palha", val: 145, status: "env" as const },
  { id: "#4518", buyer: "Felipe A.", items: "Cerâmica × 1", val: 95, status: "ent" as const },
  { id: "#4517", buyer: "Bruna L.", items: "Escultura", val: 210, status: "ent" as const },
];

export const CONVERSATIONS = [
  { id: 1, img: "straw1", name: "Juliana P.", preview: "Faz encomenda personalizada?", time: "10:32", unread: true },
  { id: 2, img: "weave", name: "Roberto M.", preview: "Produto chegou perfeito!", time: "09:15", unread: false },
  { id: 3, img: "pottery", name: "Camila S.", preview: "Qual o prazo de envio?", time: "Ontem", unread: true },
  { id: 4, img: "wood", name: "Felipe A.", preview: "Tem em outras cores?", time: "Seg", unread: false },
];

export const MESSAGES = [
  { dir: "in", text: "Olá! Você faz encomendas personalizadas?", time: "10:30" },
  { dir: "out", text: "Olá! Sim, com prazer. O que tem em mente?", time: "10:31" },
  { dir: "in", text: "Uma caixinha com as iniciais J+R — presente de casamento 💍", time: "10:32" },
  { dir: "out", text: "Que ideia encantadora! 10 dias úteis após confirmação.", time: "10:33" },
  { dir: "in", text: "Adorei! Pode me enviar fotos de trabalhos anteriores?", time: "10:34" },
];

export const BADGE_MAP: Record<string, { className: string; label: string }> = {
  dest: { className: "bg-espresso text-gold-light", label: "Destaque" },
  novo: { className: "bg-sage text-primary-foreground", label: "Novo" },
  off: { className: "border border-terra text-terra", label: "Promoção" },
};

export const STATUS_MAP: Record<string, { className: string; label: string }> = {
  novo: { className: "bg-gold/10 text-gold", label: "Novo" },
  prod: { className: "bg-terra/10 text-terra", label: "Produção" },
  env: { className: "bg-sage/10 text-sage", label: "Enviado" },
  ent: { className: "bg-espresso/10 text-espresso", label: "Entregue" },
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatPrice(brl: number): string {
  return BRL.format(brl);
}
