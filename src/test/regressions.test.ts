import { describe, it, expect } from "vitest";
import { formatPrice, PRODUCTS, BADGE_MAP, IMAGES } from "@/lib/data";

describe("formatPrice", () => {
  it("formata em BRL com separador de milhar e centavos", () => {
    // Antes retornava "R$ 1290"
    expect(formatPrice(1290)).toMatch(/1\.290,00/);
    expect(formatPrice(129)).toMatch(/129,00/);
  });

  it("inclui o símbolo da moeda", () => {
    expect(formatPrice(10)).toContain("R$");
  });

  it("trata zero sem cair em string vazia", () => {
    expect(formatPrice(0)).toMatch(/0,00/);
  });
});

describe("integridade do catálogo mock", () => {
  it("todo produto aponta para uma imagem existente", () => {
    for (const p of PRODUCTS) {
      expect(IMAGES[p.img], `imagem ausente: ${p.img}`).toBeDefined();
    }
  });

  it("todo badge de produto existe no BADGE_MAP", () => {
    for (const p of PRODUCTS) {
      if (p.badge) {
        expect(BADGE_MAP[p.badge], `badge ausente: ${p.badge}`).toBeDefined();
      }
    }
  });

  it("não há ids de produto duplicados", () => {
    const ids = PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stars fica entre 0 e 5 (evita repeat negativo no grid)", () => {
    for (const p of PRODUCTS) {
      expect(p.stars).toBeGreaterThanOrEqual(0);
      expect(p.stars).toBeLessThanOrEqual(5);
    }
  });

  it("oldPrice, quando existe, é maior que o preço atual", () => {
    for (const p of PRODUCTS) {
      if ("oldPrice" in p && p.oldPrice) {
        expect(p.oldPrice).toBeGreaterThan(p.price);
      }
    }
  });
});
