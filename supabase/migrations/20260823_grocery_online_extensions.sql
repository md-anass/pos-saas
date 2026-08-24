SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);

-- Shared product units support both normal retail stock and weighted grocery items.
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS unit_type text NOT NULL DEFAULT 'piece',
    ADD COLUMN IF NOT EXISTS allows_decimal_quantity boolean NOT NULL DEFAULT false;

UPDATE public.products
SET unit_type = CASE lower(trim(unit))
    WHEN 'kg' THEN 'kg'
    WHEN 'gram' THEN 'gram'
    WHEN 'g' THEN 'gram'
    WHEN 'liter' THEN 'liter'
    WHEN 'l' THEN 'liter'
    WHEN 'ml' THEN 'ml'
    WHEN 'meter' THEN 'meter'
    WHEN 'm' THEN 'meter'
    WHEN 'pack' THEN 'pack'
    WHEN 'box' THEN 'box'
    WHEN 'dozen' THEN 'dozen'
    ELSE 'piece'
END,
allows_decimal_quantity = lower(trim(unit)) IN ('kg', 'gram', 'g', 'liter', 'l', 'ml', 'meter', 'm');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_unit_type_check'
    ) THEN
        ALTER TABLE public.products
            ADD CONSTRAINT products_unit_type_check
            CHECK (unit_type = ANY (ARRAY['piece', 'kg', 'gram', 'liter', 'ml', 'pack', 'box', 'dozen', 'meter']));
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_products_shop_barcode
    ON public.products USING btree (shop_id, barcode)
    WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_batches_shop_expiry
    ON public.product_batches USING btree (shop_id, expiry_date)
    WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_batches_product_expiry
    ON public.product_batches USING btree (product_id, expiry_date)
    WHERE expiry_date IS NOT NULL;

-- The prior industry migration exposed internal seed functions and tables to anon.
-- RLS remains enabled, but public execute/table grants are unnecessary and unsafe.
REVOKE ALL ON TABLE public.product_batches FROM anon;

REVOKE ALL ON TABLE public.shop_modules,
    public.restaurant_tables,
    public.restaurant_orders,
    public.medicine_batches,
    public.prescriptions
    FROM anon;

REVOKE ALL ON FUNCTION public.seed_shop_modules(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_shop_module_seed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shop_type_default_modules(text) FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.shop_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.restaurant_tables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.restaurant_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.medicine_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.prescriptions TO authenticated;

GRANT ALL ON TABLE public.shop_modules,
    public.restaurant_tables,
    public.restaurant_orders,
    public.medicine_batches,
    public.prescriptions
    TO service_role;

GRANT EXECUTE ON FUNCTION public.touch_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.shop_type_default_modules(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.seed_shop_modules(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_shop_module_seed() TO service_role;

