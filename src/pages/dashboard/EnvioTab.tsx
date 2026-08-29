import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Package, Truck, Handshake, MapPin } from "lucide-react";

type Carrier = "correios" | "melhor_envio" | "combinar";

interface Origem {
  shipping_carrier: Carrier;
  origin_zip_code: string | null;
  origin_street: string | null;
  origin_number: string | null;
  origin_complement: string | null;
  origin_district: string | null;
  origin_city: string | null;
  origin_state: string | null;
  origin_phone: string | null;
}

const inputCls =
  "w-full border border-border bg-background px-3 py-2 font-body text-[0.82rem] outline-none focus:border-terra transition-colors";
const labelCls = "block text-[0.58rem] tracking-[0.16em] uppercase text-muted-foreground mb-1";

const onlyDigits = (v: string) => v.replace(/\D/g, "");

const OPCOES: { key: Carrier; nome: string; desc: string; icon: JSX.Element }[] = [
  {
    key: "combinar",
    nome: "Combinar com o comprador",
    desc: "Sem frete cobrado no checkout. Você combina a entrega diretamente após a venda.",
    icon: <Handshake className="w-5 h-5" />,
  },
  {
    key: "correios",
    nome: "Correios",
    desc: "Frete calculado automaticamente. Requer endereço de origem cadastrado.",
    icon: <Package className="w-5 h-5" />,
  },
  {
    key: "melhor_envio",
    nome: "Transportadora (Melhor Envio)",
    desc: "Frete calculado via agregador de transportadoras. Requer endereço de origem.",
    icon: <Truck className="w-5 h-5" />,
  },
];

/**
 * Preferência de logística do artesão: qual transportadora ele usa e, se
 * escolher Correios ou Melhor Envio, o endereço de onde despacha.
 *
 * "Combinar" é o padrão — funciona sem nenhum dado extra, então o artesão
 * já pode vender no primeiro dia.
 */
const EnvioTab = () => {
  const { user } = useAuth();
  const [origem, setOrigem] = useState<Origem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [carrier, setCarrier] = useState<Carrier>("combinar");
  const [endereco, setEndereco] = useState({
    origin_zip_code: "",
    origin_street: "",
    origin_number: "",
    origin_complement: "",
    origin_district: "",
    origin_city: "",
    origin_state: "",
    origin_phone: "",
  });

  const carregar = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("artisan_billing")
      .select(
        "shipping_carrier, origin_zip_code, origin_street, origin_number, origin_complement, origin_district, origin_city, origin_state, origin_phone",
      )
      .eq("artisan_user_id", user.id)
      .maybeSingle();
    if (data) {
      setOrigem(data as Origem);
      setCarrier(data.shipping_carrier as Carrier);
      setEndereco({
        origin_zip_code: data.origin_zip_code ?? "",
        origin_street: data.origin_street ?? "",
        origin_number: data.origin_number ?? "",
        origin_complement: data.origin_complement ?? "",
        origin_district: data.origin_district ?? "",
        origin_city: data.origin_city ?? "",
        origin_state: data.origin_state ?? "",
        origin_phone: data.origin_phone ?? "",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const precisaEndereco = carrier === "correios" || carrier === "melhor_envio";
  const enderecoCompleto =
    onlyDigits(endereco.origin_zip_code).length === 8 &&
    endereco.origin_street.trim().length > 0 &&
    endereco.origin_number.trim().length > 0 &&
    endereco.origin_city.trim().length > 0 &&
    endereco.origin_state.trim().length === 2;

  const salvar = async () => {
    if (!user) return;
    if (precisaEndereco && !enderecoCompleto) {
      toast.error("Preencha o endereço de origem para usar frete calculado.");
      return;
    }
    setSaving(true);
    const payload = { artisan_user_id: user.id, shipping_carrier: carrier, ...endereco };
    const { error } = origem
      ? await supabase.from("artisan_billing").update(payload).eq("artisan_user_id", user.id)
      : await supabase.from("artisan_billing").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar. Tente novamente.");
      return;
    }
    toast.success("Preferência de envio salva!");
    await carregar();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-[620px]">
      <h2 className="font-display text-[1.3rem] mb-1">Envio</h2>
      <p className="text-[0.78rem] text-muted-foreground mb-5">
        Escolha como você despacha suas peças. Pode trocar quando quiser — a mudança vale para os
        próximos pedidos.
      </p>

      <div className="grid grid-cols-1 gap-2 mb-5">
        {OPCOES.map((o) => (
          <button
            key={o.key}
            onClick={() => setCarrier(o.key)}
            className={`border p-3.5 text-left transition-colors flex gap-3 ${
              carrier === o.key ? "border-terra bg-terra/[0.06]" : "border-border hover:border-foreground"
            }`}
          >
            <span className={carrier === o.key ? "text-terra shrink-0" : "text-muted-foreground shrink-0"}>
              {o.icon}
            </span>
            <span>
              <span className="block font-medium text-[0.84rem]">{o.nome}</span>
              <span className="block text-[0.68rem] text-muted-foreground mt-0.5">{o.desc}</span>
            </span>
          </button>
        ))}
      </div>

      {precisaEndereco && (
        <div className="border border-border p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-terra" />
            <span className="text-[0.8rem] font-medium">Endereço de onde você despacha</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>CEP</label>
              <input
                className={inputCls}
                inputMode="numeric"
                value={endereco.origin_zip_code}
                onChange={(e) => setEndereco({ ...endereco, origin_zip_code: onlyDigits(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelCls}>Telefone</label>
              <input
                className={inputCls}
                value={endereco.origin_phone}
                onChange={(e) => setEndereco({ ...endereco, origin_phone: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Rua</label>
              <input
                className={inputCls}
                value={endereco.origin_street}
                onChange={(e) => setEndereco({ ...endereco, origin_street: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Número</label>
              <input
                className={inputCls}
                value={endereco.origin_number}
                onChange={(e) => setEndereco({ ...endereco, origin_number: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Complemento</label>
              <input
                className={inputCls}
                value={endereco.origin_complement}
                onChange={(e) => setEndereco({ ...endereco, origin_complement: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Bairro</label>
              <input
                className={inputCls}
                value={endereco.origin_district}
                onChange={(e) => setEndereco({ ...endereco, origin_district: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Cidade</label>
              <input
                className={inputCls}
                value={endereco.origin_city}
                onChange={(e) => setEndereco({ ...endereco, origin_city: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>UF</label>
              <input
                className={inputCls}
                maxLength={2}
                value={endereco.origin_state}
                onChange={(e) => setEndereco({ ...endereco, origin_state: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
        </div>
      )}

      <button
        onClick={salvar}
        disabled={saving}
        className="w-full bg-espresso text-parchment py-3 font-body text-[0.68rem] tracking-[0.16em] uppercase hover:brightness-125 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {saving ? "Salvando…" : "Salvar preferência de envio"}
      </button>
    </div>
  );
};

export default EnvioTab;
