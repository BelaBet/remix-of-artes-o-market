import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import CheckoutModal from "@/components/CheckoutModal";

/**
 * Rota /checkout — fallback compartilhável do fluxo de compra.
 *
 * O caminho principal é o modal aberto pelo carrinho; esta página existe para
 * quem recarrega ou acessa o link direto. Ela NÃO reimplementa o checkout:
 * renderiza o mesmo CheckoutModal, para que as duas entradas nunca divirjam.
 */
const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items } = useCart();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate("/login?next=/checkout", { replace: true });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <span className="text-[0.8rem] text-muted-foreground">Carregando…</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 text-center bg-parchment/40">
        <p className="font-display text-[1.4rem]">Seu carrinho está vazio</p>
        <button
          onClick={() => navigate("/")}
          className="border border-foreground px-5 py-2 font-body text-[0.66rem] tracking-[0.14em] uppercase hover:bg-foreground hover:text-background transition-colors"
        >
          Voltar à loja
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-parchment/40">
      <CheckoutModal
        open
        onOpenChange={(next) => {
          if (!next) navigate("/");
        }}
      />
    </div>
  );
};

export default CheckoutPage;
