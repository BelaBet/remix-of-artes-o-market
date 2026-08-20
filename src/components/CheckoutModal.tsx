import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCheckout, type PaymentMethod } from "@/hooks/useCheckout";
import { formatCents } from "@/lib/data";
import { maskCEP, maskCPF, maskCardNumber, maskExpiry, maskPhone, cardBrand } from "@/lib/checkout-form";
import { toast } from "sonner";
import { Loader2, QrCode, CreditCard, Barcode, Copy, Check, CircleCheck, CircleX } from "lucide-react";

const inputCls =
  "w-full border border-border bg-background px-3 py-2 font-body text-[0.82rem] outline-none focus:border-terra transition-colors";
const labelCls = "block text-[0.58rem] tracking-[0.16em] uppercase text-muted-foreground mb-1";

const METHODS: { key: PaymentMethod; label: string; hint: string; icon: JSX.Element }[] = [
  { key: "pix", label: "PIX", hint: "Aprovação em segundos", icon: <QrCode className="w-5 h-5" /> },
  { key: "credit_card", label: "Cartão de crédito", hint: "Em até 6x", icon: <CreditCard className="w-5 h-5" /> },
  { key: "boleto", label: "Boleto", hint: "Vence em 3 dias", icon: <Barcode className="w-5 h-5" /> },
];

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex gap-2">
        <input readOnly value={value} className={`${inputCls} font-mono text-[0.7rem]`} />
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              toast.error("Não foi possível copiar. Selecione e copie manualmente.");
            }
          }}
          className="shrink-0 border border-foreground px-3 flex items-center gap-1.5 text-[0.62rem] tracking-[0.12em] uppercase hover:bg-foreground hover:text-background transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, new Date(expiresAt).getTime() - Date.now())), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  if (left <= 0) return <span className="text-destructive">Código expirado — refaça o pedido.</span>;
  return (
    <span>
      Expira em <strong className="text-terra">{mm}:{ss}</strong>
    </span>
  );
}

const CheckoutModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const navigate = useNavigate();
  const c = useCheckout();
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

  useEffect(() => {
    if (c.error) toast.error(c.error);
  }, [c.error]);

  // Sinaliza cobrança em andamento para o PWAUpdater adiar o reload.
  useEffect(() => {
    document.body.dataset.paymentInFlight = c.submitting ? "true" : "false";
    return () => {
      document.body.dataset.paymentInFlight = "false";
    };
  }, [c.submitting]);

  // Enquanto processa o pagamento não deixamos fechar: o usuário poderia achar
  // que cancelou uma cobrança que já foi enviada.
  const guard = (next: boolean) => {
    if (c.submitting) return;
    if (!next && c.result) c.reset();
    onOpenChange(next);
  };

  const steps = ["Dados", "Pagamento", "Confirmação"];
  const r = c.result;

  return (
    <Dialog open={open} onOpenChange={guard}>
      <DialogContent
        className="max-w-[560px] max-h-[90vh] overflow-y-auto rounded-none border-border"
        onInteractOutside={(e) => c.submitting && e.preventDefault()}
        onEscapeKeyDown={(e) => c.submitting && e.preventDefault()}
      >
        {/* ---------- RESULTADO ---------- */}
        {r ? (
          <div className="space-y-5">
            {r.status === "paid" ? (
              <div className="text-center space-y-2">
                <CircleCheck className="w-10 h-10 text-sage mx-auto" />
                <h2 className="font-display text-[1.5rem]">Pagamento aprovado</h2>
                <p className="text-[0.8rem] text-muted-foreground">
                  Seu pedido de {formatCents(r.total_cents)} foi confirmado.
                </p>
              </div>
            ) : r.payment_method === "pix" ? (
              <div className="space-y-4 text-center">
                <h2 className="font-display text-[1.5rem]">Pague com PIX</h2>
                {r.pix_qr_code_url && (
                  <img
                    src={r.pix_qr_code_url}
                    alt="QR Code para pagamento via PIX"
                    className="w-[220px] h-[220px] mx-auto border border-border bg-white p-2"
                  />
                )}
                {r.pix_qr_code && <CopyField label="Código copia e cola" value={r.pix_qr_code} />}
                <p className="text-[0.72rem] text-muted-foreground">
                  {r.pix_expires_at ? <Countdown expiresAt={r.pix_expires_at} /> : "Válido por 30 minutos."}
                </p>
                <p className="text-[0.7rem] text-muted-foreground">
                  A confirmação chega automaticamente assim que o banco liquidar.
                </p>
              </div>
            ) : r.payment_method === "boleto" ? (
              <div className="space-y-4">
                <h2 className="font-display text-[1.5rem] text-center">Boleto gerado</h2>
                {r.boleto_barcode && <CopyField label="Linha digitável" value={r.boleto_barcode} />}
                {r.boleto_url && (
                  <a
                    href={r.boleto_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center bg-espresso text-parchment py-3 text-[0.68rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all"
                  >
                    Abrir boleto em PDF
                  </a>
                )}
                <p className="text-[0.72rem] text-muted-foreground text-center">
                  A compensação leva até 3 dias úteis após o pagamento.
                </p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <CircleX className="w-10 h-10 text-destructive mx-auto" />
                <h2 className="font-display text-[1.5rem]">Pagamento não concluído</h2>
                <p className="text-[0.8rem] text-muted-foreground">Tente outro cartão ou método.</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  guard(false);
                  navigate(`/pedido/${r.order_id}`);
                }}
                className="flex-1 bg-foreground text-background py-3 text-[0.66rem] tracking-[0.14em] uppercase hover:bg-espresso transition-colors"
              >
                Acompanhar pedido
              </button>
              <button
                onClick={() => guard(false)}
                className="flex-1 border border-border py-3 text-[0.66rem] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ---------- PASSOS ---------- */}
            <div>
              <h2 className="font-display text-[1.5rem] mb-3">Finalizar compra</h2>
              <div className="flex gap-1.5 mb-1">
                {steps.map((s, i) => (
                  <div key={s} className="flex-1">
                    <div className={`h-[3px] ${step >= i + 1 ? "bg-terra" : "bg-border"}`} />
                    <div
                      className={`text-[0.58rem] tracking-[0.12em] uppercase mt-1.5 ${
                        step === i + 1 ? "text-terra font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      {i + 1}. {s}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field className="sm:col-span-2" label="Nome completo" error={c.buyerErrors.name}>
                  <input className={inputCls} value={c.buyer.name} onChange={(e) => c.setBuyer({ ...c.buyer, name: e.target.value })} />
                </Field>
                <Field label="E-mail" error={c.buyerErrors.email}>
                  <input className={inputCls} type="email" value={c.buyer.email} onChange={(e) => c.setBuyer({ ...c.buyer, email: e.target.value })} />
                </Field>
                <Field label="Celular" error={c.buyerErrors.phone}>
                  <input className={inputCls} value={c.buyer.phone} placeholder="(11) 99999-9999" onChange={(e) => c.setBuyer({ ...c.buyer, phone: maskPhone(e.target.value) })} />
                </Field>
                <Field label="CPF" error={c.buyerErrors.document}>
                  <input className={inputCls} value={c.buyer.document} placeholder="000.000.000-00" onChange={(e) => c.setBuyer({ ...c.buyer, document: maskCPF(e.target.value) })} />
                </Field>
                <Field label={c.cepLoading ? "CEP (buscando…)" : "CEP"} error={c.buyerErrors.zip}>
                  <input className={inputCls} value={c.buyer.zip} placeholder="00000-000" onChange={(e) => c.setBuyer({ ...c.buyer, zip: maskCEP(e.target.value) })} onBlur={(e) => c.lookupCep(e.target.value)} />
                </Field>
                <Field className="sm:col-span-2" label="Rua" error={c.buyerErrors.street}>
                  <input className={inputCls} value={c.buyer.street} onChange={(e) => c.setBuyer({ ...c.buyer, street: e.target.value })} />
                </Field>
                <Field label="Número" error={c.buyerErrors.number}>
                  <input className={inputCls} value={c.buyer.number} onChange={(e) => c.setBuyer({ ...c.buyer, number: e.target.value })} />
                </Field>
                <Field label="Complemento" error={c.buyerErrors.complement}>
                  <input className={inputCls} value={c.buyer.complement ?? ""} onChange={(e) => c.setBuyer({ ...c.buyer, complement: e.target.value })} />
                </Field>
                <Field label="Bairro" error={c.buyerErrors.district}>
                  <input className={inputCls} value={c.buyer.district} onChange={(e) => c.setBuyer({ ...c.buyer, district: e.target.value })} />
                </Field>
                <Field label="Cidade" error={c.buyerErrors.city}>
                  <input className={inputCls} value={c.buyer.city} onChange={(e) => c.setBuyer({ ...c.buyer, city: e.target.value })} />
                </Field>
                <Field label="UF" error={c.buyerErrors.state}>
                  <input className={inputCls} maxLength={2} value={c.buyer.state} onChange={(e) => c.setBuyer({ ...c.buyer, state: e.target.value.toUpperCase() })} />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {METHODS.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => c.setMethod(m.key)}
                      className={`border p-3 text-left transition-colors ${
                        c.method === m.key ? "border-terra bg-terra/[0.06]" : "border-border hover:border-foreground"
                      }`}
                    >
                      <span className={c.method === m.key ? "text-terra" : "text-muted-foreground"}>{m.icon}</span>
                      <div className="font-medium text-[0.8rem] mt-2">{m.label}</div>
                      <div className="text-[0.62rem] text-muted-foreground">{m.hint}</div>
                    </button>
                  ))}
                </div>

                {c.method === "credit_card" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border pt-4">
                    <Field className="sm:col-span-2" label={`Número do cartão${cardBrand(c.card.number) ? ` · ${cardBrand(c.card.number)}` : ""}`} error={c.cardErrors.number}>
                      <input className={inputCls} inputMode="numeric" value={c.card.number} placeholder="0000 0000 0000 0000" onChange={(e) => c.setCard({ ...c.card, number: maskCardNumber(e.target.value) })} />
                    </Field>
                    <Field className="sm:col-span-2" label="Nome impresso no cartão" error={c.cardErrors.holder}>
                      <input className={inputCls} value={c.card.holder} onChange={(e) => c.setCard({ ...c.card, holder: e.target.value.toUpperCase() })} />
                    </Field>
                    <Field label="Validade" error={c.cardErrors.exp}>
                      <input className={inputCls} inputMode="numeric" placeholder="MM/AA" value={c.card.exp} onChange={(e) => c.setCard({ ...c.card, exp: maskExpiry(e.target.value) })} />
                    </Field>
                    <Field label="CVV" error={c.cardErrors.cvv}>
                      <input className={inputCls} inputMode="numeric" placeholder="000" value={c.card.cvv} onChange={(e) => c.setCard({ ...c.card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
                    </Field>
                    <Field className="sm:col-span-2" label="Parcelas">
                      <select className={inputCls} value={c.installments} onChange={(e) => c.setInstallments(Number(e.target.value))}>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n}x de {formatCents(Math.round(c.totalCents / n))}
                            {n === 1 ? " à vista" : " sem juros"}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <p className="sm:col-span-2 text-[0.62rem] text-muted-foreground">
                      Os dados do cartão vão criptografados direto ao Pagar.me. Não passam pelos nossos servidores.
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div className="border border-border divide-y divide-border">
                  {c.items.map((i) => (
                    <div key={i.id} className="flex justify-between gap-3 p-3 text-[0.78rem]">
                      <span className="min-w-0">
                        <span className="font-medium">{i.name}</span>
                        <span className="text-muted-foreground"> × {i.qty}</span>
                      </span>
                      <span className="shrink-0">{formatCents(i.priceCents * i.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[0.62rem] tracking-[0.14em] uppercase text-muted-foreground">Total</span>
                  <span className="font-display text-[1.3rem]">{formatCents(c.totalCents)}</span>
                </div>
                <p className="text-[0.64rem] text-muted-foreground">
                  Pagamento via <strong>{METHODS.find((m) => m.key === c.method)?.label}</strong>. O valor final é
                  confirmado pelo servidor no momento da cobrança.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  disabled={c.submitting}
                  className="px-5 border border-border py-3 text-[0.66rem] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-50"
                >
                  Voltar
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={(step === 1 && !c.buyerValid) || (step === 2 && !c.paymentValid)}
                  className="flex-1 bg-foreground text-background py-3 text-[0.66rem] tracking-[0.14em] uppercase hover:bg-espresso transition-colors disabled:opacity-40"
                >
                  Continuar
                </button>
              ) : (
                <button
                  onClick={() => c.submit()}
                  disabled={c.submitting}
                  className="flex-1 bg-terra text-background py-3 text-[0.66rem] tracking-[0.14em] uppercase hover:brightness-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {c.submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {c.submitting ? "Processando…" : `Pagar ${formatCents(c.totalCents)}`}
                </button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

function Field({
  label,
  error,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
      {error && <div className="text-[0.62rem] text-destructive mt-1">{error}</div>}
    </div>
  );
}

export default CheckoutModal;
