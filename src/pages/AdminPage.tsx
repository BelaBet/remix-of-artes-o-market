import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles, type AppRole } from "@/hooks/useRoles";
import { formatCents } from "@/lib/data";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";
import SEO from "@/components/SEO";

type Tab = "usuarios" | "pedidos" | "produtos" | "auditoria";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  canceled: "Cancelado",
  refunded: "Estornado",
};

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const [tab, setTab] = useState<Tab>("usuarios");

  const gateLoading = authLoading || rolesLoading;

  useEffect(() => {
    if (!gateLoading && !user) navigate("/login?next=/admin", { replace: true });
  }, [gateLoading, user, navigate]);

  if (gateLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldAlert className="w-8 h-8 text-muted-foreground" />
        <p className="font-display text-[1.3rem]">Área restrita</p>
        <p className="text-[0.8rem] text-muted-foreground max-w-[380px]">
          Esta seção é exclusiva da administração da plataforma.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-2 border border-foreground px-5 py-2 text-[0.66rem] tracking-[0.14em] uppercase hover:bg-foreground hover:text-background transition-colors"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "usuarios", label: "Usuários" },
    { key: "pedidos", label: "Pedidos" },
    { key: "produtos", label: "Produtos" },
    { key: "auditoria", label: "Auditoria" },
  ];

  return (
    <div className="min-h-screen bg-parchment/40">
      <SEO title="Administração" description="Painel administrativo." path="/admin" noindex />
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="font-display text-[1.9rem]">Administração</h1>
          <span className="text-[0.54rem] tracking-[0.14em] uppercase bg-espresso text-gold-light px-2 py-0.5 font-semibold">
            Superadmin
          </span>
        </div>
        <p className="text-[0.74rem] text-muted-foreground mb-4">
          Toda alteração feita aqui fica registrada na aba Auditoria, com autor e valores anteriores.
        </p>

        <a
          href="/admin/vendas"
          className="inline-block mb-6 border border-foreground px-4 py-2 text-[0.66rem] tracking-[0.14em] uppercase hover:bg-foreground hover:text-background transition-colors"
        >
          Central de vendas →
        </a>

        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-[0.68rem] tracking-[0.12em] uppercase whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? "border-terra text-terra font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "usuarios" && <UsersTab currentUserId={user?.id ?? ""} />}
        {tab === "pedidos" && <OrdersTab />}
        {tab === "produtos" && <ProductsTab />}
        {tab === "auditoria" && <AuditTab />}
      </div>
    </div>
  );
};

/* ------------------------------ USUÁRIOS ------------------------------ */

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  shop_name: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
}

