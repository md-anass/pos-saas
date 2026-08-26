\set ON_ERROR_STOP on

-- DROP TRIGGER IF EXISTS can emit NOTICE on first application; final objects must still exist.
DO $$
DECLARE missing_count integer;
BEGIN
  IF (SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'prevent_shop_id_change_%' AND NOT tgisinternal) <> 17
     OR (SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'validate_shop_references_%' AND NOT tgisinternal) <> 11
     OR (SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'validate_quantity_%' AND NOT tgisinternal) <> 3 THEN
    RAISE EXCEPTION 'security hardening trigger set is incomplete';
  END IF;

  SELECT count(*) INTO missing_count
  FROM (VALUES
    ('restaurant_order_items','restaurant_order_items_validate'),
    ('prescription_items','prescription_items_validate'),
    ('restaurant_order_items','restaurant_order_items_delete_guard'),
    ('prescription_items','prescription_items_delete_guard'),
    ('restaurant_order_items','restaurant_order_items_shop_immutable'),
    ('prescription_items','prescription_items_shop_immutable'),
    ('restaurant_order_items','restaurant_order_items_total'),
    ('purchase_items','purchase_items_sync_pharmacy_batch'),
    ('product_batches','product_batches_pharmacy_duplicate_guard'),
    ('medicine_batches','medicine_batches_expiry_required'),
    ('return_items','return_items_require_batch_destination'),
    ('sale_items','sale_items_consume_tracked_batches'),
    ('products','products_tracked_stock_guard'),
    ('products','products_industry_delete_guard'),
    ('restaurant_tables','restaurant_tables_delete_guard'),
    ('restaurant_orders','restaurant_orders_delete_guard'),
    ('prescriptions','prescriptions_delete_guard'),
    ('restaurant_orders','restaurant_orders_status_transition'),
    ('prescriptions','prescriptions_status_transition')
  ) AS expected(table_name, trigger_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = to_regclass('public.' || expected.table_name)
      AND tgname = expected.trigger_name
      AND NOT tgisinternal
  );
  IF missing_count <> 0 THEN RAISE EXCEPTION 'industry workflow trigger set is incomplete: % missing', missing_count; END IF;
END $$;
INSERT INTO auth.users(id,email) VALUES
 ('10000000-0000-0000-0000-000000000001','retail@test.local'),
 ('10000000-0000-0000-0000-000000000002','grocery@test.local'),
 ('10000000-0000-0000-0000-000000000003','restaurant@test.local'),
 ('10000000-0000-0000-0000-000000000004','pharmacy@test.local');

SET ROLE authenticated;
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
SELECT public.complete_shop_onboarding('Retail Test','retail','PKR');
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000002';
SELECT public.complete_shop_onboarding('Grocery Test','grocery','PKR');
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000003';
SELECT public.complete_shop_onboarding('Restaurant Test','restaurant','PKR');
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000004';
SELECT public.complete_shop_onboarding('Pharmacy Test','pharmacy','PKR');

