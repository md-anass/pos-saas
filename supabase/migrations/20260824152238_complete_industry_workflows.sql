ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.product_batches
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.medicine_batches
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.restaurant_orders
  ADD COLUMN IF NOT EXISTS total_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD CONSTRAINT restaurant_orders_total_amount_check CHECK (total_amount >= 0);
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL;
ALTER TABLE public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_status_check;
ALTER TABLE public.prescriptions
  ADD CONSTRAINT prescriptions_status_check CHECK (status IN ('pending', 'ready', 'dispensed', 'cancelled'));
DO $$
DECLARE
  v_grocery_mismatch bigint;
  v_pharmacy_mismatch bigint;
  v_pharmacy_null_expiry bigint;
  v_pharmacy_no_saleable_batch bigint;
  v_invalid_batch_quantity bigint;
BEGIN
  SELECT count(*) INTO v_invalid_batch_quantity
  FROM (
    SELECT quantity FROM public.product_batches
    UNION ALL
    SELECT quantity FROM public.medicine_batches
  ) batches
  WHERE quantity < 0 OR quantity::text IN ('NaN','Infinity','-Infinity');

  SELECT count(*) INTO v_grocery_mismatch
  FROM public.products p
  JOIN public.shops s ON s.id = p.shop_id AND s.shop_type = 'grocery'
  WHERE p.track_batches
    AND p.quantity IS DISTINCT FROM (
      SELECT COALESCE(sum(b.quantity), 0)
      FROM public.product_batches b
      WHERE b.shop_id = p.shop_id AND b.product_id = p.id AND b.is_active
    );

  SELECT count(*) INTO v_pharmacy_mismatch
  FROM public.products p
  JOIN public.shops s ON s.id = p.shop_id AND s.shop_type = 'pharmacy'
  WHERE p.quantity IS DISTINCT FROM (
    SELECT COALESCE(sum(b.quantity), 0)
    FROM public.medicine_batches b
    WHERE b.shop_id = p.shop_id AND b.product_id = p.id AND b.is_active
  );

  SELECT count(*) INTO v_pharmacy_null_expiry
  FROM public.medicine_batches b
  JOIN public.shops s ON s.id = b.shop_id AND s.shop_type = 'pharmacy'
  WHERE b.is_active AND b.quantity > 0 AND b.expiry_date IS NULL;

  SELECT count(*) INTO v_pharmacy_no_saleable_batch
  FROM public.products p
  JOIN public.shops s ON s.id = p.shop_id AND s.shop_type = 'pharmacy'
  WHERE p.quantity > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.medicine_batches b
      WHERE b.shop_id = p.shop_id AND b.product_id = p.id AND b.is_active
        AND b.quantity > 0 AND b.expiry_date >= CURRENT_DATE
    );

  IF v_invalid_batch_quantity > 0 OR v_grocery_mismatch > 0
     OR v_pharmacy_mismatch > 0 OR v_pharmacy_null_expiry > 0
     OR v_pharmacy_no_saleable_batch > 0 THEN
    RAISE EXCEPTION
      'stock reconciliation required: invalid_batch=%, grocery_mismatch=%, pharmacy_mismatch=%, pharmacy_null_expiry=%, pharmacy_no_saleable_batch=%',
      v_invalid_batch_quantity, v_grocery_mismatch, v_pharmacy_mismatch,
      v_pharmacy_null_expiry, v_pharmacy_no_saleable_batch;
  END IF;
END;
$$;

CREATE TABLE public.restaurant_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.restaurant_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity numeric(10,2) NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, product_id)
);

CREATE TABLE public.prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity numeric(10,2) NOT NULL CHECK (quantity > 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prescription_id, product_id)
);

CREATE INDEX idx_restaurant_order_items_shop_order ON public.restaurant_order_items(shop_id, order_id);
CREATE INDEX idx_prescription_items_shop_prescription ON public.prescription_items(shop_id, prescription_id);
CREATE INDEX idx_product_batches_shop_active_expiry ON public.product_batches(shop_id, is_active, expiry_date);
CREATE INDEX idx_medicine_batches_shop_active_expiry ON public.medicine_batches(shop_id, is_active, expiry_date);

