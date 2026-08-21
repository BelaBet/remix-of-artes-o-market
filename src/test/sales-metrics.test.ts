import { describe, it, expect } from "vitest";
import {
  computeSalesMetrics,
  buildLeaderboard,
  csvCell,
  type SalesOrder,
  type SalesItem,
} from "@/lib/sales-metrics";

const orders: SalesOrder[] = [
  { id: "o1", status: "paid", total_cents: 10000 },
  { id: "o2", status: "paid", total_cents: 5000 },
  { id: "o3", status: "pending", total_cents: 7000 },
  { id: "o4", status: "refunded", total_cents: 3000 },
  { id: "o5", status: "failed", total_cents: 9900 },
];

const items: SalesItem[] = [
  { order_id: "o1", artisan_user_id: "ana", quantity: 2, unit_price_cents: 5000 },
  { order_id: "o2", artisan_user_id: "joao", quantity: 1, unit_price_cents: 5000 },
  { order_id: "o3", artisan_user_id: "maria", quantity: 1, unit_price_cents: 7000 },
  { order_id: "o4", artisan_user_id: "ana", quantity: 1, unit_price_cents: 3000 },
];

describe("computeSalesMetrics", () => {
  const m = computeSalesMetrics(orders, items);

  it("conta receita apenas de pedidos pagos", () => {
    // Pendente ainda pode falhar; reembolsado e recusado não são receita.
    expect(m.gross).toBe(15000);
    expect(m.paid).toBe(2);
  });

  it("não mistura pendente e reembolsado na receita", () => {
    expect(m.pending).toBe(7000);
    expect(m.refunded).toBe(3000);
  });

  it("conta todos os pedidos, inclusive os que falharam", () => {
    expect(m.total).toBe(5);
  });

  it("calcula ticket médio sobre os pagos", () => {
    expect(m.average).toBe(7500);
  });

  it("não retorna NaN quando não há pedido pago", () => {
    const vazio = computeSalesMetrics([{ id: "x", status: "pending", total_cents: 100 }], []);
    expect(vazio.average).toBe(0);
    expect(Number.isNaN(vazio.average)).toBe(false);
  });

  it("conta vendedores distintos sem duplicar", () => {
    // 'ana' aparece em dois pedidos e deve contar uma vez.
    expect(m.sellers).toBe(3);
  });

  it("ignora itens sem artesão associado", () => {
    const r = computeSalesMetrics(orders, [
      ...items,
      { order_id: "o1", artisan_user_id: null, quantity: 1, unit_price_cents: 100 },
    ]);
    expect(r.sellers).toBe(3);
  });

  it("lida com base totalmente vazia", () => {
    const r = computeSalesMetrics([], []);
    expect(r).toEqual({ total: 0, paid: 0, gross: 0, pending: 0, refunded: 0, sellers: 0, average: 0 });
  });
});

describe("buildLeaderboard", () => {
  it("soma apenas o que veio de pedidos pagos", () => {
    const lb = buildLeaderboard(orders, items);
    const ana = lb.find(([id]) => id === "ana");
    // ana vendeu 2x5000 no pedido pago o1; os 3000 de o4 foram reembolsados.
    expect(ana?.[1]).toBe(10000);
  });

  it("exclui artesão cujo pedido não foi pago", () => {
    const lb = buildLeaderboard(orders, items);
    expect(lb.find(([id]) => id === "maria")).toBeUndefined();
  });

  it("ordena do maior para o menor", () => {
    const lb = buildLeaderboard(orders, items);
    expect(lb.map(([id]) => id)).toEqual(["ana", "joao"]);
  });

  it("multiplica quantidade pelo preço unitário", () => {
    const lb = buildLeaderboard(
      [{ id: "o9", status: "paid", total_cents: 30000 }],
      [{ order_id: "o9", artisan_user_id: "z", quantity: 3, unit_price_cents: 10000 }],
    );
    expect(lb[0][1]).toBe(30000);
  });
});

describe("csvCell", () => {
  it("envolve o valor em aspas", () => {
    expect(csvCell("Ana")).toBe('"Ana"');
  });

  it("dobra aspas internas para não quebrar a coluna", () => {
    expect(csvCell('Vaso "Sol"')).toBe('"Vaso ""Sol"""');
  });

  it("preserva vírgula sem estourar para a próxima coluna", () => {
    expect(csvCell("Caruaru, PE")).toBe('"Caruaru, PE"');
  });

  it("trata nulo e indefinido como vazio", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });
});
