import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CartProvider, useCart } from "@/contexts/CartContext";
import { PRODUCTS } from "@/lib/data";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

describe("CartContext", () => {
  it("começa vazio (o header não deve mostrar contador fantasma)", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it("adiciona item e soma quantidade em vez de duplicar a linha", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const id = PRODUCTS[0].id;

    act(() => result.current.addItem(id));
    act(() => result.current.addItem(id));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.totalItems).toBe(2);
    expect(result.current.totalPrice).toBe(PRODUCTS[0].price * 2);
  });

  it("updateQty com 0 remove o item", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const id = PRODUCTS[0].id;

    act(() => result.current.addItem(id));
    act(() => result.current.updateQty(id, 0));

    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
  });

  it("ignora produto inexistente sem quebrar", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(999999));
    expect(result.current.items).toHaveLength(0);
  });

  it("clearCart zera o carrinho", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(PRODUCTS[0].id));
    act(() => result.current.addItem(PRODUCTS[1].id));
    act(() => result.current.clearCart());
    expect(result.current.totalItems).toBe(0);
  });
});