CREATE OR REPLACE FUNCTION public.industry_module_enabled(p_shop_id uuid, p_module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.user_is_shop_member(p_shop_id)
    AND EXISTS (
      SELECT 1 FROM public.shop_modules
      WHERE shop_id = p_shop_id AND module_key = p_module AND enabled
    );
$$;
ALTER TABLE public.restaurant_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage restaurant order items" ON public.restaurant_order_items TO authenticated
  USING (public.industry_module_enabled(shop_id, 'restaurant_orders')) WITH CHECK (public.industry_module_enabled(shop_id, 'restaurant_orders'));
CREATE POLICY "Members manage prescription items" ON public.prescription_items TO authenticated
  USING (public.industry_module_enabled(shop_id, 'prescriptions')) WITH CHECK (public.industry_module_enabled(shop_id, 'prescriptions'));



CREATE OR REPLACE FUNCTION public.validate_industry_child_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE parent_shop uuid; product_shop uuid; parent_status text;
BEGIN
  SELECT shop_id INTO product_shop FROM public.products WHERE id = NEW.product_id AND is_active;
  IF product_shop IS NULL OR product_shop <> NEW.shop_id THEN
    RAISE EXCEPTION 'product does not belong to shop or is inactive';
  END IF;
  IF TG_TABLE_NAME = 'restaurant_order_items' THEN
    SELECT shop_id, status INTO parent_shop, parent_status FROM public.restaurant_orders WHERE id = NEW.order_id;
    IF parent_status IN ('completed', 'cancelled') THEN RAISE EXCEPTION 'closed order items cannot be changed'; END IF;
  ELSE
    SELECT shop_id, status INTO parent_shop, parent_status FROM public.prescriptions WHERE id = NEW.prescription_id;
    IF parent_status IN ('dispensed', 'cancelled') THEN RAISE EXCEPTION 'closed prescription items cannot be changed'; END IF;
  END IF;
  IF parent_shop IS NULL OR parent_shop <> NEW.shop_id THEN RAISE EXCEPTION 'parent does not belong to shop'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_closed_industry_item_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE parent_status text;
BEGIN
  IF TG_TABLE_NAME = 'restaurant_order_items' THEN
    SELECT status INTO parent_status FROM public.restaurant_orders WHERE id = OLD.order_id AND shop_id = OLD.shop_id;
    IF parent_status IN ('completed', 'cancelled') THEN RAISE EXCEPTION 'closed order items cannot be removed'; END IF;
  ELSE
    SELECT status INTO parent_status FROM public.prescriptions WHERE id = OLD.prescription_id AND shop_id = OLD.shop_id;
    IF parent_status IN ('dispensed', 'cancelled') THEN RAISE EXCEPTION 'closed prescription items cannot be removed'; END IF;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER restaurant_order_items_validate BEFORE INSERT OR UPDATE ON public.restaurant_order_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_industry_child_reference();
CREATE TRIGGER prescription_items_validate BEFORE INSERT OR UPDATE ON public.prescription_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_industry_child_reference();
CREATE TRIGGER restaurant_order_items_delete_guard BEFORE DELETE ON public.restaurant_order_items
  FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_industry_item_delete();
CREATE TRIGGER prescription_items_delete_guard BEFORE DELETE ON public.prescription_items
  FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_industry_item_delete();
CREATE TRIGGER restaurant_order_items_shop_immutable BEFORE UPDATE OF shop_id ON public.restaurant_order_items
  FOR EACH ROW EXECUTE FUNCTION public.prevent_shop_id_change();
CREATE TRIGGER prescription_items_shop_immutable BEFORE UPDATE OF shop_id ON public.prescription_items
  FOR EACH ROW EXECUTE FUNCTION public.prevent_shop_id_change();

CREATE OR REPLACE FUNCTION public.refresh_restaurant_order_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE target_order uuid;
BEGIN
  target_order := CASE WHEN TG_OP = 'DELETE' THEN OLD.order_id ELSE NEW.order_id END;
  UPDATE public.restaurant_orders
  SET total_amount = (
    SELECT COALESCE(sum(quantity * unit_price), 0)
    FROM public.restaurant_order_items WHERE order_id = target_order
  ), updated_at = now()
  WHERE id = target_order;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
CREATE TRIGGER restaurant_order_items_total AFTER INSERT OR UPDATE OR DELETE ON public.restaurant_order_items
  FOR EACH ROW EXECUTE FUNCTION public.refresh_restaurant_order_total();

CREATE OR REPLACE FUNCTION public.manage_inventory_batch(
  p_kind text,
  p_operation text,
  p_batch_id uuid DEFAULT NULL,
  p_product_id uuid DEFAULT NULL,
  p_batch_number text DEFAULT NULL,
  p_manufacture_date date DEFAULT NULL,
  p_expiry_date date DEFAULT NULL,
  p_quantity numeric DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_purchase_price numeric DEFAULT 0,
  p_selling_price numeric DEFAULT 0
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_shop uuid := public.get_user_shop_id();
  v_shop_type text;
  v_module text := 'medicine_batches';
  v_product_id uuid;
  v_old_quantity numeric;
  v_new_quantity numeric;
  v_product_stock numeric;
  v_batch_total numeric;
  v_allows_decimal boolean;
  v_is_tracked boolean;
  v_batch_id uuid;
BEGIN
  IF v_shop IS NULL OR NOT public.industry_module_enabled(v_shop, v_module) THEN RAISE EXCEPTION 'unauthorized module'; END IF;
  SELECT shop_type INTO v_shop_type FROM public.shops WHERE id = v_shop;
  IF p_kind NOT IN ('grocery', 'pharmacy') OR p_kind <> v_shop_type THEN RAISE EXCEPTION 'batch type does not match shop'; END IF;
  IF p_operation NOT IN ('create', 'allocate', 'update', 'archive') THEN RAISE EXCEPTION 'invalid batch operation'; END IF;
  IF p_operation = 'allocate' AND p_kind <> 'grocery' THEN RAISE EXCEPTION 'existing-stock allocation is only supported for grocery products'; END IF;

  IF p_operation IN ('create', 'allocate') THEN
    IF p_product_id IS NULL OR COALESCE(trim(p_batch_number), '') = '' OR p_quantity IS NULL OR p_quantity < 0 THEN RAISE EXCEPTION 'invalid batch input'; END IF;
    SELECT quantity, allows_decimal_quantity, track_batches
      INTO v_product_stock, v_allows_decimal, v_is_tracked
      FROM public.products
      WHERE id = p_product_id AND shop_id = v_shop AND is_active
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'product does not belong to shop'; END IF;
    IF NOT v_allows_decimal AND p_quantity <> trunc(p_quantity) THEN RAISE EXCEPTION 'fractional batch quantity is not allowed for this product'; END IF;
    IF p_purchase_price < 0 OR p_selling_price < 0 THEN RAISE EXCEPTION 'batch prices cannot be negative'; END IF;
    IF p_supplier_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.suppliers WHERE id = p_supplier_id AND shop_id = v_shop) THEN RAISE EXCEPTION 'supplier does not belong to shop'; END IF;
    IF p_kind = 'pharmacy' AND p_expiry_date IS NULL THEN RAISE EXCEPTION 'pharmacy batch expiry date is required'; END IF;

    IF p_kind = 'pharmacy' THEN
      SELECT COALESCE(sum(quantity), 0) INTO v_batch_total
      FROM public.medicine_batches WHERE shop_id = v_shop AND product_id = p_product_id AND is_active;
    ELSE
      SELECT COALESCE(sum(quantity), 0) INTO v_batch_total
      FROM public.product_batches WHERE shop_id = v_shop AND product_id = p_product_id AND is_active;
    END IF;
    IF p_operation <> 'allocate' AND v_product_stock IS DISTINCT FROM v_batch_total THEN RAISE EXCEPTION 'product stock does not match active batch stock; reconciliation is required'; END IF;

    IF p_operation = 'allocate' THEN
      IF v_is_tracked OR v_batch_total <> 0 OR p_quantity <> v_product_stock OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'existing-stock allocation must exactly match positive unbatched product stock';
      END IF;
      INSERT INTO public.product_batches(shop_id, product_id, batch_number, expiry_date, quantity, is_active)
      VALUES(v_shop, p_product_id, trim(p_batch_number), p_expiry_date, p_quantity, true)
      RETURNING id INTO v_batch_id;
      UPDATE public.products SET track_batches = true WHERE id = p_product_id AND shop_id = v_shop;
      RETURN v_batch_id;
    END IF;

    IF p_kind = 'grocery' AND NOT v_is_tracked AND v_product_stock <> 0 THEN
      RAISE EXCEPTION 'existing grocery stock must be allocated explicitly before receiving new batch stock';
    END IF;
    IF p_kind = 'pharmacy' THEN
      INSERT INTO public.medicine_batches(shop_id, product_id, batch_number, manufacture_date, expiry_date, quantity, supplier_id, purchase_price, selling_price, is_active)
      VALUES(v_shop, p_product_id, trim(p_batch_number), p_manufacture_date, p_expiry_date, p_quantity, p_supplier_id, p_purchase_price, p_selling_price, true)
      RETURNING id INTO v_batch_id;
    ELSE
      INSERT INTO public.product_batches(shop_id, product_id, batch_number, expiry_date, quantity, is_active)
      VALUES(v_shop, p_product_id, trim(p_batch_number), p_expiry_date, p_quantity, true)
      RETURNING id INTO v_batch_id;
    END IF;
    UPDATE public.products SET quantity = quantity + p_quantity, track_batches = true WHERE id = p_product_id AND shop_id = v_shop;
    RETURN v_batch_id;
  END IF;

  IF p_batch_id IS NULL THEN RAISE EXCEPTION 'batch id is required'; END IF;
  IF p_kind = 'pharmacy' THEN
    SELECT product_id INTO v_product_id FROM public.medicine_batches WHERE id = p_batch_id AND shop_id = v_shop AND is_active;
  ELSE
    SELECT product_id INTO v_product_id FROM public.product_batches WHERE id = p_batch_id AND shop_id = v_shop AND is_active;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'active batch does not belong to shop'; END IF;
  SELECT quantity, allows_decimal_quantity INTO v_product_stock, v_allows_decimal
    FROM public.products WHERE id = v_product_id AND shop_id = v_shop FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'batch product does not belong to shop'; END IF;
  IF p_kind = 'pharmacy' THEN
    SELECT quantity INTO v_old_quantity FROM public.medicine_batches WHERE id = p_batch_id AND shop_id = v_shop AND product_id = v_product_id AND is_active FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'batch changed concurrently'; END IF;
    SELECT COALESCE(sum(quantity), 0) INTO v_batch_total FROM public.medicine_batches WHERE shop_id = v_shop AND product_id = v_product_id AND is_active;
  ELSE
    SELECT quantity INTO v_old_quantity FROM public.product_batches WHERE id = p_batch_id AND shop_id = v_shop AND product_id = v_product_id AND is_active FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'batch changed concurrently'; END IF;
    SELECT COALESCE(sum(quantity), 0) INTO v_batch_total FROM public.product_batches WHERE shop_id = v_shop AND product_id = v_product_id AND is_active;
  END IF;
  IF v_product_stock IS DISTINCT FROM v_batch_total THEN RAISE EXCEPTION 'product stock does not match active batch stock; reconciliation is required'; END IF;

  IF p_operation = 'archive' THEN
    IF v_product_stock < v_old_quantity THEN RAISE EXCEPTION 'batch archive would make product stock negative'; END IF;
    IF p_kind = 'pharmacy' THEN
      UPDATE public.medicine_batches SET quantity = 0, is_active = false, updated_at = now() WHERE id = p_batch_id AND shop_id = v_shop;
    ELSE
      UPDATE public.product_batches SET quantity = 0, is_active = false, updated_at = now() WHERE id = p_batch_id AND shop_id = v_shop;
    END IF;
    UPDATE public.products SET quantity = quantity - v_old_quantity WHERE id = v_product_id AND shop_id = v_shop;
    RETURN p_batch_id;
  END IF;

  IF p_quantity IS NULL OR p_quantity < 0 OR COALESCE(trim(p_batch_number), '') = '' THEN RAISE EXCEPTION 'invalid batch update'; END IF;
  IF NOT v_allows_decimal AND p_quantity <> trunc(p_quantity) THEN RAISE EXCEPTION 'fractional batch quantity is not allowed for this product'; END IF;
  IF p_purchase_price < 0 OR p_selling_price < 0 THEN RAISE EXCEPTION 'batch prices cannot be negative'; END IF;
  IF p_kind = 'pharmacy' AND p_expiry_date IS NULL THEN RAISE EXCEPTION 'pharmacy batch expiry date is required'; END IF;
  v_new_quantity := v_product_stock + (p_quantity - v_old_quantity);
  IF v_new_quantity < 0 THEN RAISE EXCEPTION 'batch adjustment would make product stock negative'; END IF;
  IF p_supplier_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.suppliers WHERE id = p_supplier_id AND shop_id = v_shop) THEN RAISE EXCEPTION 'supplier does not belong to shop'; END IF;
  IF p_kind = 'pharmacy' THEN
    UPDATE public.medicine_batches SET batch_number = trim(p_batch_number), manufacture_date = p_manufacture_date,
      expiry_date = p_expiry_date, quantity = p_quantity, supplier_id = p_supplier_id,
      purchase_price = p_purchase_price, selling_price = p_selling_price, updated_at = now()
    WHERE id = p_batch_id AND shop_id = v_shop AND product_id = v_product_id AND is_active;
  ELSE
    UPDATE public.product_batches SET batch_number = trim(p_batch_number), expiry_date = p_expiry_date,
      quantity = p_quantity, updated_at = now()
    WHERE id = p_batch_id AND shop_id = v_shop AND product_id = v_product_id AND is_active;
  END IF;
  UPDATE public.products SET quantity = v_new_quantity, track_batches = true WHERE id = v_product_id AND shop_id = v_shop;
  RETURN p_batch_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.sync_pharmacy_purchase_batch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_type text; v_supplier uuid; v_selling numeric;