function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roleRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, display_name, shop_name, city, state, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setRows((profiles ?? []) as ProfileRow[]);
    const map: Record<string, AppRole[]> = {};
    for (const r of roleRows ?? []) {
      (map[r.user_id] ??= []).push(r.role as AppRole);
    }
    setRoles(map);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleRole = async (userId: string, role: AppRole, has: boolean) => {
    // Um admin removendo o próprio acesso ficaria trancado para fora.
    if (userId === currentUserId && role === "admin" && has) {
      toast.error("Você não pode remover o próprio acesso de superadmin.");
      return;
    }
    setSaving(userId + role);
    const { error } = has
      ? await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role)
      : await supabase.from("user_roles").insert({ user_id: userId, role });
    setSaving(null);
    if (error) {
      toast.error("Não foi possível alterar o papel.");
      return;
    }
    toast.success(has ? `Papel ${role} removido.` : `Papel ${role} concedido.`);
    void load();
  };

  if (loading) return <Loading />;
  if (rows.length === 0) return <Empty>Nenhum usuário cadastrado ainda.</Empty>;

  return (
    <div className="bg-background border border-border overflow-x-auto">
      <table className="w-full text-[0.78rem]">
        <thead>
          <tr className="border-b border-border text-left">
            <Th>Usuário</Th>
            <Th>Loja</Th>
            <Th>Local</Th>
            <Th>Papéis</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const rs = roles[r.user_id] ?? [];
            return (
              <tr key={r.user_id} className="border-b border-border last:border-0">
                <Td>{r.display_name || "—"}</Td>
                <Td>{r.shop_name || "—"}</Td>
                <Td className="text-muted-foreground">
                  {[r.city, r.state].filter(Boolean).join(", ") || "—"}
                </Td>
                <Td>
                  <div className="flex gap-1.5 flex-wrap">
                    {(["buyer", "artisan", "admin"] as AppRole[]).map((role) => {
                      const has = rs.includes(role);
                      return (
                        <button
                          key={role}
                          onClick={() => toggleRole(r.user_id, role, has)}
                          disabled={saving === r.user_id + role}
                          className={`px-2 py-0.5 text-[0.58rem] tracking-[0.1em] uppercase border transition-colors disabled:opacity-50 ${
                            has
                              ? role === "admin"
                                ? "bg-espresso text-gold-light border-espresso"
                                : "bg-terra/10 text-terra border-terra"
                              : "border-border text-muted-foreground hover:border-foreground"
                          }`}
                        >
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------- PEDIDOS ------------------------------- */

interface OrderRow {
  id: string;
  buyer_name: string;
  buyer_email: string;
  total_cents: number;
  status: string;
  payment_method: string;
  created_at: string;
}

function OrdersTab() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, buyer_name, buyer_email, total_cents, status, payment_method, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as OrderRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const changeStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast.error("Não foi possível alterar o status.");
      return;
    }
    toast.success("Status alterado e registrado na auditoria.");
    void load();
  };

  if (loading) return <Loading />;
  if (rows.length === 0) return <Empty>Nenhum pedido registrado ainda.</Empty>;

  return (
    <>
      <p className="text-[0.7rem] text-muted-foreground mb-3">
        Alterar o status aqui muda apenas o registro interno — não movimenta dinheiro no Pagar.me nem
        estorna o cliente. Use para corrigir divergências, nunca para confirmar pagamento.
      </p>
      <div className="bg-background border border-border overflow-x-auto">
        <table className="w-full text-[0.78rem]">
          <thead>
            <tr className="border-b border-border text-left">
              <Th>Data</Th>
              <Th>Comprador</Th>
              <Th>Método</Th>
              <Th>Valor</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <Td className="text-muted-foreground whitespace-nowrap">
                  {new Date(o.created_at).toLocaleDateString("pt-BR")}
                </Td>
                <Td>
                  <div>{o.buyer_name}</div>
                  <div className="text-[0.66rem] text-muted-foreground">{o.buyer_email}</div>
                </Td>
                <Td className="uppercase text-[0.66rem] tracking-[0.1em]">{o.payment_method}</Td>
                <Td>{formatCents(o.total_cents)}</Td>
                <Td>
                  <select
                    value={o.status}
                    onChange={(e) => changeStatus(o.id, e.target.value)}
                    className="border border-border bg-transparent px-2 py-1 text-[0.7rem] outline-none focus:border-terra"
                  >
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ------------------------------ PRODUTOS ------------------------------ */

interface ProductRow {
  id: string;
  name: string;
  price_cents: number;
  stock: number;
  is_active: boolean;
  category: string | null;
}

function ProductsTab() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("id, name, price_cents, stock, is_active, category")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as ProductRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleActive = async (p: ProductRow) => {
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) {
      toast.error("Não foi possível alterar o produto.");
      return;
    }
    toast.success(p.is_active ? "Produto despublicado." : "Produto publicado.");
    void load();
  };

  if (loading) return <Loading />;
  if (rows.length === 0) return <Empty>Nenhum produto cadastrado ainda.</Empty>;

  return (
    <div className="bg-background border border-border overflow-x-auto">
      <table className="w-full text-[0.78rem]">
        <thead>
          <tr className="border-b border-border text-left">
            <Th>Produto</Th>
            <Th>Categoria</Th>
            <Th>Preço</Th>
            <Th>Estoque</Th>
            <Th>Situação</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0">
              <Td>{p.name}</Td>
              <Td className="text-muted-foreground">{p.category || "—"}</Td>
              <Td>{formatCents(p.price_cents)}</Td>
              <Td>{p.stock}</Td>
              <Td>
                <button
                  onClick={() => toggleActive(p)}
                  className={`px-2 py-0.5 text-[0.58rem] tracking-[0.1em] uppercase border transition-colors ${
                    p.is_active
                      ? "bg-sage/10 text-sage border-sage"
                      : "border-border text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {p.is_active ? "Ativo" : "Inativo"}
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------ AUDITORIA ------------------------------ */

interface AuditRow {
  id: string;
  table_name: string;
  action: string;
  record_id: string | null;
  created_at: string;
  actor_user_id: string | null;
}

function AuditTab() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("id, table_name, action, record_id, created_at, actor_user_id")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as AuditRow[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading />;
  if (rows.length === 0) return <Empty>Nenhuma alteração administrativa registrada.</Empty>;

  return (
    <div className="bg-background border border-border overflow-x-auto">
      <table className="w-full text-[0.78rem]">
        <thead>
          <tr className="border-b border-border text-left">
            <Th>Quando</Th>
            <Th>Tabela</Th>
            <Th>Ação</Th>
            <Th>Registro</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b border-border last:border-0">
              <Td className="text-muted-foreground whitespace-nowrap">
                {new Date(a.created_at).toLocaleString("pt-BR")}
              </Td>
              <Td>{a.table_name}</Td>
              <Td className="uppercase text-[0.66rem] tracking-[0.1em]">{a.action}</Td>
              <Td className="font-mono text-[0.64rem] text-muted-foreground">
                {a.record_id?.slice(0, 8) ?? "—"}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------- UI base ------------------------------- */

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-3 py-2.5 text-[0.58rem] tracking-[0.16em] uppercase text-muted-foreground font-medium">
    {children}
  </th>
);

const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-3 py-2.5 align-top ${className}`}>{children}</td>
);

const Loading = () => (
  <div className="flex justify-center py-12">
    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
  </div>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-background border border-border p-10 text-center text-[0.8rem] text-muted-foreground">
    {children}
  </div>
);

export default AdminPage;
