import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCents } from "@/lib/data";
import { Loader2 } from "lucide-react";

export interface ArtisanOrder {
  id: string;
  buyer_name: string;
  status: string;
  created_at: string;
  payment_method: string;
  items: { id: string; product_name: string; quantity: number; unit_price_cents: number }[];
  artisanTotalCents: number;
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  pending: { label: "Aguardando pagamento", className: "bg-gold/10 text-gold" },
  paid: { label: "Pago", className: "bg-sage/10 text-sage" },
  failed: { label: "Falhou", className: "bg-destructive/10 text-destructive" },
  canceled: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
  refunded: { label: "Reembolsado", className: "bg-muted text-muted-foreground" },
};

export function useArtisanOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["artisan-orders", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ArtisanOrder[]> => {
      const { data, error } = await supabase
        .from("order_items")
        .select("id, product_name, quantity, unit_price_cents, order_id, orders(id, buyer_name, status, created_at, payment_method)")
        .eq("artisan_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map = new Map<string, ArtisanOrder>();
      for (const row of data ?? []) {
        const o = row.orders as unknown as ArtisanOrder | null;
        if (!o) continue;
        const existing = map.get(o.id) ?? {
          id: o.id,
          buyer_name: o.buyer_name,
          status: o.status,
          created_at: o.created_at,
          payment_method: o.payment_method,
          items: [],
          artisanTotalCents: 0,
        };
        existing.items.push({
          id: row.id,
          product_name: row.product_name,
          quantity: row.quantity,
          unit_price_cents: row.unit_price_cents,
        });
        existing.artisanTotalCents += row.unit_price_cents * row.quantity;
        map.set(o.id, existing);
      }
      return [...map.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
  });
}

export const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_STYLE[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-block text-[0.55rem] tracking-[0.1em] uppercase font-semibold px-2 py-0.5 w-fit ${s.className}`}>
      {s.label}
    </span>
  );
};

const OrdersTab = () => {
  const { data: orders, isLoading } = useArtisanOrders();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-[1.3rem] mb-4">Pedidos com suas peças</h2>
      {(orders?.length ?? 0) === 0 ? (
        <div className="border border-dashed border-border py-14 text-center text-[0.8rem] text-muted-foreground">
          Nenhum pedido registrado ainda.
        </div>
      ) : (
        <div className="border border-border">
          {orders!.map((o) => (
            <div key={o.id} className="px-4 py-3 border-b border-border last:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span className="text-[0.68rem] text-muted-foreground font-medium">
                  #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString("pt-BR")}
                </span>
                <StatusBadge status={o.status} />
              </div>
              <div className="text-[0.85rem] font-medium">{o.buyer_name}</div>
              <div className="text-[0.7rem] text-muted-foreground mb-1">
                {o.items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}
              </div>
              <div className="font-display text-[1rem]">{formatCents(o.artisanTotalCents)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersTab;