BEGIN
  SELECT shop_type INTO v_type FROM public.shops WHERE id = NEW.shop_id;
  IF v_type <> 'pharmacy' THEN RETURN NEW; END IF;
  IF COALESCE(trim(NEW.batch_number), '') = '' OR NEW.expiry_date IS NULL THEN
    RAISE EXCEPTION 'pharmacy purchases require batch number and expiry date';
  END IF;
  SELECT supplier_id INTO v_supplier FROM public.purchases WHERE id = NEW.purchase_id AND shop_id = NEW.shop_id;
  SELECT selling_price INTO v_selling FROM public.products WHERE id = NEW.product_id AND shop_id = NEW.shop_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'purchase product does not belong to pharmacy'; END IF;
  INSERT INTO public.medicine_batches(shop_id, product_id, batch_number, expiry_date, quantity, supplier_id, purchase_price, selling_price, is_active)
  VALUES(NEW.shop_id, NEW.product_id, trim(NEW.batch_number), NEW.expiry_date, NEW.quantity, v_supplier, NEW.unit_price, v_selling, true)
  ON CONFLICT (shop_id, product_id, batch_number) DO UPDATE SET
    quantity = public.medicine_batches.quantity + EXCLUDED.quantity,
    expiry_date = EXCLUDED.expiry_date, supplier_id = EXCLUDED.supplier_id,
    purchase_price = EXCLUDED.purchase_price, selling_price = EXCLUDED.selling_price,
    is_active = true, updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER purchase_items_sync_pharmacy_batch BEFORE INSERT ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_pharmacy_purchase_batch();
