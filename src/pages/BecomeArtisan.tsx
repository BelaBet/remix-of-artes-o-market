import { useState } from "react";
import { useRoles } from "@/hooks/useRoles";
import { toast } from "sonner";
import { Loader2, Store } from "lucide-react";

/**
 * Mostrado a quem está logado mas ainda não é artesão. Abrir loja é
 * autosserviço — a RLS permite o usuário atribuir a si o papel 'artisan'
 * (e apenas esse ou 'buyer'; 'admin' nunca por aqui).
 */
const BecomeArtisan = ({ onDone, onBack }: { onDone: () => void; onBack: () => void }) => {
  const { becomeArtisan } = useRoles();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    const { error } = await becomeArtisan();
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Sua loja foi aberta! Cadastre sua primeira peça.");
    onDone();
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 bg-parchment/40">
      <div className="w-full max-w-[440px] bg-background border border-border p-8 text-center">
        <Store className="w-8 h-8 text-terra mx-auto mb-4" />
        <h1 className="font-display text-[1.7rem] leading-tight mb-2">
          Abra sua <em className="italic text-terra">loja</em>
        </h1>
        <p className="text-[0.84rem] text-muted-foreground font-light mb-6">
          Sua conta é de comprador. Ative o perfil de artesão para cadastrar peças, receber pedidos e
          acompanhar suas vendas. Você continua podendo comprar normalmente.
        </p>
        <button
          onClick={open}
          disabled={busy}
          className="w-full bg-espresso text-parchment py-3 font-body font-medium text-[0.7rem] tracking-[0.16em] uppercase hover:brightness-125 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {busy ? "Abrindo…" : "Abrir minha loja"}
        </button>
        <button
          onClick={onBack}
          className="mt-3 bg-transparent border-none cursor-pointer font-body text-[0.68rem] text-muted-foreground hover:text-foreground transition-colors tracking-[0.08em]"
        >
          ← Voltar ao marketplace
        </button>
      </div>
    </div>
  );
};

export default BecomeArtisan;
