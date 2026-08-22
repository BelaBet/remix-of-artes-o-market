-- 1) Restringir colunas que o artesão pode alterar no pedido
CREATE OR REPLACE FUNCTION public.artesao_so_status_de_envio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
DECLARE
  v_new public.orders;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT private.has_role(auth.uid(),'admin'::public.app_role)
     AND private.is_order_seller(OLD.id, auth.uid()) THEN

    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status NOT IN ('processing','shipped','delivered') THEN
      RAISE EXCEPTION 'O artesão só pode marcar preparo, envio e entrega';
    END IF;

    -- whitelist: parte de OLD e reaplica apenas os campos permitidos
    v_new := OLD;
    v_new.status          := NEW.status;
    v_new.tracking_code   := NEW.tracking_code;
    v_new.tracking_carrier := NEW.tracking_carrier;
    v_new.updated_at      := now();
    NEW := v_new;
  END IF;

  IF NEW.status = 'shipped' AND OLD.status <> 'shipped' THEN
    NEW.shipped_at := COALESCE(NEW.shipped_at, now());
  END IF;
  IF NEW.status = 'delivered' AND OLD.status <> 'delivered' THEN
    NEW.delivered_at := COALESCE(NEW.delivered_at, now());
  END IF;
  IF NEW.status IN ('canceled','refunded') AND OLD.status NOT IN ('canceled','refunded') THEN
    NEW.canceled_at := COALESCE(NEW.canceled_at, now());
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Tirar as funções SECURITY DEFINER da API pública
DROP POLICY IF EXISTS "Artesao atualiza envio do pedido" ON public.orders;
CREATE POLICY "Artesao atualiza envio do pedido"
ON public.orders FOR UPDATE TO authenticated
USING (private.is_order_seller(id, auth.uid()))
WITH CHECK (private.is_order_seller(id, auth.uid()));

DROP POLICY IF EXISTS "Admin gerencia recebimentos" ON public.artisan_billing;
CREATE POLICY "Admin gerencia recebimentos"
ON public.artisan_billing FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin le o log de emails" ON public.email_log;
CREATE POLICY "Admin le o log de emails"
ON public.email_log FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Só admin altera a configuração" ON public.platform_settings;
CREATE POLICY "Só admin altera a configuração"
ON public.platform_settings FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "So admin altera o frete" ON public.shipping_rates;
CREATE POLICY "So admin altera o frete"
ON public.shipping_rates FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_order_seller(uuid, uuid);

REVOKE ALL ON FUNCTION public.artesao_pode_vender(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.comissao_bps(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.artesao_pode_vender(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.comissao_bps(uuid) TO service_role;