CREATE OR REPLACE FUNCTION public.require_pharmacy_batch_expiry()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.is_active AND NEW.quantity > 0 AND NEW.expiry_date IS NULL THEN
    RAISE EXCEPTION 'active pharmacy batch stock requires an expiry date';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER medicine_batches_expiry_required BEFORE INSERT OR UPDATE OF quantity, expiry_date, is_active ON public.medicine_batches
  FOR EACH ROW EXECUTE FUNCTION public.require_pharmacy_batch_expiry();
CREATE OR REPLACE FUNCTION public.prevent_duplicate_pharmacy_product_batch()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.shops WHERE id = NEW.shop_id AND shop_type = 'pharmacy') THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER product_batches_pharmacy_duplicate_guard BEFORE INSERT OR UPDATE ON public.product_batches
  FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_pharmacy_product_batch();

CREATE OR REPLACE FUNCTION public.reject_unbatched_industry_return()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_type text; v_track boolean;
BEGIN
  SELECT s.shop_type, p.track_batches INTO v_type, v_track FROM public.shops s
    JOIN public.products p ON p.shop_id = s.id WHERE s.id = NEW.shop_id AND p.id = NEW.product_id;
  IF v_type = 'pharmacy' OR (v_type = 'grocery' AND v_track) THEN
    RAISE EXCEPTION 'tracked product returns require an explicit batch destination';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER return_items_require_batch_destination BEFORE INSERT ON public.return_items
  FOR EACH ROW EXECUTE FUNCTION public.reject_unbatched_industry_return();
