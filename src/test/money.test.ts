import { describe, it, expect } from "vitest";
import { reaisToCents, centsToReaisInput } from "@/lib/money";

describe("reaisToCents", () => {
  it("converte o formato brasileiro", () => {
    expect(reaisToCents("129,90")).toBe(12990);
    expect(reaisToCents("1.290,90")).toBe(129090);
    expect(reaisToCents("1.000")).toBe(100000);
  });

  it("aceita ponto como decimal quando não há vírgula", () => {
    // Quem digita no teclado numérico costuma usar ponto. Sem esta regra,
    // "129.90" viraria R$ 12.990,00 — cem vezes o preço pretendido.
    expect(reaisToCents("129.90")).toBe(12990);
    expect(reaisToCents("89.9")).toBe(8990);
  });

  it("mantém o ponto como milhar quando não parece decimal", () => {
    expect(reaisToCents("1.290")).toBe(129000);
    expect(reaisToCents("1.234.567")).toBe(123456700);
  });

  it("ignora símbolo de moeda e espaços", () => {
    expect(reaisToCents("R$ 89,90")).toBe(8990);
  });

  it("completa centavos faltantes", () => {
    expect(reaisToCents("129")).toBe(12900);
    expect(reaisToCents("129,9")).toBe(12990);
  });

  it("trata valores pequenos sem perder centavo", () => {
    expect(reaisToCents("0,05")).toBe(5);
    expect(reaisToCents("0,99")).toBe(99);
  });

  it("retorna zero para entrada vazia ou inválida", () => {
    expect(reaisToCents("")).toBe(0);
    expect(reaisToCents("abc")).toBe(0);
  });

  it("preserva o sinal negativo para o formulário poder rejeitar", () => {
    expect(reaisToCents("-50")).toBe(-5000);
    expect(reaisToCents("-12,34")).toBe(-1234);
  });

  it("sempre devolve inteiro (dinheiro nunca em float)", () => {
    for (const v of ["129,90", "0,01", "1.290,55", "7,77"]) {
      expect(Number.isInteger(reaisToCents(v))).toBe(true);
    }
  });
});

describe("ida e volta entre reais e centavos", () => {
  it("não perde valor no ciclo", () => {
    for (const cents of [1, 99, 100, 12990, 129090, 1000000]) {
      expect(reaisToCents(centsToReaisInput(cents))).toBe(cents);
    }
  });
});
