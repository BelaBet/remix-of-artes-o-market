import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Clock, XCircle, Landmark } from "lucide-react";

interface Billing {
  pagarme_recipient_id: string | null;
  kyc_status: string;
  kyc_url: string | null;
  can_withdraw: boolean;
  recipient_status: string | null;
}

const inputCls =
  "w-full border border-border bg-background px-3 py-2 font-body text-[0.82rem] outline-none focus:border-terra transition-colors";
const labelCls = "block text-[0.58rem] tracking-[0.16em] uppercase text-muted-foreground mb-1";

const onlyDigits = (v: string) => v.replace(/\D/g, "");

/**
 * Cadastro de recebimento do artesão.
 *
 * Sem isto não há split: o gateway precisa saber para qual conta enviar a
 * parte do artesão. Os dados bancários vão direto para a Edge Function e de
 * lá para o Pagar.me — no nosso banco ficam apenas os últimos dígitos.
 */
const RecebimentoTab = () => {
  const { user } = useAuth();
  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    holder_name: "",
    holder_document: "",
    bank_code: "",
    branch_number: "",
    account_number: "",
    account_check_digit: "",
    account_type: "checking" as "checking" | "savings",
  });

  const carregar = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("artisan_billing")
      .select("pagarme_recipient_id, kyc_status, kyc_url, can_withdraw, recipient_status")
      .eq("artisan_user_id", user.id)
      .maybeSingle();
    setBilling((data as Billing) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const enviar = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("criar-recebedor", {
        body: { ...form, holder_document: onlyDigits(form.holder_document) },
      });
      if (error) {
        let motivo: string | null = null;
        const ctx = (error as { context?: Response }).context;
        if (ctx?.json) {
          try {
            const corpo = await ctx.json();
            if (typeof corpo?.error === "string") motivo = corpo.error;
          } catch {
            /* corpo não era JSON */
          }
        }
        throw new Error(motivo ?? "Não foi possível cadastrar o recebimento.");
      }
      toast.success("Recebimento enviado para análise!");
      if (data?.kyc_url) window.open(data.kyc_url, "_blank", "noopener");
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cadastrar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Já cadastrado: mostra a situação.
  if (billing?.pagarme_recipient_id) {
    const aprovado = billing.kyc_status === "aprovado" && billing.can_withdraw;
    const recusado = billing.kyc_status === "recusado";
    return (
      <div className="bg-background border border-border p-6 max-w-[560px]">
        <div className="flex items-start gap-3">
          {aprovado ? (
            <CheckCircle2 className="w-6 h-6 text-sage shrink-0" />
          ) : recusado ? (
            <XCircle className="w-6 h-6 text-destructive shrink-0" />
          ) : (
            <Clock className="w-6 h-6 text-gold shrink-0" />
          )}
          <div>
            <h3 className="font-display text-[1.2rem] mb-1">
              {aprovado ? "Recebimento ativo" : recusado ? "Cadastro recusado" : "Em análise"}
            </h3>
            <p className="text-[0.8rem] text-muted-foreground">
              {aprovado
                ? "Suas vendas são repassadas automaticamente para sua conta, já descontada a comissão da plataforma."
                : recusado
                  ? "O banco recusou os dados enviados. Fale com o suporte para reenviar."
                  : "O gateway está analisando seus documentos. Enquanto isso, suas peças ficam indisponíveis para compra."}
            </p>
            {billing.kyc_url && !aprovado && (
              <a
                href={billing.kyc_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 border border-foreground px-4 py-2 text-[0.64rem] tracking-[0.14em] uppercase hover:bg-foreground hover:text-background transition-colors"
              >
                Enviar documentos
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const preenchido =
    form.holder_name.trim().length >= 3 &&
    onlyDigits(form.holder_document).length >= 11 &&
    onlyDigits(form.bank_code).length === 3 &&
    onlyDigits(form.branch_number).length > 0 &&
    onlyDigits(form.account_number).length > 0;

  return (
    <div className="bg-background border border-border p-6 max-w-[560px]">
      <div className="flex items-center gap-2 mb-1">
        <Landmark className="w-5 h-5 text-terra" />
        <h3 className="font-display text-[1.3rem]">Onde você recebe</h3>
      </div>
      <p className="text-[0.78rem] text-muted-foreground mb-5">
        Cada venda é dividida automaticamente: sua parte cai direto na sua conta e a comissão fica
        com a plataforma. Enquanto este cadastro não for aprovado, suas peças não podem ser vendidas.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className={labelCls}>Nome do titular</label>
          <input
            className={inputCls}
            value={form.holder_name}
            onChange={(e) => setForm({ ...form, holder_name: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>CPF ou CNPJ do titular</label>
          <input
            className={inputCls}
            inputMode="numeric"
            value={form.holder_document}
            onChange={(e) => setForm({ ...form, holder_document: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Banco (3 dígitos)</label>
          <input
            className={inputCls}
            inputMode="numeric"
            placeholder="001"
            maxLength={3}
            value={form.bank_code}
            onChange={(e) => setForm({ ...form, bank_code: onlyDigits(e.target.value) })}
          />
        </div>
        <div>
          <label className={labelCls}>Agência (sem dígito)</label>
          <input
            className={inputCls}
            inputMode="numeric"
            value={form.branch_number}
            onChange={(e) => setForm({ ...form, branch_number: onlyDigits(e.target.value) })}
          />
        </div>
        <div>
          <label className={labelCls}>Conta</label>
          <input
            className={inputCls}
            inputMode="numeric"
            value={form.account_number}
            onChange={(e) => setForm({ ...form, account_number: onlyDigits(e.target.value) })}
          />
        </div>
        <div>
          <label className={labelCls}>Dígito da conta</label>
          <input
            className={inputCls}
            inputMode="numeric"
            maxLength={2}
            value={form.account_check_digit}
            onChange={(e) => setForm({ ...form, account_check_digit: onlyDigits(e.target.value) })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Tipo de conta</label>
          <select
            className={inputCls}
            value={form.account_type}
            onChange={(e) =>
              setForm({ ...form, account_type: e.target.value as "checking" | "savings" })
            }
          >
            <option value="checking">Conta corrente</option>
            <option value="savings">Conta poupança</option>
          </select>
        </div>
      </div>

      <button
        onClick={enviar}
        disabled={!preenchido || saving}
        className="w-full mt-5 bg-espresso text-parchment py-3 font-body text-[0.68rem] tracking-[0.16em] uppercase hover:brightness-125 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {saving ? "Enviando…" : "Cadastrar recebimento"}
      </button>
      <p className="text-[0.62rem] text-muted-foreground mt-2 text-center">
        Seus dados bancários vão criptografados direto ao Pagar.me. Guardamos apenas os últimos
        dígitos para você conferir.
      </p>
    </div>
  );
};

export default RecebimentoTab;
