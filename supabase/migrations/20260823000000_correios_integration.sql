-- =====================================================================
-- Integração com os Correios: dimensões de produto, endereço de origem do
-- artesão, remessas e cache de token.
--
-- SEM CONTRATO NOS CORREIOS, ESTA MIGRATION NÃO ATIVA NADA SOZINHA. Ela só
-- cria a estrutura. As Edge Functions caem no frete fixo por região
-- (shipping_rates) enquanto CORREIOS_API_USER/CORREIOS_CARTAO_POSTAGEM não
-- estiverem configurados nos secrets.
-- =====================================================================

-- Peso e dimensões: exigidos pela API Preço/Prazo. Defaults conservadores
-- (16x11x2cm, 300g) para não travar produto já cadastrado sem esses dados.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight_grams integer NOT NULL DEFAULT 300 CHECK (weight_grams > 0),
  ADD COLUMN IF NOT EXISTS length_cm integer NOT NULL DEFAULT 16 CHECK (length_cm >= 16),
  ADD COLUMN IF NOT EXISTS width_cm integer NOT NULL DEFAULT 11 CHECK (width_cm >= 11),
  ADD COLUMN IF NOT EXISTS height_cm integer NOT NULL DEFAULT 2 CHECK (height_cm >= 2);

-- Endereço de origem do artesão: quem despacha é ele, não um depósito
-- central. Vive em artisan_billing (mesma cardinalidade 1:1).
ALTER TABLE public.artisan_billing
  ADD COLUMN IF NOT EXISTS origin_zip_code text,
  ADD COLUMN IF NOT EXISTS origin_street text,
  ADD COLUMN IF NOT EXISTS origin_number text,
  ADD COLUMN IF NOT EXISTS origin_complement text,
  ADD COLUMN IF NOT EXISTS origin_district text,
  ADD COLUMN IF NOT EXISTS origin_city text,
  ADD COLUMN IF NOT EXISTS origin_state text,
  ADD COLUMN IF NOT EXISTS origin_phone text;

-- O artesão pode editar o PRÓPRIO endereço de origem — dado bancário
-- continua edge-function-only. A trigger impede misturar os dois.
CREATE OR REPLACE FUNCTION public.artesao_so_endereco_origem()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF private.has_role(auth.uid(),'admin'::public.app_role) THEN RETURN NEW; END IF;
  IF NEW.pagarme_recipient_id IS DISTINCT FROM OLD.pagarme_recipient_id
     OR NEW.commission_bps IS DISTINCT FROM OLD.commission_bps
     OR NEW.recipient_status IS DISTINCT FROM OLD.recipient_status
     OR NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
     OR NEW.kyc_url IS DISTINCT FROM OLD.kyc_url
     OR NEW.can_withdraw IS DISTINCT FROM OLD.can_withdraw
     OR NEW.holder_name IS DISTINCT FROM OLD.holder_name
     OR NEW.holder_document IS DISTINCT FROM OLD.holder_document
     OR NEW.bank_code IS DISTINCT FROM OLD.bank_code
     OR NEW.branch_number IS DISTINCT FROM OLD.branch_number
     OR NEW.account_number IS DISTINCT FROM OLD.account_number
     OR NEW.account_check_digit IS DISTINCT FROM OLD.account_check_digit
     OR NEW.account_type IS DISTINCT FROM OLD.account_type THEN
    RAISE EXCEPTION 'Você só pode editar o endereço de origem por aqui; dados bancários passam pelo cadastro de recebimento';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.artesao_so_endereco_origem() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS artisan_billing_so_endereco ON public.artisan_billing;
CREATE TRIGGER artisan_billing_so_endereco BEFORE UPDATE ON public.artisan_billing
  FOR EACH ROW EXECUTE FUNCTION public.artesao_so_endereco_origem();

DROP POLICY IF EXISTS "Artesao atualiza o proprio endereco de origem" ON public.artisan_billing;
CREATE POLICY "Artesao atualiza o proprio endereco de origem" ON public.artisan_billing
  FOR UPDATE TO authenticated
  USING (auth.uid() = artisan_user_id)
  WITH CHECK (auth.uid() = artisan_user_id);

