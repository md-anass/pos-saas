\set ON_ERROR_STOP on
SET ROLE authenticated;
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000003';

DO $$
DECLARE
  shop_id uuid := public.get_user_shop_id();
  v_table_id uuid := '30000000-0000-0000-0000-000000000011';
  item_a uuid := '20000000-0000-0000-0000-000000000011';
  item_b uuid := '20000000-0000-0000-0000-000000000012';
  deal_id uuid;
  dine_in uuid;
  second_order uuid;
  takeaway uuid;
  sale_id uuid;
  total numeric;
BEGIN
  IF EXISTS(SELECT 1 FROM public.shop_modules sm WHERE sm.shop_id=public.get_user_shop_id() AND sm.module_key='kitchen' AND sm.enabled) THEN RAISE EXCEPTION 'restaurant preset still exposes kitchen'; END IF;
  IF (SELECT count(*) FROM public.shop_modules sm WHERE sm.shop_id=public.get_user_shop_id() AND sm.enabled AND sm.module_key=ANY(ARRAY['dashboard','pos','sales','menu','restaurant_tables','restaurant_orders','customers','expenses','reports'])) <> 9 THEN RAISE EXCEPTION 'restaurant preset is incomplete'; END IF;

  INSERT INTO public.products(id,shop_id,name,unit,purchase_price,selling_price,quantity,min_stock,unit_type,allows_decimal_quantity,is_active)
  VALUES (item_a,shop_id,'Direct Burger','Plate',100,500,20,1,'piece',false,true),
         (item_b,shop_id,'Direct Drink','Glass',40,200,20,1,'piece',false,true);
  INSERT INTO public.restaurant_tables(id,shop_id,name_or_number,capacity,status) VALUES(v_table_id,shop_id,'D11',4,'available');  UPDATE public.products SET name='Direct Burger Edited' WHERE id=item_a AND public.products.shop_id=public.get_user_shop_id();
  UPDATE public.products SET is_active=false WHERE id=item_a AND public.products.shop_id=public.get_user_shop_id();
  IF EXISTS(SELECT 1 FROM public.products WHERE id=item_a AND is_active) THEN RAISE EXCEPTION 'archived menu item remained sellable'; END IF;
  UPDATE public.products SET is_active=true WHERE id=item_a AND public.products.shop_id=public.get_user_shop_id();

  deal_id := public.manage_restaurant_deal('create',NULL,'Burger Combo','One burger and one drink',600,ARRAY[item_a,item_b],ARRAY[1::numeric,1::numeric]);
  UPDATE public.restaurant_tables SET name_or_number='D11 Edited',capacity=5 WHERE id=v_table_id AND public.restaurant_tables.shop_id=public.get_user_shop_id();  dine_in := public.create_restaurant_order('dine_in',v_table_id,3,'Window side');
  IF (SELECT status FROM public.restaurant_tables WHERE id=v_table_id) <> 'occupied' THEN RAISE EXCEPTION 'table was not occupied'; END IF;  BEGIN
    UPDATE public.restaurant_tables SET status='inactive' WHERE id=v_table_id;
    RAISE EXCEPTION 'occupied table archive was accepted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='occupied table archive was accepted' THEN RAISE; END IF; END;
  PERFORM public.adjust_restaurant_order_item(dine_in,item_a,1,'No mayo');
  PERFORM public.adjust_restaurant_order_item(dine_in,item_a,1,NULL);
  PERFORM public.adjust_restaurant_order_item(dine_in,item_a,-1,NULL);
  PERFORM public.add_restaurant_deal_to_order(dine_in,deal_id,1,NULL);
  SELECT total_amount INTO total FROM public.restaurant_orders WHERE id=dine_in;
  IF total <> 1100 THEN RAISE EXCEPTION 'deal/order total was %, expected 1100',total; END IF;

  second_order := public.create_restaurant_order('takeaway',NULL,NULL,'Second simultaneous order');
  PERFORM public.adjust_restaurant_order_item(second_order,item_b,1,NULL);
  IF (SELECT total_amount FROM public.restaurant_orders WHERE id=dine_in) <> 1100 THEN RAISE EXCEPTION 'simultaneous order isolation failed'; END IF;

  sale_id := public.complete_restaurant_order(dine_in,'cash');
  IF (SELECT total_amount FROM public.sales WHERE id=sale_id) <> 1100 THEN RAISE EXCEPTION 'deal was double charged'; END IF;
  IF (SELECT status FROM public.restaurant_tables WHERE id=v_table_id) <> 'available' THEN RAISE EXCEPTION 'table was not released'; END IF;  UPDATE public.restaurant_tables SET status='inactive' WHERE id=v_table_id;
  IF (SELECT status FROM public.restaurant_tables WHERE id=v_table_id) <> 'inactive' THEN RAISE EXCEPTION 'available table archive failed'; END IF;
  UPDATE public.restaurant_tables SET status='available' WHERE id=v_table_id;
  BEGIN
    PERFORM public.complete_restaurant_order(dine_in,'cash');
    RAISE EXCEPTION 'duplicate payment was accepted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='duplicate payment was accepted' THEN RAISE; END IF; END;

  takeaway := public.create_restaurant_order('takeaway',NULL,NULL,'Pickup');
  IF (SELECT table_id FROM public.restaurant_orders WHERE id=takeaway) IS NOT NULL THEN RAISE EXCEPTION 'takeaway retained a table'; END IF;
  PERFORM public.adjust_restaurant_order_item(takeaway,item_b,1,NULL);
  PERFORM public.complete_restaurant_order(takeaway,'cash');

  BEGIN
    PERFORM public.adjust_restaurant_order_item(second_order,'20000000-0000-0000-0000-000000000001',1,NULL);
    RAISE EXCEPTION 'cross-shop product was accepted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='cross-shop product was accepted' THEN RAISE; END IF; END;
END $$;

RESET ROLE;
DO $$
BEGIN
  IF has_function_privilege('anon','public.create_restaurant_order(text,uuid,integer,text)','EXECUTE')
     OR has_function_privilege('anon','public.adjust_restaurant_order_item(uuid,uuid,integer,text)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.create_restaurant_order(text,uuid,integer,text)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.adjust_restaurant_order_item(uuid,uuid,integer,text)','EXECUTE') THEN
    RAISE EXCEPTION 'restaurant order RPC execution is exposed';
  END IF;
END $$;
