-- Financeiro do marketplace
CREATE TABLE IF NOT EXISTS public.artisan_wallets (
  artisan_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_cents bigint NOT NULL DEFAULT 0 CHECK (available_cents >= 0),
  pending_cents bigint NOT NULL DEFAULT 0 CHECK (pending_cents >= 0),
  lifetime_sales_cents bigint NOT NULL DEFAULT 0 CHECK (lifetime_sales_cents >= 0),
  lifetime_payouts_cents bigint NOT NULL DEFAULT 0 CHECK (lifetime_payouts_cents >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('sale','fee','commission','adjustment','payout','refund')),
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  gross_cents bigint NOT NULL DEFAULT 0,
  fee_cents bigint NOT NULL DEFAULT 0,
  commission_cents bigint NOT NULL DEFAULT 0,
  net_cents bigint NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','available','paid','canceled')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  gateway text,
  gateway_transaction_id text,
  payment_method text,
  gross_cents bigint NOT NULL DEFAULT 0,
  gateway_fee_cents bigint NOT NULL DEFAULT 0,
  anticipation_fee_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','canceled')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gateway, gateway_transaction_id)
);

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  pix_key text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','processing','paid','rejected','canceled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  paid_at timestamptz,
  receipt_url text,
  admin_note text
);

CREATE TABLE IF NOT EXISTS public.platform_fee_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Padrão',
  commission_percent numeric(8,4) NOT NULL DEFAULT 10 CHECK (commission_percent >= 0),
  fixed_fee_cents bigint NOT NULL DEFAULT 0 CHECK (fixed_fee_cents >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_fee_settings (name, commission_percent)
SELECT 'Padrão', 10
WHERE NOT EXISTS (SELECT 1 FROM public.platform_fee_settings);

ALTER TABLE public.artisan_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_fee_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artisan wallet own" ON public.artisan_wallets FOR SELECT TO authenticated USING (auth.uid() = artisan_user_id);
CREATE POLICY "artisan financial own" ON public.financial_transactions FOR SELECT TO authenticated USING (auth.uid() = artisan_user_id);
CREATE POLICY "artisan payout own" ON public.payout_requests FOR SELECT TO authenticated USING (auth.uid() = artisan_user_id);
CREATE POLICY "artisan payout create" ON public.payout_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = artisan_user_id);
CREATE POLICY "admin payment transactions" ON public.payment_transactions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "admin financial transactions" ON public.financial_transactions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "admin wallets" ON public.artisan_wallets FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "admin payouts" ON public.payout_requests FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "fee settings read" ON public.platform_fee_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin fee settings" ON public.platform_fee_settings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_financial_transactions_artisan ON public.financial_transactions(artisan_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_order ON public.financial_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_artisan ON public.payout_requests(artisan_user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON public.payment_transactions(order_id);