DROP POLICY IF EXISTS "Artesao cria a propria linha de billing" ON public.artisan_billing;
CREATE POLICY "Artesao cria a propria linha de billing" ON public.artisan_billing
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = artisan_user_id);

GRANT SELECT (origin_zip_code, origin_street, origin_number, origin_complement,
              origin_district, origin_city, origin_state, origin_phone)
  ON public.artisan_billing TO authenticated;
GRANT UPDATE (origin_zip_code, origin_street, origin_number, origin_complement,
              origin_district, origin_city, origin_state, origin_phone)
  ON public.artisan_billing TO authenticated;
GRANT INSERT (artisan_user_id, origin_zip_code, origin_street, origin_number,
              origin_complement, origin_district, origin_city, origin_state, origin_phone)
  ON public.artisan_billing TO authenticated;

-- ---------------------------------------------------------------------
-- LOGÍSTICA: três opções, como nos marketplaces reais (mesmo padrão do
-- Elo7). O ARTESÃO escolhe a transportadora que usa — não o comprador a
-- cada compra — o que mantém o checkout simples.
--
--   correios      → integração direta, exige contrato empresarial
--   melhor_envio  → agregador (Correios+Jadlog+outras), sem contrato próprio
--   combinar      → sem frete cobrado, artesão combina entrega com o comprador
--
-- Default 'combinar': funciona sem NENHUMA integração configurada, então
-- todo artesão novo já consegue vender no primeiro dia.
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.shipping_carrier AS ENUM ('correios','melhor_envio','combinar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.artisan_billing
  ADD COLUMN IF NOT EXISTS shipping_carrier public.shipping_carrier NOT NULL DEFAULT 'combinar';

GRANT SELECT (shipping_carrier), UPDATE (shipping_carrier), INSERT (shipping_carrier)
  ON public.artisan_billing TO authenticated;

-- Uma remessa por (pedido, artesão), qualquer que seja a transportadora.
-- Campos genéricos cobrem os três modos; campos do Melhor Envio ficam
-- nullable, e "combinar" só usa combinar_nota.
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  artisan_user_id uuid NOT NULL,
  carrier public.shipping_carrier NOT NULL,
  service_code text,
  service_name text,
  tracking_code text UNIQUE,
  tracking_url text,
  label_url text,
  cost_cents integer NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','etiqueta_gerada','postado','em_transito','entregue','combinado','erro')),
  last_status_detail text,
  error text,
  melhor_envio_cart_id text,
  melhor_envio_order_id text,
  combinar_nota text,
  posted_at timestamptz,
  delivered_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, artisan_user_id)
);
CREATE INDEX IF NOT EXISTS shipments_artisan_idx ON public.shipments(artisan_user_id);
CREATE INDEX IF NOT EXISTS shipments_carrier_idx ON public.shipments(carrier);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.shipments TO service_role;
GRANT SELECT ON public.shipments TO authenticated;

-- Refaz a fachada de is_order_seller: a plataforma já a dropou uma vez
-- durante o desenvolvimento ("Fixed anon/auth funcs & overbroad"). Se sumir
-- de novo, as policies abaixo (e as de orders/order_items) quebram.
CREATE OR REPLACE FUNCTION public.is_order_seller(_order_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.is_order_seller(_order_id, _user_id);
$$;
GRANT EXECUTE ON FUNCTION public.is_order_seller(uuid,uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Comprador e vendedor veem a remessa" ON public.shipments;
CREATE POLICY "Comprador e vendedor veem a remessa" ON public.shipments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_user_id = auth.uid())
    OR private.is_order_seller(order_id, auth.uid())
    OR private.has_role(auth.uid(),'admin'::public.app_role)
  );

DROP TRIGGER IF EXISTS shipments_updated_at ON public.shipments;
CREATE TRIGGER shipments_updated_at BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cache do token Bearer dos Correios (expira em poucas horas). O Melhor
-- Envio usa token estático de aplicação — não precisa de cache.
CREATE TABLE IF NOT EXISTS public.correios_token_cache (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  access_token text,
  expires_at timestamptz
);
ALTER TABLE public.correios_token_cache ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.correios_token_cache TO service_role;

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS origin_zip_code text;
