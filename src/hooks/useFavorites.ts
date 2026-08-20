import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useFavorites() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: ids = [] } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("product_id").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((f) => f.product_id);
    },
  });

  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("auth");
      if (ids.includes(productId)) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, product_id: productId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites", user?.id] }),
  });

  return {
    favoriteIds: new Set(ids),
    isEnabled: !!user,
    toggleFavorite: (productId: string) => toggle.mutate(productId),
  };
}
