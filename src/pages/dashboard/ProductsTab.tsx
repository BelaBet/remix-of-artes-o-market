import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { reaisToCents, centsToReaisInput, CATEGORY_OPTIONS } from "@/lib/products";
import { formatCents } from "@/lib/data";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, ImagePlus } from "lucide-react";

interface FormState {
  id?: string;
  name: string;
  description: string;
  price: string;
  category: string;
  stock: string;
  city: string;
  state: string;
  image_url: string;
  is_active: boolean;
}

const EMPTY: FormState = {
  name: "",
  description: "",
  price: "",
  category: CATEGORY_OPTIONS[0],
  stock: "1",
  city: "",
  state: "",
  image_url: "",
  is_active: true,
};

const ProductsTab = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["my-products", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("artisan_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["my-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const priceCents = reaisToCents(f.price);
      if (!f.name.trim()) throw new Error("Informe o nome da peça.");
      if (!priceCents || priceCents <= 0) throw new Error("Informe um preço válido.");
      const payload = {
        artisan_user_id: user!.id,
        name: f.name.trim(),
        description: f.description.trim() || null,
        price_cents: priceCents,
        category: f.category || null,
        stock: Math.max(0, parseInt(f.stock || "0", 10)),
        city: f.city.trim() || null,
        state: f.state.trim().toUpperCase() || null,
        image_url: f.image_url || null,
        is_active: f.is_active,
      };
      if (f.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Produto salvo.");
      setForm(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (p: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto excluído.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadImage = async (file: File) => {
    if (!user || !form) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm({ ...form, image_url: data.publicUrl });
      toast.success("Imagem enviada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  };

  const input =
    "w-full border border-border bg-background px-3 py-2 font-body text-[0.8rem] outline-none focus:border-terra transition-colors";
  const label = "block text-[0.58rem] tracking-[0.16em] uppercase text-muted-foreground mb-1";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-[1.3rem]">Meus produtos</h2>
        <button
          onClick={() => setForm({ ...EMPTY })}
          className="flex items-center gap-1.5 bg-terra text-background px-4 py-2 font-body text-[0.62rem] tracking-[0.14em] uppercase font-medium hover:brightness-90 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Novo produto
        </button>
      </div>

      {form && (
        <div className="border border-border bg-parchment p-4 sm:p-5 mb-5">
          <div className="font-display text-[1.05rem] mb-4">{form.id ? "Editar peça" : "Nova peça"}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={label}>Nome</label>
              <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Descrição</label>
              <textarea
                className={`${input} min-h-[70px]`}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className={label}>Preço (R$)</label>
              <input
                className={input}
                inputMode="decimal"
                placeholder="129,90"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              <div className="text-[0.6rem] text-muted-foreground mt-1">
                Será gravado como {reaisToCents(form.price) || 0} centavos
              </div>
            </div>
            <div>
              <label className={label}>Estoque</label>
              <input
                className={input}
                inputMode="numeric"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </div>
            <div>
              <label className={label}>Categoria</label>
              <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-[1fr_80px] gap-2">
              <div>
                <label className={label}>Cidade</label>
                <input className={input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label className={label}>UF</label>
                <input
                  className={input}
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Imagem</label>
              <div className="flex items-center gap-3">
                {form.image_url && (
                  <img src={form.image_url} alt="Prévia" className="w-16 h-16 object-cover border border-border" />
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 border border-border px-3 py-2 font-body text-[0.62rem] tracking-[0.12em] uppercase hover:border-terra hover:text-terra transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                  Enviar imagem
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-[0.75rem] sm:col-span-2">
              <input
                type="checkbox"
                className="accent-terra"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Produto ativo (visível no catálogo)
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => save.mutate(form)}
              disabled={save.isPending}
              className="bg-foreground text-background px-5 py-2 font-body text-[0.62rem] tracking-[0.14em] uppercase font-medium disabled:opacity-50"
            >
              {save.isPending ? "Salvando…" : "Salvar"}
            </button>
            <button
              onClick={() => setForm(null)}
              className="border border-border px-5 py-2 font-body text-[0.62rem] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (products?.length ?? 0) === 0 ? (
        <div className="border border-dashed border-border py-14 text-center text-[0.8rem] text-muted-foreground">
          Você ainda não cadastrou nenhuma peça.
        </div>
      ) : (
        <div className="border border-border">
          {products!.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-3 px-3 py-3 border-b border-border last:border-b-0 hover:bg-parchment/50 transition-colors"
            >
              <div className="w-12 h-12 bg-parchment shrink-0 overflow-hidden">
                {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-[140px]">
                <div className="font-display text-[0.95rem]">{p.name}</div>
                <div className="text-[0.65rem] text-muted-foreground">
                  {p.category ?? "Sem categoria"} · estoque {p.stock}
                </div>
              </div>
              <div className="font-display text-[0.95rem]">{formatCents(p.price_cents)}</div>
              <span
                className={`text-[0.55rem] tracking-[0.1em] uppercase font-semibold px-2 py-0.5 ${
                  p.is_active ? "bg-sage/10 text-sage" : "bg-muted text-muted-foreground"
                }`}
              >
                {p.is_active ? "Ativo" : "Inativo"}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleActive.mutate({ id: p.id, is_active: p.is_active })}
                  className="border border-border px-2 py-1 text-[0.58rem] tracking-[0.1em] uppercase hover:border-terra hover:text-terra transition-colors"
                >
                  {p.is_active ? "Desativar" : "Ativar"}
                </button>
                <button
                  aria-label="Editar"
                  onClick={() =>
                    setForm({
                      id: p.id,
                      name: p.name,
                      description: p.description ?? "",
                      price: centsToReaisInput(p.price_cents),
                      category: p.category ?? CATEGORY_OPTIONS[0],
                      stock: String(p.stock),
                      city: p.city ?? "",
                      state: p.state ?? "",
                      image_url: p.image_url ?? "",
                      is_active: p.is_active,
                    })
                  }
                  className="border border-border p-1.5 hover:border-terra hover:text-terra transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  aria-label="Excluir"
                  onClick={() => confirm(`Excluir "${p.name}"?`) && remove.mutate(p.id)}
                  className="border border-border p-1.5 hover:border-destructive hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductsTab;
