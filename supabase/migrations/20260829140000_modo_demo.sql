-- =====================================================================
-- Modo demo: popula o banco com artesãos e produtos de exemplo, usando as
-- 8 imagens antigas (agora em public/demo/*.jpg, nomes estáveis — não
-- mudam a cada build, diferente dos assets do Vite), para evitar tela
-- vazia no primeiro acesso / apresentações do sistema.
--
-- NÃO habilita compra real: os artesãos demo ficam com
-- shipping_carrier='combinar' e kyc_status='pendente', então o checkout
-- recusa com mensagem clara em vez de usar um recebedor falso no gateway.
--
-- Idempotente (upsert por id fixo) e limpo por completo via CASCADE: todo
-- o resto (profiles, artisan_billing, products, reviews, user_roles) tem
-- ON DELETE CASCADE até auth.users, então apagar os usuários demo basta.
-- =====================================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.ativar_dados_demo()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  base_url text := 'https://crafty-creations-spot.lovable.app/demo/';
  -- IDs fixos hexadecimais válidos (nunca usar letras fora de a-f num UUID
  -- literal — 'p', por exemplo, não é hex e quebra o cast ::uuid).
  artesaos jsonb := '[
    {"id":"00000000-0000-4000-8000-0000000ead01","nome":"Ana Lima","loja":"Pedra & Barro Ateliê","cidade":"Ouro Preto","uf":"MG","bio":"Trabalho com pedra-sabão e cerâmica há mais de 15 anos, seguindo a tradição da minha família."},
    {"id":"00000000-0000-4000-8000-0000000ead02","nome":"Maria Souza","loja":"Fio e Fibra","cidade":"Caruaru","uf":"PE","bio":"Macramê e trançados em fibras naturais, inspirados na cultura do agreste pernambucano."},
    {"id":"00000000-0000-4000-8000-0000000ead03","nome":"João Neto","loja":"Madeira Viva","cidade":"Palmas","uf":"TO","bio":"Esculturas em madeira de reflorestamento, cada peça única e feita à mão."}
  ]'::jsonb;
  produtos jsonb := '[
    {"id":"00000000-0000-4000-8000-0000000ead11","artesao":0,"nome":"Caixas de Pedra-Sabão","img":"stone.jpg","preco":12900,"cat":"Pedra-Sabão"},
    {"id":"00000000-0000-4000-8000-0000000ead12","artesao":1,"nome":"Peça de Macramê","img":"weave.jpg","preco":8500,"cat":"Macramê"},
    {"id":"00000000-0000-4000-8000-0000000ead13","artesao":2,"nome":"Escultura em Madeira","img":"wood.jpg","preco":21000,"cat":"Madeira"},
    {"id":"00000000-0000-4000-8000-0000000ead14","artesao":1,"nome":"Trançado de Buriti","img":"straw1.jpg","preco":6500,"cat":"Palha"},
    {"id":"00000000-0000-4000-8000-0000000ead15","artesao":0,"nome":"Vaso de Cerâmica","img":"pottery.jpg","preco":17500,"cat":"Cerâmica"},
    {"id":"00000000-0000-4000-8000-0000000ead16","artesao":0,"nome":"Peças de Barro Rústico","img":"ceramic.jpg","preco":9500,"cat":"Barro"},
    {"id":"00000000-0000-4000-8000-0000000ead17","artesao":1,"nome":"Cestos Trançados","img":"basket.jpg","preco":5800,"cat":"Cestos"},
    {"id":"00000000-0000-4000-8000-0000000ead18","artesao":2,"nome":"Cesta de Palha","img":"straw2.jpg","preco":14500,"cat":"Palha"}
  ]'::jsonb;
  a jsonb; p jsonb;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Ação restrita à administração';
  END IF;

  FOR a IN SELECT * FROM jsonb_array_elements(artesaos) LOOP
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      (a->>'id')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'demo+' || (a->>'id') || '@feitoamao.internal', '!', now(), now(), now(),
      '{}'::jsonb, jsonb_build_object('demo', 'true', 'display_name', a->>'nome')
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role) VALUES ((a->>'id')::uuid, 'artisan')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.profiles (user_id, display_name, shop_name, city, state, bio)
    VALUES ((a->>'id')::uuid, a->>'nome', a->>'loja', a->>'cidade', a->>'uf', a->>'bio')
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name, shop_name = EXCLUDED.shop_name,
      city = EXCLUDED.city, state = EXCLUDED.state, bio = EXCLUDED.bio;

    -- 'combinar' e sem KYC: navegável, mas o checkout recusa a compra com
    -- mensagem clara em vez de usar um recebedor falso no gateway.
    INSERT INTO public.artisan_billing (artisan_user_id, shipping_carrier, kyc_status)
    VALUES ((a->>'id')::uuid, 'combinar', 'pendente')
    ON CONFLICT (artisan_user_id) DO NOTHING;
  END LOOP;

  FOR p IN SELECT * FROM jsonb_array_elements(produtos) LOOP
    INSERT INTO public.products (id, artisan_user_id, name, price_cents, image_url, category, stock, is_active, city, state, is_demo)
    VALUES (
      (p->>'id')::uuid,
      (artesaos->(p->>'artesao')::int->>'id')::uuid,
      p->>'nome', (p->>'preco')::int, base_url || (p->>'img'), p->>'cat', 5, true,
      artesaos->(p->>'artesao')::int->>'cidade', artesaos->(p->>'artesao')::int->>'uf',
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, price_cents = EXCLUDED.price_cents, image_url = EXCLUDED.image_url,
      category = EXCLUDED.category, is_active = true;
  END LOOP;

  INSERT INTO public.reviews (artisan_user_id, reviewer_name, reviewer_city, rating, comment, product_name, is_demo)
  VALUES
    ('00000000-0000-4000-8000-0000000ead01', 'Camila R.', 'Belo Horizonte, MG', 5, 'Peça linda, capricho em cada detalhe. Chegou muito bem embalada.', 'Vaso de Cerâmica', true),
    ('00000000-0000-4000-8000-0000000ead02', 'Rafael T.', 'Recife, PE', 5, 'Trabalho impecável, superou minhas expectativas.', 'Peça de Macramê', true),
    ('00000000-0000-4000-8000-0000000ead03', 'Beatriz M.', 'Palmas, TO', 4, 'Muito bonita, só demorou um pouco mais que o esperado.', 'Escultura em Madeira', true)
  ON CONFLICT DO NOTHING;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ativar_dados_demo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ativar_dados_demo() TO authenticated;

-- Remove os dados demo. Apagar os auth.users marcados basta: o CASCADE
-- cuida do resto.
CREATE OR REPLACE FUNCTION public.desativar_dados_demo()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Ação restrita à administração';
  END IF;

  DELETE FROM auth.users WHERE raw_user_meta_data->>'demo' = 'true';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.desativar_dados_demo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.desativar_dados_demo() TO authenticated;

-- Status para a UI decidir entre "Ativar" e "Remover".
CREATE OR REPLACE FUNCTION public.status_dados_demo()
RETURNS TABLE(ativo boolean, artesaos int, produtos int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.products WHERE is_demo) > 0,
    (SELECT count(*) FROM auth.users WHERE raw_user_meta_data->>'demo' = 'true')::int,
    (SELECT count(*) FROM public.products WHERE is_demo)::int;
$$;
REVOKE EXECUTE ON FUNCTION public.status_dados_demo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.status_dados_demo() TO authenticated;
