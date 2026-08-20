import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CartProvider, useCart, type CartProduct } from "@/contexts/CartContext";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

const A: CartProduct = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Vaso de Cerâmica",
  artist: "Ana Lima",
  priceCents: 17500,
  imageUrl: null,
};
const B: CartProduct = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Cesta de Palha",
  artist: "Rosa A.",
  priceCents: 14500,
  imageUrl: null,
};

describe("CartContext", () => {
  beforeEach(() => localStorage.clear());

  it("começa vazio (o header não deve mostrar contador fantasma)", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalCents).toBe(0);
  });

  it("adiciona item e soma quantidade em vez de duplicar a linha", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(A));
    act(() => result.current.addItem(A));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.totalItems).toBe(2);
    expect(result.current.totalCents).toBe(A.priceCents * 2);
  });

  it("total é inteiro em centavos, sem erro de ponto flutuante", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem({ ...A, priceCents: 10 }, 3));
    expect(Number.isInteger(result.current.totalCents)).toBe(true);
    expect(result.current.totalCents).toBe(30);
  });

  it("updateQty com 0 remove o item", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(A));
    act(() => result.current.updateQty(A.id, 0));

    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
  });

  it("clearCart zera o carrinho", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(A));
    act(() => result.current.addItem(B));
    act(() => result.current.clearCart());
    expect(result.current.totalItems).toBe(0);
  });
});
