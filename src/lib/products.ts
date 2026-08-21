import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PRODUCTS, IMAGES } from "@/lib/data";

export type DbProduct = Tables<"products">;

/** Forma única usada por toda a vitrine (banco ou demo). */
export interface GridItem {
  id: string;
  name: string;
  artist: string;
  city: string;
  priceCents: number;
  imageUrl: string | null;
  stock: number;
  category: string | null;
  createdAt: string;
}

export const CATEGORY_OPTIONS = [
  "Cerâmica",
  "Barro",
  "Madeira",
  "Macramê",
  "Palha",
  "Cestos",
  "Pedra-Sabão",
  "Tecidos",
  "Outros",
];

export const STATE_OPTIONS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export type SortKey = "relevance" | "price_asc" | "rating" | "newest";

export interface ProductFilters {
  search?: string;
  categories?: string[];
  states?: string[];
  maxPriceCents?: number;
  sort?: SortKey;
  limit?: number;
}

export function toGridItem(p: DbProduct, artist: string): GridItem {
  return {
    id: p.id,
    name: p.name,
    artist,
    city: [p.city, p.state].filter(Boolean).join(", "),
    priceCents: p.price_cents,
    imageUrl: p.image_url,
    stock: p.stock,
    category: p.category,
    createdAt: p.created_at,
  };
}

/** Catálogo de exemplo — só aparece quando o banco ainda não tem produtos. */
export const DEMO_ITEMS: GridItem[] = PRODUCTS.map((p) => ({
  id: `demo-${p.id}`,
  name: p.name,
  artist: p.artist,
  city: p.city,
  priceCents: p.price * 100,
  imageUrl: IMAGES[p.img],
  stock: 0,
  category: null,
  createdAt: new Date().toISOString(),
}));

async function artisanNames(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, shop_name")
    .in("user_id", ids);
  for (const p of data ?? []) {
    map.set(p.user_id, p.shop_name || p.display_name || "Artesão");
  }
  return map;
}

export function useProducts(filters: ProductFilters = {}) {
  const { search, categories, states, maxPriceCents, sort = "relevance", limit } = filters;

  return useQuery({
    queryKey: ["products", search ?? "", categories ?? [], states ?? [], maxPriceCents ?? null, sort, limit ?? null],
    queryFn: async (): Promise<GridItem[]> => {
      let matchedArtisans: string[] = [];
      if (search && search.trim()) {
        const term = search.trim();
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id")
          .or(`display_name.ilike.%${term}%,shop_name.ilike.%${term}%`);
        matchedArtisans = (profs ?? []).map((p) => p.user_id);
      }

      let query = supabase.from("products").select("*").eq("is_active", true);

      if (search && search.trim()) {
        const term = search.trim().replace(/[(),]/g, " ");
        const clauses = [`name.ilike.%${term}%`, `description.ilike.%${term}%`];
        if (matchedArtisans.length > 0) clauses.push(`artisan_user_id.in.(${matchedArtisans.join(",")})`);
        query = query.or(clauses.join(","));
      }
      if (categories && categories.length > 0) query = query.in("category", categories);
      if (states && states.length > 0) query = query.in("state", states);
      if (typeof maxPriceCents === "number") query = query.lte("price_cents", maxPriceCents);

      if (sort === "price_asc") query = query.order("price_cents", { ascending: true });
      else query = query.order("created_at", { ascending: false });

      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;

      const names = await artisanNames([...new Set((data ?? []).map((p) => p.artisan_user_id))]);
      return (data ?? []).map((p) => toGridItem(p, names.get(p.artisan_user_id) ?? "Artesão"));
    },
  });
}

export function useMyProducts(userId?: string) {
  return useQuery({
    queryKey: ["my-products", userId],
    enabled: !!userId,
    queryFn: async (): Promise<DbProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("artisan_user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** "129,90" -> 12990. Nunca usa float para dinheiro. */
// reaisToCents/centsToReaisInput vivem em @/lib/money (módulo puro,
// sem dependência do Supabase, para poderem ser testados isoladamente).
export { reaisToCents, centsToReaisInput } from "@/lib/money";

