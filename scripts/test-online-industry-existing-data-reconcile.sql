\set ON_ERROR_STOP on

DO $$
DECLARE s uuid;
BEGIN
  SELECT id INTO s FROM public.shops WHERE owner_id='90000000-0000-0000-0000-000000000002';
  INSERT INTO public.medicine_batches(shop_id,product_id,batch_number,expiry_date,quantity,purchase_price,selling_price)
  VALUES(s,'90000000-0000-0000-0000-000000000104','LEGACY-PH-VALID',CURRENT_DATE+365,5,1,3);
  UPDATE public.medicine_batches
  SET expiry_date=CURRENT_DATE+365
  WHERE shop_id=s AND product_id='90000000-0000-0000-0000-000000000105' AND batch_number='LEGACY-PH-NULL';
END $$;