SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE public.shops
    ADD COLUMN IF NOT EXISTS shop_type text;

UPDATE public.shops
SET shop_type = 'retail'
WHERE shop_type IS NULL
   OR lower(shop_type) NOT IN (
        'retail',
        'restaurant',
        'pharmacy',
        'grocery',
        'clothing',
        'electronics',
        'salon',
        'wholesale',
        'services',
        'other'
   );

ALTER TABLE public.shops
    ALTER COLUMN shop_type SET DEFAULT 'retail',
    ALTER COLUMN shop_type SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'shops_shop_type_check'
    ) THEN
        ALTER TABLE public.shops
            ADD CONSTRAINT shops_shop_type_check
            CHECK (shop_type = ANY (ARRAY[
                'retail'::text,
                'restaurant'::text,
                'pharmacy'::text,
                'grocery'::text,
                'clothing'::text,
                'electronics'::text,
                'salon'::text,
                'wholesale'::text,
                'services'::text,
                'other'::text
            ]));
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.shop_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    module_key text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    is_customized boolean DEFAULT true NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name_or_number text NOT NULL,
    capacity integer DEFAULT 4 NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT restaurant_tables_status_check CHECK (status = ANY (ARRAY[
        'available'::text,
        'occupied'::text,
        'reserved'::text,
        'inactive'::text
    ])),
    CONSTRAINT restaurant_tables_capacity_check CHECK (capacity >= 0)
);

CREATE TABLE IF NOT EXISTS public.restaurant_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    sale_id uuid,
    table_id uuid,
    order_type text DEFAULT 'dine_in'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT restaurant_orders_order_type_check CHECK (order_type = ANY (ARRAY[
        'dine_in'::text,
        'takeaway'::text,
        'delivery'::text
    ])),
    CONSTRAINT restaurant_orders_status_check CHECK (status = ANY (ARRAY[
        'pending'::text,
        'confirmed'::text,
        'preparing'::text,
        'ready'::text,
        'served'::text,
        'completed'::text,
        'cancelled'::text
    ]))
);

CREATE TABLE IF NOT EXISTS public.medicine_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid NOT NULL,
    batch_number text NOT NULL,
    manufacture_date date,
    expiry_date date,
    quantity numeric(10,2) DEFAULT 0 NOT NULL,
    purchase_price numeric(10,2) DEFAULT 0 NOT NULL,
    selling_price numeric(10,2) DEFAULT 0 NOT NULL,
    supplier_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT medicine_batches_quantity_check CHECK (quantity >= 0),
    CONSTRAINT medicine_batches_purchase_price_check CHECK (purchase_price >= 0),
    CONSTRAINT medicine_batches_selling_price_check CHECK (selling_price >= 0)
);

CREATE TABLE IF NOT EXISTS public.prescriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    customer_id uuid,
    prescription_number text NOT NULL,
    doctor_name text,
    notes text,
    prescription_image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.shop_modules
    ADD CONSTRAINT shop_modules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.shop_modules
    ADD CONSTRAINT shop_modules_shop_id_module_key_key UNIQUE (shop_id, module_key);

ALTER TABLE ONLY public.restaurant_tables
    ADD CONSTRAINT restaurant_tables_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.restaurant_tables
    ADD CONSTRAINT restaurant_tables_shop_id_name_or_number_key UNIQUE (shop_id, name_or_number);

ALTER TABLE ONLY public.restaurant_orders
    ADD CONSTRAINT restaurant_orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.restaurant_orders
    ADD CONSTRAINT restaurant_orders_sale_id_key UNIQUE (sale_id);

ALTER TABLE ONLY public.medicine_batches
    ADD CONSTRAINT medicine_batches_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.medicine_batches
    ADD CONSTRAINT medicine_batches_shop_id_product_id_batch_number_key UNIQUE (shop_id, product_id, batch_number);

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_shop_id_prescription_number_key UNIQUE (shop_id, prescription_number);