RESET ROLE;
DO $$
DECLARE required_count integer;
BEGIN
  SELECT count(*) INTO required_count FROM public.shops WHERE owner_id IN ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000004');
  IF required_count <> 4 THEN RAISE EXCEPTION 'onboarding created %, expected four shops', required_count; END IF;
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('10000000-0000-0000-0000-000000000001'::uuid,'retail'),
      ('10000000-0000-0000-0000-000000000002'::uuid,'grocery'),
      ('10000000-0000-0000-0000-000000000003'::uuid,'restaurant'),
      ('10000000-0000-0000-0000-000000000004'::uuid,'pharmacy')
    ) AS expected(owner_id, shop_type)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.shops s
      JOIN public.shop_members sm ON sm.shop_id=s.id
      WHERE s.owner_id=expected.owner_id
        AND s.shop_type=expected.shop_type
        AND sm.user_id=expected.owner_id
        AND sm.role='owner'
    )
  ) THEN RAISE EXCEPTION 'shop owner, membership, or shop type mapping is incorrect'; END IF;
  IF EXISTS (
    SELECT shop_type FROM public.shops
    WHERE owner_id IN ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000004')
    GROUP BY shop_type HAVING count(*) <> 1
  ) OR (SELECT count(DISTINCT shop_type) FROM public.shops WHERE owner_id IN ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000004')) <> 4 THEN
    RAISE EXCEPTION 'shop type counts are not exactly one per industry';
  END IF;
END $$;
SET ROLE authenticated;

-- Presets: each shop receives its complete operational set with no cross-industry leakage.
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
DO $$ DECLARE s uuid; BEGIN s:=public.get_user_shop_id();
  IF (SELECT count(*) FROM public.shop_modules WHERE shop_id=s AND enabled) <> 11 OR EXISTS (SELECT 1 FROM public.shop_modules WHERE shop_id=s AND enabled AND NOT (module_key=ANY(ARRAY['dashboard','pos','products','categories','inventory','sales','purchases','suppliers','customers','expenses','reports']))) THEN RAISE EXCEPTION 'retail preset incomplete or leaked'; END IF;
END $$;
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000002';
DO $$ DECLARE s uuid; BEGIN s:=public.get_user_shop_id();
  IF (SELECT count(*) FROM public.shop_modules WHERE shop_id=s AND enabled) <> 13 OR EXISTS (SELECT 1 FROM public.shop_modules WHERE shop_id=s AND enabled AND NOT (module_key=ANY(ARRAY['dashboard','pos','products','categories','inventory','sales','purchases','suppliers','customers','expenses','reports','medicine_batches','medicine_expiry']))) THEN RAISE EXCEPTION 'grocery preset incomplete or leaked'; END IF;
END $$;
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000003';
DO $$ DECLARE s uuid; BEGIN s:=public.get_user_shop_id();
  IF (SELECT count(*) FROM public.shop_modules WHERE shop_id=s AND enabled) <> 9 OR EXISTS (SELECT 1 FROM public.shop_modules WHERE shop_id=s AND enabled AND NOT (module_key=ANY(ARRAY['dashboard','pos','sales','menu','restaurant_tables','restaurant_orders','customers','expenses','reports']))) THEN RAISE EXCEPTION 'restaurant preset incomplete or leaked'; END IF;
END $$;
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000004';
DO $$ DECLARE s uuid; BEGIN s:=public.get_user_shop_id();
  IF (SELECT count(*) FROM public.shop_modules WHERE shop_id=s AND enabled) <> 13 OR EXISTS (SELECT 1 FROM public.shop_modules WHERE shop_id=s AND enabled AND NOT (module_key=ANY(ARRAY['dashboard','pos','products','medicines','customers','categories','medicine_batches','medicine_expiry','prescriptions','suppliers','purchases','sales','reports']))) THEN RAISE EXCEPTION 'pharmacy preset incomplete or leaked'; END IF;
END $$;
-- Retail: duplicate onboarding resolves the existing shop, integer sale mutates stock, and receipt row remains visible.
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
DO $$
DECLARE shop_id uuid; duplicate_shop uuid; sale_id uuid; stock numeric;
BEGIN
  shop_id := public.get_user_shop_id();
  duplicate_shop := public.complete_shop_onboarding('Duplicate Retail','retail','PKR');
  IF duplicate_shop <> shop_id THEN RAISE EXCEPTION 'duplicate shop protection failed'; END IF;
  INSERT INTO public.products(id,shop_id,name,unit,purchase_price,selling_price,quantity,min_stock,unit_type,allows_decimal_quantity,is_active)
    VALUES('20000000-0000-0000-0000-000000000001',shop_id,'Retail Piece','Piece',5,10,10,1,'piece',false,true);
  sale_id := public.process_sale(NULL::uuid,'Walk-in','[{"product_id":"20000000-0000-0000-0000-000000000001","name":"Retail Piece","quantity":2,"unit_price":10}]'::jsonb,20,0,0,0,20,20,'cash',false);
  SELECT quantity INTO stock FROM public.products WHERE id='20000000-0000-0000-0000-000000000001';
  IF stock <> 8 OR NOT EXISTS(SELECT 1 FROM public.sales WHERE id=sale_id) THEN RAISE EXCEPTION 'retail sale or receipt access failed'; END IF;
END $$;

-- Grocery: barcode, weighted decimal, piece integer enforcement, atomic batch delta/archive, and expired stock rejection.
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000002';
DO $$
DECLARE shop_id uuid; batch_id uuid; expired_batch uuid; sale_id uuid; product_stock numeric; batch_stock numeric;
BEGIN
  shop_id := public.get_user_shop_id();
  INSERT INTO public.products(id,shop_id,name,barcode,unit,purchase_price,selling_price,quantity,min_stock,unit_type,allows_decimal_quantity,is_active)
  VALUES
   ('20000000-0000-0000-0000-000000000002',shop_id,'Weighted Rice','GR-WEIGHT','Kg',2,4,0,1,'kg',true,true),
   ('20000000-0000-0000-0000-000000000003',shop_id,'Piece Tin','GR-PIECE','Piece',2,5,0,1,'piece',false,true),
   ('20000000-0000-0000-0000-000000000004',shop_id,'Expired Milk','GR-EXPIRED','Liter',2,5,0,1,'liter',true,true);
  IF NOT EXISTS(SELECT 1 FROM public.products WHERE barcode='GR-WEIGHT') THEN RAISE EXCEPTION 'barcode lookup failed'; END IF;
  batch_id := public.manage_inventory_batch('grocery','create',NULL,'20000000-0000-0000-0000-000000000002','GR-B1',NULL,CURRENT_DATE+30,10,NULL,0,0);
  PERFORM public.manage_inventory_batch('grocery','update',batch_id,NULL,'GR-B1',NULL,CURRENT_DATE+45,12,NULL,0,0);
  sale_id := public.process_sale(NULL::uuid,'Walk-in','[{"product_id":"20000000-0000-0000-0000-000000000002","name":"Weighted Rice","quantity":1.5,"unit_price":4}]'::jsonb,6,0,0,0,6,6,'cash',false);
  SELECT quantity INTO product_stock FROM public.products WHERE id='20000000-0000-0000-0000-000000000002';
  SELECT quantity INTO batch_stock FROM public.product_batches WHERE id=batch_id;
  IF product_stock <> 10.5 OR batch_stock <> 10.5 THEN RAISE EXCEPTION 'grocery stock reconciliation failed product=% batch=%',product_stock,batch_stock; END IF;
  PERFORM public.manage_inventory_batch('grocery','create',NULL,'20000000-0000-0000-0000-000000000003','GR-P1',NULL,CURRENT_DATE+30,5,NULL,0,0);
  BEGIN
    PERFORM public.process_sale(NULL::uuid,'Walk-in','[{"product_id":"20000000-0000-0000-0000-000000000003","name":"Piece Tin","quantity":0.5,"unit_price":5}]'::jsonb,2.5,0,0,0,2.5,2.5,'cash',false);
    RAISE EXCEPTION 'fractional piece sale was accepted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='fractional piece sale was accepted' THEN RAISE; END IF; END;
  expired_batch := public.manage_inventory_batch('grocery','create',NULL,'20000000-0000-0000-0000-000000000004','GR-E1',NULL,CURRENT_DATE-1,2,NULL,0,0);
  BEGIN
    PERFORM public.process_sale(NULL::uuid,'Walk-in','[{"product_id":"20000000-0000-0000-0000-000000000004","name":"Expired Milk","quantity":1,"unit_price":5}]'::jsonb,5,0,0,0,5,5,'cash',false);
    RAISE EXCEPTION 'expired grocery stock was sold';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='expired grocery stock was sold' THEN RAISE; END IF; END;
  PERFORM public.manage_inventory_batch('grocery','archive',batch_id,NULL,NULL,NULL,NULL,NULL,NULL,0,0);
  SELECT quantity INTO product_stock FROM public.products WHERE id='20000000-0000-0000-0000-000000000002';
  IF product_stock <> 0 THEN RAISE EXCEPTION 'batch archive did not reconcile remaining stock'; END IF;
END $$;

-- Restaurant: menu/table/order/direct payment/sale/receipt/table release.
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000003';
DO $$
DECLARE shop_id uuid; order_id uuid; sale_id uuid; table_status text; stock numeric;
BEGIN
  shop_id := public.get_user_shop_id();
  INSERT INTO public.products(id,shop_id,name,unit,purchase_price,selling_price,quantity,min_stock,unit_type,allows_decimal_quantity,is_active)
    VALUES('20000000-0000-0000-0000-000000000005',shop_id,'Burger','Plate',3,8,10,1,'piece',false,true);
  INSERT INTO public.restaurant_tables(id,shop_id,name_or_number,capacity,status)
    VALUES('30000000-0000-0000-0000-000000000001',shop_id,'T1',4,'available');
  order_id := public.create_restaurant_order('dine_in','30000000-0000-0000-0000-000000000001',2,'No onions');
  INSERT INTO public.restaurant_order_items(shop_id,order_id,product_id,quantity,unit_price,notes)
    VALUES(shop_id,order_id,'20000000-0000-0000-0000-000000000005',2,8,'Well done');
  sale_id := public.complete_restaurant_order(order_id,'cash');
  SELECT status INTO table_status FROM public.restaurant_tables WHERE id='30000000-0000-0000-0000-000000000001';
  SELECT quantity INTO stock FROM public.products WHERE id='20000000-0000-0000-0000-000000000005';
  IF table_status <> 'available' OR stock <> 8 OR NOT EXISTS(SELECT 1 FROM public.sales WHERE id=sale_id) THEN RAISE EXCEPTION 'restaurant completion failed'; END IF;
END $$;

-- Pharmacy: medicine/batch/prescription/dispense, FEFO stock, expired rejection and receipt.
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000004';
DO $$
DECLARE shop_id uuid; customer_id uuid; prescription_id uuid; sale_id uuid; stock numeric; valid_batch numeric; expired_batch numeric;
BEGIN
  shop_id := public.get_user_shop_id();
  INSERT INTO public.customers(id,shop_id,name) VALUES('40000000-0000-0000-0000-000000000001',shop_id,'Patient One') RETURNING id INTO customer_id;
  INSERT INTO public.products(id,shop_id,name,barcode,unit,purchase_price,selling_price,quantity,min_stock,unit_type,allows_decimal_quantity,is_active)
  VALUES
   ('20000000-0000-0000-0000-000000000006',shop_id,'Medicine A','PH-MED-A','Piece',2,6,0,1,'piece',false,true),
   ('20000000-0000-0000-0000-000000000007',shop_id,'Expired Medicine','PH-EXPIRED','Piece',2,6,0,1,'piece',false,true);
  PERFORM public.manage_inventory_batch('pharmacy','create',NULL,'20000000-0000-0000-0000-000000000006','PH-OLD',CURRENT_DATE-100,CURRENT_DATE-1,2,NULL,2,6);
  PERFORM public.process_purchase(NULL::uuid,NULL::uuid,'[{"product_id":"20000000-0000-0000-0000-000000000006","quantity":5,"unit_price":2,"total_price":10,"batch_number":"PH-VALID","expiry_date":"2099-12-31"}]'::jsonb,10,0,10,10,'Pharmacy batch purchase',NULL,true);
  IF EXISTS(SELECT 1 FROM public.product_batches WHERE product_id='20000000-0000-0000-0000-000000000006') THEN RAISE EXCEPTION 'pharmacy purchase created duplicate generic batch'; END IF;
  PERFORM public.manage_inventory_batch('pharmacy','create',NULL,'20000000-0000-0000-0000-000000000007','PH-EXP',CURRENT_DATE-100,CURRENT_DATE-1,2,NULL,2,6);
  INSERT INTO public.prescriptions(id,shop_id,customer_id,prescription_number,doctor_name,status)
    VALUES('50000000-0000-0000-0000-000000000001',shop_id,customer_id,'RX-1','Dr Test','pending') RETURNING id INTO prescription_id;
  INSERT INTO public.prescription_items(shop_id,prescription_id,product_id,quantity,notes)
    VALUES(shop_id,prescription_id,'20000000-0000-0000-0000-000000000006',3,'Daily');
  UPDATE public.prescriptions SET status='ready' WHERE id=prescription_id;
  sale_id := public.dispense_prescription(prescription_id,'cash');
  SELECT quantity INTO stock FROM public.products WHERE id='20000000-0000-0000-0000-000000000006';
  SELECT quantity INTO valid_batch FROM public.medicine_batches WHERE product_id='20000000-0000-0000-0000-000000000006' AND batch_number='PH-VALID';
  SELECT quantity INTO expired_batch FROM public.medicine_batches WHERE product_id='20000000-0000-0000-0000-000000000006' AND batch_number='PH-OLD';
  IF stock <> 4 OR valid_batch <> 2 OR expired_batch <> 2 OR NOT EXISTS(SELECT 1 FROM public.sales WHERE id=sale_id) THEN RAISE EXCEPTION 'pharmacy dispensing reconciliation failed'; END IF;
  BEGIN
    PERFORM public.process_sale(NULL::uuid,'Walk-in','[{"product_id":"20000000-0000-0000-0000-000000000007","name":"Expired Medicine","quantity":1,"unit_price":6}]'::jsonb,6,0,0,0,6,6,'cash',false);
    RAISE EXCEPTION 'expired medicine was sold';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='expired medicine was sold' THEN RAISE; END IF; END;
END $$;

-- Restaurant lifecycle maintenance: edit/archive, item removal, and takeaway payment.
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000003';
DO $$
DECLARE s uuid := public.get_user_shop_id(); takeaway uuid; extra_item uuid; extra_table uuid;
BEGIN
  UPDATE public.products SET name='Burger Updated' WHERE id='20000000-0000-0000-0000-000000000005' AND shop_id=s;
  INSERT INTO public.restaurant_tables(shop_id,name_or_number,capacity,status)
    VALUES(s,'T2',2,'available') RETURNING id INTO extra_table;
  UPDATE public.restaurant_tables SET name_or_number='T2 Updated',capacity=3 WHERE id=extra_table AND shop_id=s;
  takeaway:=public.create_restaurant_order('takeaway',NULL,NULL,'Pickup');
  INSERT INTO public.restaurant_order_items(shop_id,order_id,product_id,quantity,unit_price)
    VALUES(s,takeaway,'20000000-0000-0000-0000-000000000005',1,8) RETURNING id INTO extra_item;
  DELETE FROM public.restaurant_order_items WHERE id=extra_item AND shop_id=s;
  IF EXISTS(SELECT 1 FROM public.restaurant_order_items WHERE id=extra_item) THEN RAISE EXCEPTION 'restaurant order item removal failed'; END IF;
  INSERT INTO public.restaurant_order_items(shop_id,order_id,product_id,quantity,unit_price)
    VALUES(s,takeaway,'20000000-0000-0000-0000-000000000005',1,8);
  PERFORM public.complete_restaurant_order(takeaway,'cash');
  UPDATE public.restaurant_tables SET status='inactive' WHERE id=extra_table AND shop_id=s;
  UPDATE public.products SET is_active=false WHERE id='20000000-0000-0000-0000-000000000005' AND shop_id=s;
  IF NOT EXISTS(SELECT 1 FROM public.restaurant_orders WHERE id=takeaway AND order_type='takeaway' AND status='completed')
     OR NOT EXISTS(SELECT 1 FROM public.restaurant_tables WHERE id=extra_table AND name_or_number='T2 Updated' AND status='inactive')
     OR NOT EXISTS(SELECT 1 FROM public.products WHERE id='20000000-0000-0000-0000-000000000005' AND name='Burger Updated' AND NOT is_active)
  THEN RAISE EXCEPTION 'restaurant maintenance lifecycle failed'; END IF;
END $$;

-- Pharmacy lifecycle maintenance: medicine/batch edit/archive and prescription edit/remove/cancel/reopen.
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000004';
DO $$
DECLARE s uuid := public.get_user_shop_id(); temp_product uuid := '20000000-0000-0000-0000-000000000008';
  temp_batch uuid; rx_reopen uuid; rx_cancel uuid; item_id uuid;
BEGIN
  UPDATE public.products SET name='Medicine A Updated' WHERE id='20000000-0000-0000-0000-000000000006' AND shop_id=s;
  INSERT INTO public.products(id,shop_id,name,unit,purchase_price,selling_price,quantity,min_stock,track_batches,unit_type,allows_decimal_quantity,is_active)
    VALUES(temp_product,s,'Temporary Medicine','Piece',1,3,0,1,true,'piece',false,true);
  temp_batch:=public.manage_inventory_batch('pharmacy','create',NULL,temp_product,'PH-TEMP',CURRENT_DATE,CURRENT_DATE+90,3,NULL,1,3);
  PERFORM public.manage_inventory_batch('pharmacy','update',temp_batch,NULL,'PH-TEMP-EDIT',CURRENT_DATE,CURRENT_DATE+120,4,NULL,1,3);
  PERFORM public.manage_inventory_batch('pharmacy','archive',temp_batch,NULL,NULL,NULL,NULL,NULL,NULL,0,0);
  UPDATE public.products SET is_active=false WHERE id=temp_product AND shop_id=s;

  INSERT INTO public.prescriptions(shop_id,prescription_number,doctor_name,notes,status)
    VALUES(s,'RX-REOPEN','Dr Initial','Initial','pending') RETURNING id INTO rx_reopen;
  UPDATE public.prescriptions SET doctor_name='Dr Updated',notes='Updated' WHERE id=rx_reopen AND shop_id=s;
  INSERT INTO public.prescription_items(shop_id,prescription_id,product_id,quantity)
    VALUES(s,rx_reopen,'20000000-0000-0000-0000-000000000006',1) RETURNING id INTO item_id;
  DELETE FROM public.prescription_items WHERE id=item_id AND shop_id=s;
  UPDATE public.prescriptions SET status='ready' WHERE id=rx_reopen AND shop_id=s;
  UPDATE public.prescriptions SET status='pending' WHERE id=rx_reopen AND shop_id=s;

  INSERT INTO public.prescriptions(shop_id,prescription_number,status)
    VALUES(s,'RX-CANCEL','pending') RETURNING id INTO rx_cancel;
  UPDATE public.prescriptions SET status='cancelled' WHERE id=rx_cancel AND shop_id=s;

  IF NOT EXISTS(SELECT 1 FROM public.products WHERE id=temp_product AND NOT is_active AND quantity=0)
     OR NOT EXISTS(SELECT 1 FROM public.medicine_batches WHERE id=temp_batch AND NOT is_active AND quantity=0)
     OR NOT EXISTS(SELECT 1 FROM public.prescriptions WHERE id=rx_reopen AND doctor_name='Dr Updated' AND notes='Updated' AND status='pending')
     OR EXISTS(SELECT 1 FROM public.prescription_items WHERE id=item_id)
     OR NOT EXISTS(SELECT 1 FROM public.prescriptions WHERE id=rx_cancel AND status='cancelled')
  THEN RAISE EXCEPTION 'pharmacy maintenance lifecycle failed'; END IF;
END $$;
-- Cross-shop isolation and repeated login/shop resolution.
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
DO $$
BEGIN
  IF public.get_user_shop_id() IS NULL OR EXISTS(SELECT 1 FROM public.products WHERE id='20000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'cross-shop isolation or shop resolution failed'; END IF;
  IF has_table_privilege('authenticated','public.sale_items','INSERT') OR has_table_privilege('authenticated','public.product_batches','UPDATE') THEN RAISE EXCEPTION 'transaction table mutation grant remains'; END IF;
  BEGIN
    PERFORM public.manage_inventory_batch('grocery','create',NULL,'20000000-0000-0000-0000-000000000002','CROSS',NULL,CURRENT_DATE+1,1,NULL,0,0);
    RAISE EXCEPTION 'cross-shop batch mutation was accepted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='cross-shop batch mutation was accepted' THEN RAISE; END IF; END;
END $$;

RESET ROLE;
