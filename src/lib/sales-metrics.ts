export interface SalesOrder {
  id: string;
  status: string;
  total_cents: number;
}

export interface SalesItem {
  order_id: string;
  artisan_user_id: string | null;
  quantity: number;
  unit_price_cents: number;
}

export interface SalesMetrics {
  total: number;
  paid: number;
  gross: number;
  pending: number;
  refunded: number;
  sellers: number;
  average: number;
}

/**
 * Métricas da central de vendas. Extraído do componente para poder ser testado
 * — números financeiros errados na tela do admin viram decisão errada.
 *
 * Só pedidos 'paid' contam como receita: pendente ainda pode falhar e
 * reembolsado saiu do caixa.
 */
export function computeSalesMetrics(orders: SalesOrder[], items: SalesItem[]): SalesMetrics {
  const paid = orders.filter((o) => o.status === "paid");
  const gross = paid.reduce((s, o) => s + o.total_cents, 0);
  const pending = orders.filter((o) => o.status === "pending").reduce((s, o) => s + o.total_cents, 0);
  const refunded = orders.filter((o) => o.status === "refunded").reduce((s, o) => s + o.total_cents, 0);
  const sellers = new Set(items.map((i) => i.artisan_user_id).filter(Boolean)).size;
  return {
    total: orders.length,
    paid: paid.length,
    gross,
    pending,
    refunded,
    sellers,
    // Divisão por zero viraria NaN na tela.
    average: paid.length ? Math.round(gross / paid.length) : 0,
  };
}

/** Total vendido por artesão, considerando apenas pedidos pagos. */
export function buildLeaderboard(orders: SalesOrder[], items: SalesItem[]): [string, number][] {
  const paidIds = new Set(orders.filter((o) => o.status === "paid").map((o) => o.id));
  const totals = new Map<string, number>();
  for (const item of items) {
    if (!item.artisan_user_id || !paidIds.has(item.order_id)) continue;
    totals.set(
      item.artisan_user_id,
      (totals.get(item.artisan_user_id) ?? 0) + item.quantity * item.unit_price_cents,
    );
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

/** Escapa um campo para CSV: aspas internas dobradas, conforme RFC 4180. */
export function csvCell(value: unknown): string {
  return `"${String(value ?? "").split('"').join('""')}"`;
}