CREATE INDEX IF NOT EXISTS idx_shop_modules_shop_id ON public.shop_modules USING btree (shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_modules_enabled ON public.shop_modules USING btree (shop_id, enabled);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_shop_id ON public.restaurant_tables USING btree (shop_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON public.restaurant_tables USING btree (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_shop_id ON public.restaurant_orders USING btree (shop_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_status ON public.restaurant_orders USING btree (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_table_id ON public.restaurant_orders USING btree (table_id);
CREATE INDEX IF NOT EXISTS idx_medicine_batches_shop_id ON public.medicine_batches USING btree (shop_id);
CREATE INDEX IF NOT EXISTS idx_medicine_batches_expiry_date ON public.medicine_batches USING btree (shop_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_medicine_batches_product_id ON public.medicine_batches USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_shop_id ON public.prescriptions USING btree (shop_id);

ALTER TABLE public.shop_modules
    ADD CONSTRAINT shop_modules_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

ALTER TABLE public.restaurant_tables
    ADD CONSTRAINT restaurant_tables_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

ALTER TABLE public.restaurant_orders
    ADD CONSTRAINT restaurant_orders_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

ALTER TABLE public.restaurant_orders
    ADD CONSTRAINT restaurant_orders_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;

ALTER TABLE public.restaurant_orders
    ADD CONSTRAINT restaurant_orders_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.restaurant_tables(id) ON DELETE SET NULL;

ALTER TABLE public.medicine_batches
    ADD CONSTRAINT medicine_batches_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

ALTER TABLE public.medicine_batches
    ADD CONSTRAINT medicine_batches_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.medicine_batches
    ADD CONSTRAINT medicine_batches_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.shop_type_default_modules(p_shop_type text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
    CASE lower(COALESCE(p_shop_type, 'retail'))
        WHEN 'restaurant' THEN
            RETURN ARRAY['dashboard', 'pos', 'products', 'categories', 'inventory', 'sales', 'purchases', 'suppliers', 'customers', 'expenses', 'reports'];
        WHEN 'pharmacy' THEN
            RETURN ARRAY['dashboard', 'pos', 'products', 'categories', 'inventory', 'sales', 'purchases', 'suppliers', 'customers', 'expenses', 'reports'];
        ELSE
            RETURN ARRAY['dashboard', 'pos', 'products', 'categories', 'inventory', 'sales', 'purchases', 'suppliers', 'customers', 'expenses', 'reports'];
    END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_shop_modules(p_shop_id uuid, p_shop_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    preset_modules text[] := public.shop_type_default_modules(p_shop_type);
BEGIN
    UPDATE public.shop_modules
    SET enabled = (module_key = ANY (preset_modules)),
        updated_at = now()
    WHERE shop_id = p_shop_id
      AND NOT is_customized;

    INSERT INTO public.shop_modules (shop_id, module_key, enabled, is_customized)
    SELECT p_shop_id, module_key, true, false
    FROM unnest(preset_modules) AS module_key
    ON CONFLICT (shop_id, module_key) DO UPDATE
    SET enabled = EXCLUDED.enabled,
        updated_at = now()
    WHERE NOT shop_modules.is_customized;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_shop_module_seed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM public.seed_shop_modules(NEW.id, NEW.shop_type);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_shop_modules ON public.shops;
CREATE TRIGGER trg_seed_shop_modules
AFTER INSERT OR UPDATE OF shop_type ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.handle_shop_module_seed();

DROP TRIGGER IF EXISTS trg_touch_shop_modules_updated_at ON public.shop_modules;
CREATE TRIGGER trg_touch_shop_modules_updated_at
BEFORE UPDATE ON public.shop_modules
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_restaurant_tables_updated_at ON public.restaurant_tables;
CREATE TRIGGER trg_touch_restaurant_tables_updated_at
BEFORE UPDATE ON public.restaurant_tables
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_restaurant_orders_updated_at ON public.restaurant_orders;
CREATE TRIGGER trg_touch_restaurant_orders_updated_at
BEFORE UPDATE ON public.restaurant_orders
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_medicine_batches_updated_at ON public.medicine_batches;
CREATE TRIGGER trg_touch_medicine_batches_updated_at
BEFORE UPDATE ON public.medicine_batches
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_prescriptions_updated_at ON public.prescriptions;
CREATE TRIGGER trg_touch_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.shop_modules (shop_id, module_key, enabled, is_customized)
SELECT s.id, module_key, true, false
FROM public.shops s
CROSS JOIN LATERAL unnest(public.shop_type_default_modules(s.shop_type)) AS module_key
ON CONFLICT (shop_id, module_key) DO NOTHING;

ALTER TABLE public.shop_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage shop modules" ON public.shop_modules
    FOR ALL TO authenticated
    USING (public.user_is_shop_member(shop_modules.shop_id) AND EXISTS (
        SELECT 1 FROM public.shops
        WHERE public.shops.id = shop_modules.shop_id
          AND public.shops.owner_id = auth.uid()
    ))
    WITH CHECK (public.user_is_shop_member(shop_modules.shop_id) AND EXISTS (
        SELECT 1 FROM public.shops
        WHERE public.shops.id = shop_modules.shop_id
          AND public.shops.owner_id = auth.uid()
    ));

CREATE POLICY "Members can view shop modules" ON public.shop_modules
    FOR SELECT TO authenticated
    USING (public.user_is_shop_member(shop_id));

CREATE POLICY "Members can manage restaurant tables" ON public.restaurant_tables
    FOR ALL TO authenticated
    USING (public.user_is_shop_member(shop_id))
    WITH CHECK (public.user_is_shop_member(shop_id));

CREATE POLICY "Members can manage restaurant orders" ON public.restaurant_orders
    FOR ALL TO authenticated
    USING (public.user_is_shop_member(shop_id))
    WITH CHECK (public.user_is_shop_member(shop_id));

CREATE POLICY "Members can manage medicine batches" ON public.medicine_batches
    FOR ALL TO authenticated
    USING (public.user_is_shop_member(shop_id))
    WITH CHECK (public.user_is_shop_member(shop_id));

CREATE POLICY "Members can manage prescriptions" ON public.prescriptions
    FOR ALL TO authenticated
    USING (public.user_is_shop_member(shop_id))
    WITH CHECK (public.user_is_shop_member(shop_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shop_modules TO authenticated;
GRANT ALL ON TABLE public.shop_modules TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.restaurant_tables TO authenticated;
GRANT ALL ON TABLE public.restaurant_tables TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.restaurant_orders TO authenticated;
GRANT ALL ON TABLE public.restaurant_orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.medicine_batches TO authenticated;
GRANT ALL ON TABLE public.medicine_batches TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.prescriptions TO authenticated;
GRANT ALL ON TABLE public.prescriptions TO service_role;

REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shop_type_default_modules(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_shop_modules(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_shop_module_seed() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.touch_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.shop_type_default_modules(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.seed_shop_modules(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_shop_module_seed() TO service_role;