CREATE OR REPLACE FUNCTION public.consume_tracked_sale_batches()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_type text; v_track boolean; v_needed numeric; v_take numeric; v_batch record;
BEGIN
  SELECT s.shop_type, p.track_batches INTO v_type, v_track
  FROM public.shops s JOIN public.products p ON p.shop_id = s.id
  WHERE s.id = NEW.shop_id AND p.id = NEW.product_id;
  IF v_type NOT IN ('grocery', 'pharmacy') OR (v_type = 'grocery' AND NOT v_track) THEN RETURN NEW; END IF;
  v_needed := NEW.quantity;
  IF v_type = 'pharmacy' THEN
    FOR v_batch IN SELECT id, quantity FROM public.medicine_batches
      WHERE shop_id = NEW.shop_id AND product_id = NEW.product_id AND is_active AND quantity > 0
        AND expiry_date >= CURRENT_DATE
      ORDER BY expiry_date NULLS LAST, created_at FOR UPDATE
    LOOP
      v_take := LEAST(v_needed, v_batch.quantity);
      UPDATE public.medicine_batches SET quantity = quantity - v_take, updated_at = now() WHERE id = v_batch.id;
      v_needed := v_needed - v_take; EXIT WHEN v_needed = 0;
    END LOOP;
  ELSE
    FOR v_batch IN SELECT id, quantity FROM public.product_batches
      WHERE shop_id = NEW.shop_id AND product_id = NEW.product_id AND is_active AND quantity > 0
        AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
      ORDER BY expiry_date NULLS LAST, created_at FOR UPDATE
    LOOP
      v_take := LEAST(v_needed, v_batch.quantity);
      UPDATE public.product_batches SET quantity = quantity - v_take, updated_at = now() WHERE id = v_batch.id;
      v_needed := v_needed - v_take; EXIT WHEN v_needed = 0;
    END LOOP;
  END IF;
  IF v_needed > 0 THEN RAISE EXCEPTION 'insufficient non-expired batch stock'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sale_items_consume_tracked_batches BEFORE INSERT ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.consume_tracked_sale_batches();
