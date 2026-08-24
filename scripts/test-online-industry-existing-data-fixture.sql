\set ON_ERROR_STOP on

INSERT INTO auth.users(id,email) VALUES
 ('90000000-0000-0000-0000-000000000001','legacy-grocery@test.local'),
 ('90000000-0000-0000-0000-000000000002','legacy-pharmacy@test.local'),
 ('90000000-0000-0000-0000-000000000003','legacy-food@test.local');

INSERT INTO public.shops(
  id, owner_id, name, business_type, shop_type, currency, status
) VALUES (
  '90000000-0000-0000-0000-000000000010',
  '90000000-0000-0000-0000-000000000003',
  'Legacy Food Shop', 'food', 'retail', 'PKR', 'active'
);
SET ROLE authenticated;
SET request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
SELECT public.complete_shop_onboarding('Legacy Grocery','grocery','PKR');
DO $$
DECLARE s uuid := public.get_user_shop_id();
BEGIN
  INSERT INTO public.products(id,shop_id,name,unit,purchase_price,selling_price,quantity,min_stock,track_batches,unit_type,allows_decimal_quantity)
  VALUES
   ('90000000-0000-0000-0000-000000000101',s,'Legacy Grocery Allocation','Kg',1,2,10,1,false,'kg',true),
   ('90000000-0000-0000-0000-000000000102',s,'Legacy Grocery Tracked','Kg',1,2,10,1,true,'kg',true),
   ('90000000-0000-0000-0000-000000000103',s,'Legacy Grocery Ambiguous','Kg',1,2,10,1,false,'kg',true);
  INSERT INTO public.product_batches(shop_id,product_id,batch_number,expiry_date,quantity)
  VALUES(s,'90000000-0000-0000-0000-000000000102','LEGACY-GR-B1',CURRENT_DATE+30,10);
END $$;

SET request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
SELECT public.complete_shop_onboarding('Legacy Pharmacy','pharmacy','PKR');
DO $$
DECLARE s uuid := public.get_user_shop_id();
BEGIN
  INSERT INTO public.products(id,shop_id,name,unit,purchase_price,selling_price,quantity,min_stock,track_batches,unit_type,allows_decimal_quantity)
  VALUES
   ('90000000-0000-0000-0000-000000000104',s,'Legacy Unbatched Medicine','Piece',1,3,5,1,true,'piece',false),
   ('90000000-0000-0000-0000-000000000105',s,'Legacy Null Expiry Medicine','Piece',1,3,2,1,true,'piece',false);
  INSERT INTO public.medicine_batches(shop_id,product_id,batch_number,expiry_date,quantity,purchase_price,selling_price)
  VALUES(s,'90000000-0000-0000-0000-000000000105','LEGACY-PH-NULL',NULL,2,1,3);
END $$;
RESET ROLE;