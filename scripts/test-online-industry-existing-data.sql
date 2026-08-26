\set ON_ERROR_STOP on

SET ROLE authenticated;
SET request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
DO $$
DECLARE allocated uuid; received uuid; product_stock numeric; batch_stock numeric;
BEGIN
  allocated := public.manage_inventory_batch('grocery','allocate',NULL,'90000000-0000-0000-0000-000000000101','LEGACY-GR-ALLOC',NULL,CURRENT_DATE+30,10,NULL,0,0);
  SELECT quantity INTO product_stock FROM public.products WHERE id='90000000-0000-0000-0000-000000000101';
  SELECT quantity INTO batch_stock FROM public.product_batches WHERE id=allocated;
  IF product_stock <> 10 OR batch_stock <> 10 THEN RAISE EXCEPTION 'existing Grocery allocation double-counted stock'; END IF;

  received := public.manage_inventory_batch('grocery','create',NULL,'90000000-0000-0000-0000-000000000102','LEGACY-GR-B2',NULL,CURRENT_DATE+60,5,NULL,0,0);
  SELECT quantity INTO product_stock FROM public.products WHERE id='90000000-0000-0000-0000-000000000102';
  SELECT sum(quantity) INTO batch_stock FROM public.product_batches WHERE product_id='90000000-0000-0000-0000-000000000102' AND is_active;
  IF product_stock <> 15 OR batch_stock <> 15 THEN RAISE EXCEPTION 'new Grocery receipt did not add exactly five'; END IF;

  BEGIN
    PERFORM public.manage_inventory_batch('grocery','create',NULL,'90000000-0000-0000-0000-000000000103','LEGACY-GR-BAD',NULL,CURRENT_DATE+30,5,NULL,0,0);
    RAISE EXCEPTION 'ambiguous Grocery receipt was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='ambiguous Grocery receipt was accepted' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.manage_inventory_batch('grocery','allocate',NULL,'90000000-0000-0000-0000-000000000103','LEGACY-GR-BAD',NULL,CURRENT_DATE+30,5,NULL,0,0);
    RAISE EXCEPTION 'partial Grocery allocation was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='partial Grocery allocation was accepted' THEN RAISE; END IF;
  END;
END $$;

SET request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
DO $$
DECLARE s uuid := public.get_user_shop_id(); null_product uuid := '90000000-0000-0000-0000-000000000106';
BEGIN
  INSERT INTO public.products(id,shop_id,name,unit,purchase_price,selling_price,quantity,min_stock,track_batches,unit_type,allows_decimal_quantity,is_active)
  VALUES(null_product,s,'Null Expiry Rejection','Piece',1,3,0,1,true,'piece',false,true);
  BEGIN
    PERFORM public.manage_inventory_batch('pharmacy','create',NULL,null_product,'PH-NULL',CURRENT_DATE,NULL,1,NULL,1,3);
    RAISE EXCEPTION 'NULL-expiry Pharmacy batch was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='NULL-expiry Pharmacy batch was accepted' THEN RAISE; END IF;
  END;
  IF EXISTS(
    SELECT 1 FROM public.products p JOIN public.shops sh ON sh.id=p.shop_id AND sh.shop_type='pharmacy'
    WHERE p.quantity IS DISTINCT FROM (
      SELECT COALESCE(sum(b.quantity),0) FROM public.medicine_batches b
      WHERE b.shop_id=p.shop_id AND b.product_id=p.id AND b.is_active
    )
  ) THEN RAISE EXCEPTION 'legacy Pharmacy reconciliation invariant failed'; END IF;
END $$;
RESET ROLE;
DO $$
DECLARE
  legacy_shop uuid := '90000000-0000-0000-0000-000000000010';
  expected_modules text[] := ARRAY[
    'dashboard','pos','sales','menu','restaurant_tables',
    'restaurant_orders','customers','expenses','reports'
  ];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.shops
    WHERE id = legacy_shop
      AND owner_id = '90000000-0000-0000-0000-000000000003'
      AND business_type = 'food'
      AND shop_type = 'restaurant'
  ) THEN
    RAISE EXCEPTION 'legacy food shop was not reconciled to restaurant';
  END IF;

  IF (SELECT count(*) FROM public.shop_members
      WHERE shop_id = legacy_shop
        AND user_id = '90000000-0000-0000-0000-000000000003'
        AND role = 'owner') <> 1 THEN
    RAISE EXCEPTION 'legacy food shop owner membership is not unique';
  END IF;

  IF (SELECT count(*) FROM public.shop_modules WHERE shop_id = legacy_shop AND enabled) <> cardinality(expected_modules)
     OR EXISTS (
       SELECT 1 FROM public.shop_modules
       WHERE shop_id = legacy_shop AND enabled
         AND NOT (module_key = ANY(expected_modules))
     ) THEN
    RAISE EXCEPTION 'legacy food shop module preset was not reconciled';
  END IF;
END $$;