CREATE OR REPLACE FUNCTION public.protect_industry_stock_and_records()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_type text;
BEGIN
  SELECT shop_type INTO v_type FROM public.shops WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.shop_id ELSE NEW.shop_id END;
  IF TG_TABLE_NAME = 'products' AND TG_OP = 'UPDATE' THEN
    IF current_user <> 'postgres' AND (OLD.track_batches OR v_type = 'pharmacy') AND NEW.quantity IS DISTINCT FROM OLD.quantity THEN
      RAISE EXCEPTION 'batch-tracked stock must be changed through the batch transaction';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'products' AND v_type IN ('grocery', 'restaurant', 'pharmacy') THEN
    RAISE EXCEPTION 'industry products must be archived, not deleted';
  END IF;
  IF TG_TABLE_NAME IN ('restaurant_tables', 'restaurant_orders', 'prescriptions') THEN
    RAISE EXCEPTION 'operational records must be archived or transitioned, not deleted';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER products_tracked_stock_guard BEFORE UPDATE OF quantity ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.protect_industry_stock_and_records();
CREATE TRIGGER products_industry_delete_guard BEFORE DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.protect_industry_stock_and_records();
CREATE TRIGGER restaurant_tables_delete_guard BEFORE DELETE ON public.restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION public.protect_industry_stock_and_records();
CREATE TRIGGER restaurant_orders_delete_guard BEFORE DELETE ON public.restaurant_orders
  FOR EACH ROW EXECUTE FUNCTION public.protect_industry_stock_and_records();
CREATE TRIGGER prescriptions_delete_guard BEFORE DELETE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.protect_industry_stock_and_records();

ALTER POLICY "Members can manage restaurant tables" ON public.restaurant_tables
  USING (public.industry_module_enabled(shop_id, 'restaurant_tables'))
  WITH CHECK (public.industry_module_enabled(shop_id, 'restaurant_tables'));
ALTER POLICY "Members can manage restaurant orders" ON public.restaurant_orders
  USING (public.industry_module_enabled(shop_id, 'restaurant_orders'))
  WITH CHECK (public.industry_module_enabled(shop_id, 'restaurant_orders'));
ALTER POLICY "Members can manage medicine batches" ON public.medicine_batches
  USING (public.industry_module_enabled(shop_id, 'medicine_batches'))
  WITH CHECK (public.industry_module_enabled(shop_id, 'medicine_batches'));
ALTER POLICY "Members can manage prescriptions" ON public.prescriptions
  USING (public.industry_module_enabled(shop_id, 'prescriptions'))
  WITH CHECK (public.industry_module_enabled(shop_id, 'prescriptions'));

CREATE OR REPLACE FUNCTION public.enforce_industry_status_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_TABLE_NAME = 'restaurant_orders' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'completed' AND current_user = 'postgres' THEN RETURN NEW; END IF;
    IF NOT ((OLD.status = 'pending' AND NEW.status IN ('confirmed','cancelled'))
      OR (OLD.status = 'confirmed' AND NEW.status IN ('preparing','cancelled'))
      OR (OLD.status = 'preparing' AND NEW.status IN ('ready','cancelled'))
      OR (OLD.status = 'ready' AND NEW.status IN ('served','cancelled'))
      OR (OLD.status = 'served' AND NEW.status = 'cancelled')) THEN
      RAISE EXCEPTION 'invalid restaurant order status transition';
    END IF;
  ELSIF TG_TABLE_NAME = 'prescriptions' THEN
    IF (NEW.status = 'dispensed' OR NEW.sale_id IS DISTINCT FROM OLD.sale_id) AND current_user <> 'postgres' THEN
      RAISE EXCEPTION 'dispensing must use the secured function';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'dispensed'
      AND NOT ((OLD.status = 'pending' AND NEW.status IN ('ready','cancelled'))
        OR (OLD.status = 'ready' AND NEW.status IN ('pending','cancelled'))) THEN
      RAISE EXCEPTION 'invalid prescription status transition';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER restaurant_orders_status_transition BEFORE UPDATE OF status ON public.restaurant_orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_industry_status_transition();
CREATE TRIGGER prescriptions_status_transition BEFORE UPDATE OF status, sale_id ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_industry_status_transition();

