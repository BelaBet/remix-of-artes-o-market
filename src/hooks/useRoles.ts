import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "buyer" | "artisan" | "admin";

/**
 * Papéis do usuário logado, lidos de public.user_roles.
 *
 * Isto é conveniência de interface, não controle de acesso: quem decide o que
 * pode ser feito é a RLS no banco. Esconder um botão não protege nada.
 */
export function useRoles() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    setRoles(error || !data ? [] : (data.map((r) => r.role) as AppRole[]));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void fetchRoles();
  }, [authLoading, fetchRoles]);

  /** Torna o usuário atual um artesão (autosserviço; a RLS impede pedir 'admin'). */
  const becomeArtisan = useCallback(async () => {
    if (!user) return { error: "Faça login para abrir sua loja." };
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "artisan" });
    // Violação de unicidade significa que já é artesão: não é erro para o usuário.
    if (error && error.code !== "23505") return { error: "Não foi possível abrir sua loja agora." };
    await fetchRoles();
    return {};
  }, [user, fetchRoles]);

  return {
    roles,
    loading: authLoading || loading,
    isArtisan: roles.includes("artisan"),
    isAdmin: roles.includes("admin"),
    becomeArtisan,
    refresh: fetchRoles,
  };
}
