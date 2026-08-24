-- Online-only security hardening for the industry-adaptive schema.
-- This migration intentionally does not alter the offline runtime or migrations.

SET search_path = '';

CREATE OR REPLACE FUNCTION public.user_is_shop_member(check_shop_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shop_members AS member
    JOIN public.shops AS shop ON shop.id = member.shop_id
    WHERE member.shop_id = check_shop_id
      AND member.user_id = auth.uid()
      AND shop.status = 'active'
      AND (shop.subscription_end IS NULL OR shop.subscription_end >= CURRENT_DATE)
  ) OR EXISTS (
    SELECT 1
    FROM public.shops AS shop
    WHERE shop.id = check_shop_id
      AND shop.owner_id = auth.uid()
      AND shop.status = 'active'
      AND (shop.subscription_end IS NULL OR shop.subscription_end >= CURRENT_DATE)
  );
$$;

REVOKE ALL ON FUNCTION public.user_is_shop_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_is_shop_member(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.complete_shop_onboarding(
  p_name text,
  p_shop_type text,
  p_currency text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_shop_id uuid;
  v_existing_name text;
  v_shop_type text := lower(trim(COALESCE(p_shop_type, '')));
  v_currency text := upper(trim(COALESCE(p_currency, '')));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to create a shop';
  END IF;

  IF trim(COALESCE(p_name, '')) = '' OR length(trim(p_name)) > 120 THEN
    RAISE EXCEPTION 'Shop name must be between 1 and 120 characters';
  END IF;

  IF v_shop_type NOT IN ('retail', 'restaurant', 'pharmacy', 'grocery') THEN
    RAISE EXCEPTION 'Unsupported shop type';
  END IF;

  IF v_currency NOT IN ('PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR', 'CAD', 'AUD') THEN
    RAISE EXCEPTION 'Unsupported currency';
  END IF;

  -- Serialize onboarding submissions for this user without blocking other users.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  SELECT shop.id, shop.name
  INTO v_shop_id, v_existing_name
  FROM public.shops AS shop
  WHERE shop.owner_id = v_user_id
  ORDER BY shop.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_shop_id IS NOT NULL AND v_existing_name <> 'Pending Setup' THEN
    RETURN v_shop_id;
  END IF;

  IF v_shop_id IS NULL THEN
    SELECT member.shop_id
    INTO v_shop_id
    FROM public.shop_members AS member
    JOIN public.shops AS shop ON shop.id = member.shop_id
    WHERE member.user_id = v_user_id
      AND shop.status = 'active'
      AND (shop.subscription_end IS NULL OR shop.subscription_end >= CURRENT_DATE)
    ORDER BY shop.created_at
    LIMIT 1;

    IF v_shop_id IS NOT NULL THEN
      RETURN v_shop_id;
    END IF;

    INSERT INTO public.shops (
      owner_id,
      name,
      shop_type,
      business_type,
      currency,
      status
    )
    VALUES (
      v_user_id,
      trim(p_name),
      v_shop_type,
      v_shop_type,
      v_currency,
      'active'
    )
    RETURNING id INTO v_shop_id;
  ELSE
    UPDATE public.shops
    SET name = trim(p_name),
        shop_type = v_shop_type,
        business_type = v_shop_type,
        currency = v_currency,
        status = 'active'
    WHERE id = v_shop_id;
  END IF;

  INSERT INTO public.shop_members (shop_id, user_id, role)
  VALUES (v_shop_id, v_user_id, 'owner')
  ON CONFLICT (shop_id, user_id) DO UPDATE
  SET role = 'owner';

  PERFORM public.seed_shop_modules(v_shop_id, v_shop_type);

  IF NOT EXISTS (
    SELECT 1
    FROM public.shop_members
    WHERE shop_id = v_shop_id
      AND user_id = v_user_id
      AND role = 'owner'
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.shop_modules
    WHERE shop_id = v_shop_id
      AND enabled
  ) THEN
    RAISE EXCEPTION 'Shop initialization did not complete';
  END IF;

  RETURN v_shop_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_shop_onboarding(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_shop_onboarding(text, text, text) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.prevent_shop_id_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.shop_id IS DISTINCT FROM OLD.shop_id THEN
    RAISE EXCEPTION 'shop_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_shop_scoped_references()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp  AS $$
DECLARE
  referenced_shop_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'products' THEN
    IF NEW.category_id IS NOT NULL THEN
      SELECT shop_id INTO referenced_shop_id FROM public.categories WHERE id = NEW.category_id;
      IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'category does not belong to the product shop'; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'product_batches' THEN
    SELECT shop_id INTO referenced_shop_id FROM public.products WHERE id = NEW.product_id;
    IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'product batch product does not belong to the batch shop'; END IF;
    IF NEW.location_id IS NOT NULL THEN
      SELECT shop_id INTO referenced_shop_id FROM public.locations WHERE id = NEW.location_id;
      IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'product batch location does not belong to the batch shop'; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'restaurant_orders' THEN
    IF NEW.table_id IS NOT NULL THEN
      SELECT shop_id INTO referenced_shop_id FROM public.restaurant_tables WHERE id = NEW.table_id;
      IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'restaurant table does not belong to the order shop'; END IF;
    END IF;
    IF NEW.sale_id IS NOT NULL THEN
      SELECT shop_id INTO referenced_shop_id FROM public.sales WHERE id = NEW.sale_id;
      IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'sale does not belong to the order shop'; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'medicine_batches' THEN
    SELECT shop_id INTO referenced_shop_id FROM public.products WHERE id = NEW.product_id;
    IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'medicine batch product does not belong to the batch shop'; END IF;
    IF NEW.supplier_id IS NOT NULL THEN
      SELECT shop_id INTO referenced_shop_id FROM public.suppliers WHERE id = NEW.supplier_id;
      IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'medicine batch supplier does not belong to the batch shop'; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'prescriptions' THEN
    IF NEW.customer_id IS NOT NULL THEN
      SELECT shop_id INTO referenced_shop_id FROM public.customers WHERE id = NEW.customer_id;
      IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'prescription customer does not belong to the prescription shop'; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'purchases' THEN
    IF NEW.supplier_id IS NOT NULL THEN
      SELECT shop_id INTO referenced_shop_id FROM public.suppliers WHERE id = NEW.supplier_id;
      IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'purchase supplier does not belong to the purchase shop'; END IF;
    END IF;
    IF NEW.location_id IS NOT NULL THEN
      SELECT shop_id INTO referenced_shop_id FROM public.locations WHERE id = NEW.location_id;
      IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'purchase location does not belong to the purchase shop'; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'purchase_items' THEN
    SELECT shop_id INTO referenced_shop_id FROM public.purchases WHERE id = NEW.purchase_id;
    IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'purchase does not belong to the purchase item shop'; END IF;
    SELECT shop_id INTO referenced_shop_id FROM public.products WHERE id = NEW.product_id;
    IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'purchase product does not belong to the purchase item shop'; END IF;
    IF NEW.location_id IS NOT NULL THEN
      SELECT shop_id INTO referenced_shop_id FROM public.locations WHERE id = NEW.location_id;
      IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'purchase item location does not belong to the purchase item shop'; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'sales' THEN
    IF NEW.customer_id IS NOT NULL THEN
      SELECT shop_id INTO referenced_shop_id FROM public.customers WHERE id = NEW.customer_id;
      IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'sale customer does not belong to the sale shop'; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'sale_items' THEN
    SELECT shop_id INTO referenced_shop_id FROM public.sales WHERE id = NEW.sale_id;
    IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'sale does not belong to the sale item shop'; END IF;
    SELECT shop_id INTO referenced_shop_id FROM public.products WHERE id = NEW.product_id;
    IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'sale product does not belong to the sale item shop'; END IF;
  ELSIF TG_TABLE_NAME = 'returns' THEN
    SELECT shop_id INTO referenced_shop_id FROM public.sales WHERE id = NEW.sale_id;
    IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'return sale does not belong to the return shop'; END IF;
  ELSIF TG_TABLE_NAME = 'return_items' THEN
    SELECT shop_id INTO referenced_shop_id FROM public.returns WHERE id = NEW.return_id;
    IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'return does not belong to the return item shop'; END IF;
    SELECT shop_id INTO referenced_shop_id FROM public.products WHERE id = NEW.product_id;
    IF referenced_shop_id IS NULL OR referenced_shop_id <> NEW.shop_id THEN RAISE EXCEPTION 'return product does not belong to the return item shop'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.validate_product_quantity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  allows_decimal boolean;
BEGIN
  IF NEW.quantity <= 0 OR NEW.quantity::text IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'quantity must be a positive finite number';
  END IF;
  SELECT allows_decimal_quantity INTO allows_decimal
  FROM public.products
  WHERE id = NEW.product_id AND shop_id = NEW.shop_id;
  IF allows_decimal IS NULL THEN
    RAISE EXCEPTION 'product does not belong to the transaction shop';
  END IF;
  IF NOT allows_decimal AND NEW.quantity <> trunc(NEW.quantity) THEN
    RAISE EXCEPTION 'fractional quantity is not allowed for this product';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'shop_modules', 'products', 'product_batches', 'restaurant_tables',
    'restaurant_orders', 'medicine_batches', 'prescriptions', 'categories',
    'customers', 'suppliers', 'locations', 'sales', 'sale_items', 'purchases',
    'purchase_items', 'returns', 'return_items'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'prevent_shop_id_change_' || table_name, table_name);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OF shop_id ON public.%I FOR EACH ROW EXECUTE FUNCTION public.prevent_shop_id_change()', 'prevent_shop_id_change_' || table_name, table_name);
  END LOOP;
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'products', 'product_batches', 'restaurant_orders', 'medicine_batches',
    'prescriptions', 'purchases', 'purchase_items', 'sales', 'sale_items',
    'returns', 'return_items'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS validate_shop_references_%I ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER validate_shop_references_%I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validate_shop_scoped_references()', table_name, table_name);
  END LOOP;
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['sale_items', 'purchase_items', 'return_items'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS validate_quantity_%I ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER validate_quantity_%I BEFORE INSERT OR UPDATE OF product_id, shop_id, quantity ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validate_product_quantity()', table_name, table_name);
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.product_batches
    WHERE quantity < 0
       OR quantity::text IN ('NaN', 'Infinity', '-Infinity')
  ) THEN
    RAISE EXCEPTION 'product_batches contains invalid quantities; correct the data before applying this migration';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_batches_quantity_nonnegative'
      AND conrelid = 'public.product_batches'::regclass
  ) THEN
    ALTER TABLE public.product_batches
      ADD CONSTRAINT product_batches_quantity_nonnegative
      CHECK (quantity >= 0 AND quantity::text NOT IN ('NaN', 'Infinity', '-Infinity')) NOT VALID;
  END IF;
END;
$$;

ALTER TABLE public.product_batches
  VALIDATE CONSTRAINT product_batches_quantity_nonnegative;


DO $$
DECLARE function_record record;
BEGIN
  FOR function_record IN
    SELECT oid::regprocedure AS signature
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('get_user_shop_id', 'process_sale', 'process_purchase', 'process_return')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', function_record.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', function_record.signature);
  END LOOP;
