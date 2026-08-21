import { useCallback, useEffect, useMemo, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  buyerSchema,
  cardSchema,
  lookupCep as fetchCep,
  onlyDigits,
  type BuyerForm,
  type CardForm,
} from "@/lib/checkout-form";

export type PaymentMethod = "pix" | "credit_card" | "boleto";

export interface OrderResult {
  order_id: string;
  status: string;
  payment_method: PaymentMethod;
  total_cents: number;
  pix_qr_code: string | null;
  pix_qr_code_url: string | null;
  pix_expires_at: string | null;
  boleto_url: string | null;
  boleto_barcode: string | null;
}

const emptyBuyer: BuyerForm = {
  name: "",
  email: "",
  document: "",
  phone: "",
  zip: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

const emptyCard: CardForm = { number: "", holder: "", exp: "", cvv: "" };

/**
 * Toda a lógica de checkout vive aqui — validação, CEP, tokenização e criação
 * do pedido. O modal e a página /checkout consomem este hook, para que os dois
 * fluxos nunca divirjam.
 */
export function useCheckout() {
  const { items, totalCents, clearCart } = useCart();
  const { user } = useAuth();

  const [buyer, setBuyer] = useState<BuyerForm>(emptyBuyer);
  const [card, setCard] = useState<CardForm>(emptyCard);
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [installments, setInstallments] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);

  // Pré-preenche com o que já sabemos do usuário logado.
  useEffect(() => {
    if (!user) return;
    setBuyer((b) => ({
      ...b,
      email: b.email || user.email || "",
      name: b.name || ((user.user_metadata?.display_name as string) ?? ""),
    }));
  }, [user]);

  const buyerErrors = useMemo(() => {
    const parsed = buyerSchema.safeParse(buyer);
    if (parsed.success) return {} as Partial<Record<keyof BuyerForm, string>>;
    const out: Partial<Record<keyof BuyerForm, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof BuyerForm;
      if (key && !out[key]) out[key] = issue.message;
    }
    return out;
  }, [buyer]);

  const cardErrors = useMemo(() => {
    if (method !== "credit_card") return {} as Partial<Record<keyof CardForm, string>>;
    const parsed = cardSchema.safeParse(card);
    if (parsed.success) return {} as Partial<Record<keyof CardForm, string>>;
    const out: Partial<Record<keyof CardForm, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CardForm;
      if (key && !out[key]) out[key] = issue.message;
    }
    return out;
  }, [card, method]);

  const buyerValid = Object.keys(buyerErrors).length === 0;
  const paymentValid = method !== "credit_card" || Object.keys(cardErrors).length === 0;

  const lookupCep = useCallback(async (cep: string) => {
    if (onlyDigits(cep).length !== 8) return;
    setCepLoading(true);
    try {
      const found = await fetchCep(cep);
      if (found) {
        setBuyer((b) => ({
          ...b,
          street: found.street || b.street,
          district: found.district || b.district,
          city: found.city || b.city,
          state: found.state || b.state,
        }));
      }
    } catch {
      /* CEP indisponível: o usuário preenche à mão */
    } finally {
      setCepLoading(false);
    }
  }, []);

  /**
   * O cartão é tokenizado direto no navegador contra o Pagar.me, com a chave
   * PÚBLICA. Número, validade e CVV nunca chegam ao nosso backend nem ao banco.
   */
  const tokenizeCard = useCallback(async (): Promise<string> => {
    const pk = import.meta.env.VITE_PAGARME_PUBLIC_KEY as string | undefined;
    if (!pk) throw new Error("Pagamento com cartão indisponível no momento.");
    const digits = onlyDigits(card.exp);
    const res = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${encodeURIComponent(pk)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "card",
        card: {
          number: onlyDigits(card.number),
          holder_name: card.holder.trim(),
          exp_month: Number(digits.slice(0, 2)),
          exp_year: Number(`20${digits.slice(2)}`),
          cvv: onlyDigits(card.cvv),
        },
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.id) throw new Error("Não foi possível validar os dados do cartão.");
    return data.id as string;
  }, [card]);

  const submit = useCallback(async (): Promise<OrderResult | null> => {
    setSubmitting(true);
    setError(null);
    try {
      let card_token: string | undefined;
      if (method === "credit_card") card_token = await tokenizeCard();

      // Só id e quantidade: o valor cobrado é sempre recalculado no servidor.
      const { data, error: fnError } = await supabase.functions.invoke("criar-pedido", {
        body: {
          items: items.map((i) => ({ product_id: i.id, quantity: i.qty })),
          buyer: {
            name: buyer.name.trim(),
            email: buyer.email.trim(),
            document: onlyDigits(buyer.document),
            phone: onlyDigits(buyer.phone) || undefined,
          },
          shipping_address: {
            zip_code: onlyDigits(buyer.zip),
            line_1: `${buyer.number}, ${buyer.street}, ${buyer.district}`,
            line_2: buyer.complement || undefined,
            city: buyer.city,
            state: buyer.state.toUpperCase(),
            country: "BR",
          },
          payment_method: method,
          card_token,
          installments: method === "credit_card" ? installments : undefined,
        },
      });

      // supabase-js transforma qualquer status != 2xx em fnError e descarta o
      // corpo. Sem ler o corpo, "estoque insuficiente", "CPF inválido" e
      // "cartão recusado" virariam todos um genérico "tente novamente".
      if (fnError) {
        let motivo: string | null = null;
        const ctx = (fnError as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const corpo = await ctx.json();
            if (typeof corpo?.error === "string") motivo = corpo.error;
          } catch {
            /* corpo não era JSON: cai na mensagem genérica */
          }
        }
        throw new Error(motivo ?? "Não foi possível concluir o pedido. Tente novamente.");
      }
      if (!data?.order_id) throw new Error(data?.error ?? "Não foi possível concluir o pedido.");

      // O cartão fica só na memória do formulário; descartamos assim que usado.
      setCard(emptyCard);
      clearCart();
      setResult(data as OrderResult);
      return data as OrderResult;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao finalizar a compra.");
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [method, tokenizeCard, items, buyer, installments, clearCart]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setCard(emptyCard);
    setMethod("pix");
    setInstallments(1);
  }, []);

  return {
    items,
    totalCents,
    buyer,
    setBuyer,
    buyerErrors,
    buyerValid,
    card,
    setCard,
    cardErrors,
    paymentValid,
    method,
    setMethod,
    installments,
    setInstallments,
    submitting,
    result,
    error,
    cepLoading,
    lookupCep,
    submit,
    reset,
  };
}
