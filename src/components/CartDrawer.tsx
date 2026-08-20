import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCents } from "@/lib/data";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import CheckoutModal from "@/components/CheckoutModal";

const CartDrawer = () => {
  const { items, isOpen, setIsOpen, updateQty, removeItem, totalItems, totalCents } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const goToCheckout = () => {
    setIsOpen(false);
    if (!user) {
      // Sem sessão não dá para criar pedido: a edge function exige JWT.
      navigate("/login?next=/checkout");
      return;
    }
    setCheckoutOpen(true);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex flex-col p-0 w-full sm:max-w-[420px]">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="font-display text-xl font-medium">Seu Carrinho</SheetTitle>
          <SheetDescription className="text-xs tracking-[0.1em] uppercase text-muted-foreground">
            {totalItems} {totalItems === 1 ? "item" : "itens"}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground px-6">
            <ShoppingBag className="w-12 h-12 opacity-30" />
            <p className="font-body text-sm">Seu carrinho está vazio</p>
            <button
              onClick={() => setIsOpen(false)}
              className="font-body text-xs tracking-[0.12em] uppercase border border-foreground px-5 py-2 hover:bg-foreground hover:text-background transition-colors"
            >
              Continuar comprando
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 pb-4 border-b border-border last:border-b-0">
                  <div className="w-20 h-20 shrink-0 overflow-hidden bg-parchment">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover saturate-[0.86]"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-medium text-sm leading-tight mb-0.5 truncate">
                      {item.name}
                    </div>
                    <div className="text-[0.65rem] tracking-[0.05em] text-muted-foreground mb-2">
                      por <span className="text-terra font-medium">{item.artist}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-border">
                        <button
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-parchment transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-medium">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-parchment transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-medium">
                          {formatCents(item.priceCents * item.qty)}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <SheetFooter className="flex-col gap-3 px-6 py-5 border-t border-border bg-parchment">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs tracking-[0.1em] uppercase text-muted-foreground font-medium">Subtotal</span>
                <span className="font-display text-lg font-medium">{formatCents(totalCents)}</span>
              </div>
              <p className="text-[0.6rem] text-muted-foreground tracking-wide">
                Valor confirmado pelo servidor no checkout · Parcele em até 6x
              </p>
              <button
                onClick={goToCheckout}
                className="w-full bg-foreground text-background font-body text-xs tracking-[0.14em] uppercase font-medium py-3 hover:bg-espresso transition-colors"
              >
                Finalizar Compra
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full bg-transparent border border-border font-body text-xs tracking-[0.14em] uppercase font-medium py-3 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              >
                Continuar Comprando
              </button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
      </Sheet>
      <CheckoutModal open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </>
  );
};

export default CartDrawer;
