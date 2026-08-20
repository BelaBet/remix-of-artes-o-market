import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

// Verifica se há nova versão a cada 30 min (e ao voltar para a aba).
const INTERVALO_CHECAGEM = 30 * 60 * 1000;

/**
 * Atualização automática do app.
 *
 * O carrinho é persistido em localStorage, então recarregar não perde a compra
 * — por isso a atualização pode ser aplicada sozinha. A única espera é um
 * pagamento em andamento: recarregar no meio da cobrança deixaria o cliente sem
 * saber se ela foi enviada. O CheckoutModal marca esse período no <body>.
 */
const PWAUpdater = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
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
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checar();
      });

      return () => clearInterval(timer);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    toast.success("Pronto para uso offline", {
      description: "O catálogo continua acessível sem internet.",
    });
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!needRefresh) return;

    let cancelled = false;
    const aplicar = () => {
      if (cancelled) return;
      // Nunca recarregar durante uma cobrança em andamento.
      if (document.body.dataset.paymentInFlight === "true") {
        setTimeout(aplicar, 3000);
        return;
      }
      toast.info("Atualizando para a versão mais recente…", { duration: 2000 });
      setTimeout(() => updateServiceWorker(true), 700);
    };
    aplicar();

    return () => {
      cancelled = true;
    };
  }, [needRefresh, updateServiceWorker]);

  return null;
};

export default PWAUpdater;