END;
$$;



ALTER FUNCTION public.get_user_shop_id() SET search_path = '';
ALTER FUNCTION public.handle_new_shop() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.rls_auto_enable() SET search_path = '';
ALTER FUNCTION public.process_purchase(uuid,jsonb,numeric,text) SET search_path = '';
ALTER FUNCTION public.process_purchase(uuid,uuid,jsonb,numeric,numeric,numeric,numeric,text,text,boolean) SET search_path = '';
ALTER FUNCTION public.process_return(uuid,jsonb,numeric) SET search_path = '';
ALTER FUNCTION public.process_sale(text,jsonb,numeric,numeric,numeric,numeric,text) SET search_path = '';
ALTER FUNCTION public.process_sale(uuid,text,jsonb,numeric,numeric,numeric,numeric,text) SET search_path = '';
ALTER FUNCTION public.process_sale(uuid,text,jsonb,numeric,numeric,numeric,numeric,numeric,text,boolean) SET search_path = '';
ALTER FUNCTION public.process_sale(uuid,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,boolean) SET search_path = '';

REVOKE ALL ON FUNCTION public.handle_new_shop() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_shop_modules(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_shop_module_seed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shop_type_default_modules(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_shop_id_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_shop_scoped_references() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_product_quantity() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.handle_new_shop() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
GRANT EXECUTE ON FUNCTION public.seed_shop_modules(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_shop_module_seed() TO service_role;
GRANT EXECUTE ON FUNCTION public.touch_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.shop_type_default_modules(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_shop_id_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_shop_scoped_references() TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_product_quantity() TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;


REVOKE ALL ON TABLE public.shops, public.shop_members, public.shop_modules,
  public.products, public.product_batches, public.categories, public.customers,
  public.suppliers, public.locations, public.sales, public.sale_items,
  public.purchases, public.purchase_items, public.returns, public.return_items,
  public.payments, public.expenses, public.restaurant_tables,
  public.restaurant_orders, public.medicine_batches, public.prescriptions
FROM anon;

ALTER POLICY "Members can update products" ON public.products
  WITH CHECK (public.user_is_shop_member(shop_id));
ALTER POLICY "Members can update batches" ON public.product_batches
  WITH CHECK (public.user_is_shop_member(shop_id));
ALTER POLICY "Members can update sales" ON public.sales
  WITH CHECK (public.user_is_shop_member(shop_id));
