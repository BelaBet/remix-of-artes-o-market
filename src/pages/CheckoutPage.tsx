import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCents } from "@/lib/data";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Lock } from "lucide-react";

export function isValidCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const d = (sum * 10) % 11;
    return d === 10 ? 0 : d;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

const maskCPF = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");

type Method = "pix" | "credit_card" | "boleto";

const input =
  "w-full border border-border bg-background px-3 py-2 font-body text-[0.82rem] outline-none focus:border-terra transition-colors";
const label = "block text-[0.58rem] tracking-[0.16em] uppercase text-muted-foreground mb-1";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, totalCents, clearCart } = useCart();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [buyer, setBuyer] = useState({ name: "", email: "", document: "", phone: "" });
  const [address, setAddress] = useState({ zip: "", street: "", number: "", complement: "", district: "", city: "", state: "" });
  const [method, setMethod] = useState<Method>("pix");
  const [installments, setInstallments] = useState(1);
  const [card, setCard] = useState({ number: "", holder: "", exp: "", cvv: "" });

  useEffect(() => {
    if (!loading && !user) navigate("/login?next=/checkout", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) {
      setBuyer((b) => ({ ...b, email: b.email || user.email || "", name: b.name || (user.user_metadata?.display_name as string) || "" }));
    }
  }, [user]);

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-[1.4rem]">Seu carrinho está vazio</p>
        <button onClick={() => navigate("/")} className="border border-foreground px-5 py-2 font-body text-[0.66rem] tracking-[0.14em] uppercase hover:bg-foreground hover:text-background transition-colors">
          Voltar à loja
        </button>
      </div>
    );
  }

  const step1Valid =
    buyer.name.trim().length > 2 &&
    /^\S+@\S+\.\S+$/.test(buyer.email) &&
    isValidCPF(buyer.document) &&
    address.zip.replace(/\D/g, "").length === 8 &&
    address.street.trim() !== "" &&
    address.number.trim() !== "" &&
    address.city.trim() !== "" &&
    address.state.trim().length === 2;

  const lookupCep = async (zip: string) => {
    const digits = zip.replace(/\D/g, "");
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress((a) => ({ ...a, street: data.logradouro || a.street, district: data.bairro || a.district, city: data.localidade || a.city, state: data.uf || a.state }));
      }
    } catch {
      /* preenchimento manual */
    }
  };

  const tokenizeCard = async (): Promise<string> => {
    const pk = import.meta.env.VITE_PAGARME_PUBLIC_KEY as string | undefined;
    if (!pk) throw new Error("Pagamento com cartão indisponível no momento.");
    const [mm, yy] = card.exp.split("/").map((s) => s.trim());
    const res = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${encodeURIComponent(pk)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "card",
        card: {
          number: card.number.replace(/\s/g, ""),
          holder_name: card.holder,
          exp_month: Number(mm),
          exp_year: Number(yy?.length === 2 ? `20${yy}` : yy),
          cvv: card.cvv,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.id) throw new Error("Não foi possível validar os dados do cartão.");
    return data.id as string;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      let card_token: string | undefined;
      if (method === "credit_card") card_token = await tokenizeCard();

      const { data, error } = await supabase.functions.invoke("criar-pedido", {
        body: {
          items: items.map((i) => ({ product_id: i.id, quantity: i.qty })),
          buyer: {
            name: buyer.name.trim(),
            email: buyer.email.trim(),
            document: buyer.document.replace(/\D/g, ""),
            phone: buyer.phone.replace(/\D/g, "") || undefined,
          },
          shipping_address: {
            zip_code: address.zip.replace(/\D/g, ""),
            line_1: `${address.number}, ${address.street}, ${address.district}`,
            line_2: address.complement || undefined,
            city: address.city,
            state: address.state.toUpperCase(),
            country: "BR",
          },
          payment_method: method,
          card_token,
          installments: method === "credit_card" ? installments : undefined,
        },
      });

      if (error) throw new Error("Não foi possível concluir o pedido. Tente novamente.");
      if (!data?.order_id) throw new Error(data?.error ?? "Não foi possível concluir o pedido.");

      clearCart();
      navigate(`/pedido/${data.order_id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao finalizar a compra.");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = ["Seus dados", "Pagamento", "Confirmação"];

  return (
    <div className="min-h-screen bg-parchment/40">
      <div className="max-w-[980px] mx-auto px-4 py-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-[0.68rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-terra mb-5">
          <ArrowLeft className="w-3.5 h-3.5" /> Continuar comprando
        </button>

        <h1 className="font-display text-[1.9rem] mb-1">Finalizar compra</h1>
        <div className="flex gap-4 mb-6 flex-wrap">
          {steps.map((s, i) => (
            <span key={s} className={`text-[0.62rem] tracking-[0.14em] uppercase ${step === i + 1 ? "text-terra font-semibold" : "text-muted-foreground"}`}>
              {i + 1}. {s}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="bg-background border border-border p-5">
            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className={label}>Nome completo</label>
                  <input className={input} value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} />
                </div>
                <div>
                  <label className={label}>E-mail</label>
                  <input className={input} type="email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Telefone</label>
                  <input className={input} value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <label className={label}>CPF</label>
                  <input className={input} value={buyer.document} onChange={(e) => setBuyer({ ...buyer, document: maskCPF(e.target.value) })} placeholder="000.000.000-00" />
                  {buyer.document.length >= 14 && !isValidCPF(buyer.document) && (
                    <div className="text-[0.62rem] text-destructive mt-1">CPF inválido — confira os dígitos.</div>
                  )}
                </div>
                <div>
                  <label className={label}>CEP</label>
                  <input className={input} value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })} onBlur={(e) => lookupCep(e.target.value)} placeholder="00000-000" />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Rua</label>
                  <input className={input} value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Número</label>
                  <input className={input} value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Complemento</label>
                  <input className={input} value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Bairro</label>
                  <input className={input} value={address.district} onChange={(e) => setAddress({ ...address, district: e.target.value })} />
                </div>
                <div className="grid grid-cols-[1fr_80px] gap-2">
                  <div>
                    <label className={label}>Cidade</label>
                    <input className={input} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>UF</label>
                    <input className={input} maxLength={2} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })} />
                  </div>
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={!step1Valid}
                  className="sm:col-span-2 bg-foreground text-background py-3 font-body text-[0.66rem] tracking-[0.14em] uppercase font-medium disabled:opacity-40"
                >
                  Continuar
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                  {([
                    { key: "pix", label: "PIX", hint: "Aprovação em minutos" },
                    { key: "credit_card", label: "Cartão", hint: "Até 6x" },
                    { key: "boleto", label: "Boleto", hint: "Até 3 dias úteis" },
                  ] as const).map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setMethod(m.key)}
                      className={`border p-3 text-left transition-colors ${method === m.key ? "border-terra bg-terra/5" : "border-border hover:border-terra/50"}`}
                    >
                      <div className="font-display text-[1rem]">{m.label}</div>
                      <div className="text-[0.62rem] text-muted-foreground">{m.hint}</div>
                    </button>
                  ))}
                </div>

                {method === "credit_card" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className={label}>Número do cartão</label>
                      <input className={input} inputMode="numeric" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="0000 0000 0000 0000" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={label}>Nome impresso</label>
                      <input className={input} value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value.toUpperCase() })} />
                    </div>
                    <div>
                      <label className={label}>Validade (MM/AA)</label>
                      <input className={input} value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} placeholder="12/29" />
                    </div>
                    <div>
                      <label className={label}>CVV</label>
                      <input className={input} inputMode="numeric" maxLength={4} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={label}>Parcelas</label>
                      <select className={input} value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n}x de {formatCents(Math.round(totalCents / n))}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="sm:col-span-2 flex items-center gap-1.5 text-[0.62rem] text-muted-foreground">
                      <Lock className="w-3 h-3" /> Os dados do cartão vão criptografados direto ao Pagar.me — nunca passam pelos nossos servidores.
                    </p>
                  </div>
                )}

                <div className="flex gap-2 mt-5">
                  <button onClick={() => setStep(1)} className="border border-border px-5 py-3 font-body text-[0.66rem] tracking-[0.14em] uppercase text-muted-foreground">
                    Voltar
                  </button>
                  <button onClick={() => setStep(3)} className="flex-1 bg-foreground text-background py-3 font-body text-[0.66rem] tracking-[0.14em] uppercase font-medium">
                    Revisar pedido
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="font-display text-[1.1rem] mb-3">Confirme seu pedido</div>
                <div className="text-[0.78rem] text-muted-foreground space-y-1 mb-4">
                  <div>{buyer.name} · {buyer.document}</div>
                  <div>{buyer.email}</div>
                  <div>
                    {address.street}, {address.number} {address.complement} — {address.city}/{address.state} · CEP {address.zip}
                  </div>
                  <div className="text-foreground font-medium">
                    Pagamento: {method === "pix" ? "PIX" : method === "boleto" ? "Boleto" : `Cartão em ${installments}x`}
                  </div>
                </div>
                <p className="text-[0.65rem] text-muted-foreground mb-4">
                  O valor final é calculado e confirmado pelo servidor no momento da cobrança.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setStep(2)} className="border border-border px-5 py-3 font-body text-[0.66rem] tracking-[0.14em] uppercase text-muted-foreground">
                    Voltar
                  </button>
                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="flex-1 bg-terra text-background py-3 font-body text-[0.66rem] tracking-[0.14em] uppercase font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Confirmar e pagar
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="bg-background border border-border p-5">
            <div className="font-display text-[1.05rem] mb-3">Resumo</div>
            {items.map((i) => (
              <div key={i.id} className="flex justify-between gap-2 text-[0.76rem] mb-2">
                <span className="text-muted-foreground">
                  {i.qty}× {i.name}
                </span>
                <span>{formatCents(i.priceCents * i.qty)}</span>
              </div>
            ))}
            <div className="border-t border-border mt-3 pt-3 flex justify-between items-center">
              <span className="text-[0.62rem] tracking-[0.12em] uppercase text-muted-foreground">Total</span>
              <span className="font-display text-[1.2rem]">{formatCents(totalCents)}</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
