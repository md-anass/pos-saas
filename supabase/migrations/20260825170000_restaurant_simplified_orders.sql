-- Simplified Restaurant order compatibility after the Deals migration.
-- No Kitchen, KDS, KOT, or status-transition workflow is introduced here.

CREATE OR REPLACE FUNCTION public.create_restaurant_order(p_order_type text,p_table_id uuid,p_guest_count integer,p_notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_shop uuid := public.get_user_shop_id();
  v_order uuid;
BEGIN
  IF v_shop IS NULL OR NOT public.industry_module_enabled(v_shop,'restaurant_orders') THEN RAISE EXCEPTION 'unauthorized module'; END IF;
  IF p_order_type NOT IN ('dine_in','takeaway') OR (p_order_type='dine_in' AND p_table_id IS NULL) OR (p_order_type='takeaway' AND p_table_id IS NOT NULL) OR (p_guest_count IS NOT NULL AND p_guest_count<1) THEN
    RAISE EXCEPTION 'invalid order details';
  END IF;
  IF p_table_id IS NOT NULL THEN
    PERFORM 1 FROM public.restaurant_tables WHERE id=p_table_id AND shop_id=v_shop AND status='available' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'table is unavailable or belongs to another shop'; END IF;
  END IF;
  INSERT INTO public.restaurant_orders(shop_id,table_id,order_type,guest_count,notes,status)
    VALUES(v_shop,p_table_id,p_order_type,p_guest_count,NULLIF(trim(p_notes),''),'pending') RETURNING id INTO v_order;
  IF p_table_id IS NOT NULL THEN UPDATE public.restaurant_tables SET status='occupied' WHERE id=p_table_id AND shop_id=v_shop; END IF;
  RETURN v_order;
END $$;

REVOKE ALL ON FUNCTION public.create_restaurant_order(text,uuid,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_restaurant_order(text,uuid,integer,text) TO authenticated, service_role;
CREATE FUNCTION public.prevent_occupied_restaurant_table_archive()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF NEW.status='inactive' AND OLD.status IS DISTINCT FROM NEW.status AND EXISTS(
    SELECT 1 FROM public.restaurant_orders WHERE table_id=OLD.id AND shop_id=OLD.shop_id AND status='pending' AND sale_id IS NULL
  ) THEN RAISE EXCEPTION 'table cannot be archived while it has an active order'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER restaurant_tables_occupied_archive_guard BEFORE UPDATE OF status ON public.restaurant_tables FOR EACH ROW EXECUTE FUNCTION public.prevent_occupied_restaurant_table_archive();
REVOKE ALL ON FUNCTION public.prevent_occupied_restaurant_table_archive() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_occupied_restaurant_table_archive() TO service_role;
