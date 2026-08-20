import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";

// Verifica se há nova versão a cada 30 min (e ao voltar para a aba).
const INTERVALO_CHECAGEM = 30 * 60 * 1000;

const PWAUpdater = () => {
  const { totalItems } = useCart();
  // Ref para o handler de update ler o carrinho atual sem virar dependência.
  const itensRef = useRef(totalItems);
  itensRef.current = totalItems;

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;

      const checar = () => {
        if (registration.installing || !navigator.onLine) return;
        registration.update().catch(() => {
          /* offline ou rede instável: tenta de novo no próximo ciclo */
        });
      };

      const timer = setInterval(checar, INTERVALO_CHECAGEM);
      // Checa também quando o usuário volta para a aba.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checar();
      });

      return () => clearInterval(timer);
    },
  });

  // Avisa uma única vez que o app funciona offline.
  useEffect(() => {
    if (!offlineReady) return;
    toast.success("Pronto para uso offline", {
      description: "O catálogo continua acessível sem internet.",
    });
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady]);

  // Nova versão disponível.
  useEffect(() => {
    if (!needRefresh) return;

    // Com carrinho ativo, NÃO recarregar sozinho: o carrinho está em memória
    // e o reload descartaria os itens. Deixa o cliente escolher a hora.
    if (itensRef.current > 0) {
      toast("Nova versão disponível", {
        description: "Atualize quando terminar — seu carrinho será reiniciado.",
        duration: Infinity,
        action: {
          label: "Atualizar",
          onClick: () => updateServiceWorker(true),
        },
        onDismiss: () => setNeedRefresh(false),
      });
      return;
    }

    // Sem nada em risco: atualiza sozinho.
    toast.info("Atualizando para a versão mais recente…", { duration: 2000 });
    const t = setTimeout(() => updateServiceWorker(true), 700);
    return () => clearTimeout(t);
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
};

export default PWAUpdater;
