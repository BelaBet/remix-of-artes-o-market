import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCents } from "@/lib/data";
import { toast } from "sonner";
import { Loader2, Copy, ArrowLeft, CheckCircle2 } from "lucide-react";

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Aguardando pagamento", className: "bg-gold/10 text-gold" },
  paid: { label: "Pago", className: "bg-sage/10 text-sage" },
  failed: { label: "Pagamento recusado", className: "bg-destructive/10 text-destructive" },
  canceled: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
  refunded: { label: "Reembolsado", className: "bg-muted text-muted-foreground" },
};

const copy = (value: string) => {
  navigator.clipboard.writeText(value);
  toast.success("Copiado!");
};

const Countdown = ({ expiresAt }: { expiresAt: string }) => {
  const [left, setLeft] = useState(() => new Date(expiresAt).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(new Date(expiresAt).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (left <= 0) return <span className="text-destructive">QR Code expirado</span>;
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <span>
      Expira em {m}:{String(s).padStart(2, "0")}
    </span>
  );
};

const OrderDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    enabled: !!id,
    refetchInterval: (q) => ((q.state.data as { status?: string } | undefined)?.status === "pending" ? 5000 : false),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(id, product_name, quantity, unit_price_cents)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-[1.4rem]">Pedido não encontrado</p>
        <button onClick={() => navigate("/")} className="border border-foreground px-5 py-2 font-body text-[0.66rem] tracking-[0.14em] uppercase hover:bg-foreground hover:text-background">
          Voltar à loja
        </button>
      </div>
    );
  }

  const status = STATUS[order.status] ?? { label: order.status, className: "bg-muted text-muted-foreground" };
  const items = (order.order_items ?? []) as { id: string; product_name: string; quantity: number; unit_price_cents: number }[];

  return (
    <div className="min-h-screen bg-parchment/40">
      <div className="max-w-[760px] mx-auto px-4 py-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-[0.68rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-terra mb-5">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar à loja
        </button>

        <div className="bg-background border border-border p-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <div className="text-[0.6rem] tracking-[0.18em] uppercase text-muted-foreground">Pedido</div>
              <h1 className="font-display text-[1.6rem]">#{order.id.slice(0, 8)}</h1>
            </div>
            <span className={`text-[0.58rem] tracking-[0.1em] uppercase font-semibold px-2.5 py-1 ${status.className}`}>{status.label}</span>
          </div>

          {order.status === "pending" && (
            <p className="text-[0.72rem] text-muted-foreground mb-4">
              Esta página se atualiza sozinha assim que o pagamento for confirmado.
            </p>
          )}
          {order.status === "paid" && (
            <p className="flex items-center gap-2 text-[0.8rem] text-sage mb-4">
              <CheckCircle2 className="w-4 h-4" /> Pagamento confirmado. Seus artesãos já foram avisados!
            </p>
          )}

          {order.payment_method === "pix" && order.status === "pending" && order.pix_qr_code && (
            <div className="border border-border p-4 mb-4">
              <div className="font-display text-[1.05rem] mb-3">Pague com PIX</div>
              {order.pix_qr_code_url && (
                <img src={order.pix_qr_code_url} alt="QR Code do PIX" className="w-44 h-44 mb-3 border border-border" />
              )}
              <div className="text-[0.68rem] text-muted-foreground break-all bg-parchment p-2 mb-2">{order.pix_qr_code}</div>
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => copy(order.pix_qr_code!)} className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-[0.62rem] tracking-[0.12em] uppercase hover:border-terra hover:text-terra">
                  <Copy className="w-3.5 h-3.5" /> Copiar código
                </button>
                {order.pix_expires_at && (
                  <span className="text-[0.68rem] text-muted-foreground">
                    <Countdown expiresAt={order.pix_expires_at} />
                  </span>
                )}
              </div>
            </div>
          )}

          {order.payment_method === "boleto" && order.status === "pending" && (
            <div className="border border-border p-4 mb-4">
              <div className="font-display text-[1.05rem] mb-3">Boleto bancário</div>
              {order.boleto_barcode && (
                <div className="text-[0.7rem] text-muted-foreground break-all bg-parchment p-2 mb-2">{order.boleto_barcode}</div>
              )}
              <div className="flex gap-2 flex-wrap">
                {order.boleto_barcode && (
                  <button onClick={() => copy(order.boleto_barcode!)} className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-[0.62rem] tracking-[0.12em] uppercase hover:border-terra hover:text-terra">
                    <Copy className="w-3.5 h-3.5" /> Copiar linha digitável
                  </button>
                )}
                {order.boleto_url && (
                  <a href={order.boleto_url} target="_blank" rel="noreferrer" className="border border-border px-3 py-1.5 text-[0.62rem] tracking-[0.12em] uppercase hover:border-terra hover:text-terra">
                    Abrir boleto (PDF)
                  </a>
                )}
              </div>
            </div>
          )}

          {order.payment_method === "credit_card" && order.status === "failed" && (
            <div className="border border-destructive/40 bg-destructive/5 p-4 mb-4 text-[0.78rem] text-destructive">
              O pagamento no cartão foi recusado. Tente novamente com outro cartão ou escolha PIX.
            </div>
          )}

          <div className="border-t border-border pt-4">
            <div className="text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2">Itens</div>
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-[0.8rem] mb-1.5">
                <span className="text-muted-foreground">
                  {i.quantity}× {i.product_name}
                </span>
                <span>{formatCents(i.unit_price_cents * i.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center border-t border-border mt-3 pt-3">
              <span className="text-[0.62rem] tracking-[0.12em] uppercase text-muted-foreground">Total</span>
              <span className="font-display text-[1.25rem]">{formatCents(order.total_cents)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;