CREATE OR REPLACE FUNCTION public.create_restaurant_order(p_order_type text, p_table_id uuid, p_notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_shop uuid := public.get_user_shop_id(); v_order uuid;
BEGIN
  IF v_shop IS NULL OR NOT public.industry_module_enabled(v_shop, 'restaurant_orders') THEN RAISE EXCEPTION 'unauthorized module'; END IF;
  IF p_order_type NOT IN ('dine_in','takeaway') OR (p_order_type = 'dine_in' AND p_table_id IS NULL) THEN RAISE EXCEPTION 'invalid order type'; END IF;
  IF p_table_id IS NOT NULL THEN
    PERFORM 1 FROM public.restaurant_tables WHERE id = p_table_id AND shop_id = v_shop AND status = 'available' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'table is unavailable or belongs to another shop'; END IF;
  END IF;
  INSERT INTO public.restaurant_orders(shop_id, table_id, order_type, notes, status)
    VALUES(v_shop, p_table_id, p_order_type, NULLIF(trim(p_notes),''), 'pending') RETURNING id INTO v_order;
  IF p_table_id IS NOT NULL THEN UPDATE public.restaurant_tables SET status = 'occupied' WHERE id = p_table_id AND shop_id = v_shop; END IF;
  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_restaurant_order(p_order_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_shop uuid := public.get_user_shop_id();
BEGIN
  IF v_shop IS NULL OR NOT (public.industry_module_enabled(v_shop, 'restaurant_orders') OR public.industry_module_enabled(v_shop, 'kitchen')) THEN RAISE EXCEPTION 'unauthorized module'; END IF;
  UPDATE public.restaurant_orders SET status = p_status, updated_at = now() WHERE id = p_order_id AND shop_id = v_shop AND sale_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found or already paid'; END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.complete_restaurant_order(p_order_id uuid, p_payment_method text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_shop uuid := public.get_user_shop_id(); v_sale uuid; v_total numeric; v_table uuid; v_item record;
BEGIN
  IF v_shop IS NULL OR NOT public.industry_module_enabled(v_shop, 'restaurant_orders') THEN RAISE EXCEPTION 'unauthorized module'; END IF;
  SELECT table_id, total_amount INTO v_table, v_total FROM public.restaurant_orders
    WHERE id = p_order_id AND shop_id = v_shop AND status IN ('ready', 'served') AND sale_id IS NULL FOR UPDATE;
  IF NOT FOUND OR v_total <= 0 THEN RAISE EXCEPTION 'order is not ready for payment'; END IF;
  FOR v_item IN SELECT oi.quantity, p.name, p.quantity stock FROM public.restaurant_order_items oi
    JOIN public.products p ON p.id = oi.product_id AND p.shop_id = v_shop
    WHERE oi.order_id = p_order_id FOR UPDATE OF p
  LOOP IF v_item.stock < v_item.quantity THEN RAISE EXCEPTION 'insufficient stock for %', v_item.name; END IF; END LOOP;
  INSERT INTO public.sales(shop_id, user_id, customer_name, subtotal, discount, tax, total_amount, status)
    VALUES(v_shop, auth.uid(), 'Restaurant Guest', v_total, 0, 0, v_total, 'completed') RETURNING id INTO v_sale;
  INSERT INTO public.sale_items(sale_id, shop_id, product_id, product_name, quantity, unit_price, total_price)
    SELECT v_sale, v_shop, oi.product_id, p.name, oi.quantity, oi.unit_price, oi.quantity * oi.unit_price
    FROM public.restaurant_order_items oi JOIN public.products p ON p.id = oi.product_id WHERE oi.order_id = p_order_id;
  UPDATE public.products p SET quantity = p.quantity - oi.quantity
    FROM public.restaurant_order_items oi WHERE oi.order_id = p_order_id AND p.id = oi.product_id AND p.shop_id = v_shop;
  INSERT INTO public.payments(sale_id, shop_id, amount, method) VALUES(v_sale, v_shop, v_total, p_payment_method);
  UPDATE public.restaurant_orders SET sale_id = v_sale, status = 'completed', updated_at = now() WHERE id = p_order_id AND shop_id = v_shop;
  IF v_table IS NOT NULL THEN UPDATE public.restaurant_tables SET status = 'available' WHERE id = v_table AND shop_id = v_shop; END IF;
  RETURN v_sale;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispense_prescription(p_prescription_id uuid, p_payment_method text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_shop uuid := public.get_user_shop_id(); v_sale uuid; v_total numeric := 0; v_item record;
BEGIN
  IF v_shop IS NULL OR NOT public.industry_module_enabled(v_shop, 'prescriptions') THEN RAISE EXCEPTION 'unauthorized module'; END IF;
  PERFORM 1 FROM public.prescriptions WHERE id = p_prescription_id AND shop_id = v_shop AND status = 'ready' AND sale_id IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'prescription is not ready for dispensing'; END IF;
  FOR v_item IN SELECT pi.quantity, p.id product_id, p.name, p.selling_price, p.quantity stock
    FROM public.prescription_items pi JOIN public.products p ON p.id = pi.product_id AND p.shop_id = v_shop
    WHERE pi.prescription_id = p_prescription_id FOR UPDATE OF p
  LOOP
    IF v_item.stock < v_item.quantity THEN RAISE EXCEPTION 'insufficient stock for %', v_item.name; END IF;
    v_total := v_total + (v_item.quantity * v_item.selling_price);
  END LOOP;
  IF v_total <= 0 THEN RAISE EXCEPTION 'prescription has no items'; END IF;
  INSERT INTO public.sales(shop_id, user_id, customer_name, subtotal, discount, tax, total_amount, status)
    VALUES(v_shop, auth.uid(), 'Prescription Customer', v_total, 0, 0, v_total, 'completed') RETURNING id INTO v_sale;
  INSERT INTO public.sale_items(sale_id, shop_id, product_id, product_name, quantity, unit_price, total_price)
    SELECT v_sale, v_shop, pi.product_id, p.name, pi.quantity, p.selling_price, pi.quantity * p.selling_price
    FROM public.prescription_items pi JOIN public.products p ON p.id = pi.product_id WHERE pi.prescription_id = p_prescription_id;
  UPDATE public.products p SET quantity = p.quantity - pi.quantity
    FROM public.prescription_items pi WHERE pi.prescription_id = p_prescription_id AND p.id = pi.product_id AND p.shop_id = v_shop;
  INSERT INTO public.payments(sale_id, shop_id, amount, method) VALUES(v_sale, v_shop, v_total, p_payment_method);
  UPDATE public.prescriptions SET status = 'dispensed', sale_id = v_sale, updated_at = now() WHERE id = p_prescription_id AND shop_id = v_shop;
  RETURN v_sale;
END;
$$;

CREATE OR REPLACE FUNCTION public.shop_type_default_modules(p_shop_type text)
RETURNS text[] LANGUAGE plpgsql STABLE SET search_path = '' AS $$
BEGIN
  CASE lower(COALESCE(p_shop_type, 'retail'))
    WHEN 'restaurant' THEN RETURN ARRAY['dashboard','pos','sales','menu','restaurant_tables','restaurant_orders','kitchen','customers','expenses','reports'];
    WHEN 'pharmacy' THEN RETURN ARRAY['dashboard','pos','products','medicines','customers','categories','medicine_batches','medicine_expiry','prescriptions','suppliers','purchases','sales','reports'];
    WHEN 'grocery' THEN RETURN ARRAY['dashboard','pos','products','categories','inventory','sales','purchases','suppliers','customers','expenses','reports','medicine_batches','medicine_expiry'];
    ELSE RETURN ARRAY['dashboard','pos','products','categories','inventory','sales','purchases','suppliers','customers','expenses','reports'];
  END CASE;
END;
$$;

DO $$ DECLARE shop_record record; BEGIN
  FOR shop_record IN SELECT id, shop_type FROM public.shops WHERE shop_type IN ('retail','restaurant','pharmacy','grocery') LOOP
    PERFORM public.seed_shop_modules(shop_record.id, shop_record.shop_type);
  END LOOP;
END $$;

REVOKE INSERT, UPDATE, DELETE ON public.product_batches, public.medicine_batches,
  public.sales, public.sale_items, public.payments, public.purchases, public.purchase_items,
  public.returns, public.return_items FROM authenticated;
REVOKE ALL ON public.restaurant_order_items, public.prescription_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_order_items, public.prescription_items TO authenticated;
GRANT SELECT ON public.product_batches, public.medicine_batches TO authenticated;
GRANT ALL ON public.restaurant_order_items, public.prescription_items, public.product_batches, public.medicine_batches TO service_role;

REVOKE ALL ON FUNCTION public.manage_inventory_batch(text,text,uuid,uuid,text,date,date,numeric,uuid,numeric,numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_restaurant_order(text,uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transition_restaurant_order(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_restaurant_order(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dispense_prescription(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_inventory_batch(text,text,uuid,uuid,text,date,date,numeric,uuid,numeric,numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_restaurant_order(text,uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transition_restaurant_order(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_restaurant_order(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dispense_prescription(uuid,text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.industry_module_enabled(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_industry_child_reference() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_closed_industry_item_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_restaurant_order_total() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_tracked_sale_batches() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_pharmacy_purchase_batch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_unbatched_industry_return() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_industry_status_transition() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_industry_stock_and_records() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_duplicate_pharmacy_product_batch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.require_pharmacy_batch_expiry() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.industry_module_enabled(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_industry_child_reference() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_closed_industry_item_delete() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_restaurant_order_total() TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_tracked_sale_batches() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_pharmacy_purchase_batch() TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_unbatched_industry_return() TO service_role;
GRANT EXECUTE ON FUNCTION public.enforce_industry_status_transition() TO service_role;
GRANT EXECUTE ON FUNCTION public.protect_industry_stock_and_records() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_duplicate_pharmacy_product_batch() TO service_role;
GRANT EXECUTE ON FUNCTION public.require_pharmacy_batch_expiry() TO service_role;
