CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  image_url text,
  category text,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  city text,
  state text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active products are viewable by everyone"
  ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Artisans can view their own products"
  ON public.products FOR SELECT TO authenticated USING (auth.uid() = artisan_user_id);
CREATE POLICY "Artisans can insert their own products"
  ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() = artisan_user_id);
CREATE POLICY "Artisans can update their own products"
  ON public.products FOR UPDATE TO authenticated USING (auth.uid() = artisan_user_id) WITH CHECK (auth.uid() = artisan_user_id);
CREATE POLICY "Artisans can delete their own products"
  ON public.products FOR DELETE TO authenticated USING (auth.uid() = artisan_user_id);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  buyer_document text NOT NULL,
  buyer_phone text,
  shipping_address jsonb,
  subtotal_cents integer NOT NULL,
  total_cents integer NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('pix','credit_card','boleto')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','canceled','refunded')),
  pagarme_order_id text UNIQUE,
  pagarme_charge_id text,
  pix_qr_code text,
  pix_qr_code_url text,
  pix_expires_at timestamptz,
  boleto_url text,
  boleto_barcode text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  artisan_user_id uuid,
  product_name text NOT NULL,
  unit_price_cents integer NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers and selling artisans can view orders"
  ON public.orders FOR SELECT TO authenticated
  USING (
    auth.uid() = buyer_user_id
    OR EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = orders.id AND oi.artisan_user_id = auth.uid()
    )
  );

CREATE POLICY "Buyers and selling artisans can view order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    artisan_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.buyer_user_id = auth.uid()
    )
  );

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_products_artisan ON public.products(artisan_user_id);
CREATE INDEX idx_orders_buyer ON public.orders(buyer_user_id);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_artisan ON public.order_items(artisan_user_id);