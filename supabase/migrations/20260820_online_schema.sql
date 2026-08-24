


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."get_user_shop_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE
  v_shop_id UUID;
BEGIN
  -- Check if user is an owner
  SELECT id INTO v_shop_id FROM public.shops WHERE owner_id = auth.uid() LIMIT 1;

  -- If not an owner, check if they are a staff member
  IF v_shop_id IS NULL THEN
    SELECT shop_id INTO v_shop_id FROM public.shop_members WHERE user_id = auth.uid() LIMIT 1;
  END IF;

  RETURN v_shop_id;
END;
 $$;


ALTER FUNCTION "public"."get_user_shop_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_shop"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN
  INSERT INTO public.shop_members (shop_id, user_id, role)
  VALUES (new.id, new.owner_id, 'owner');
  RETURN new;
END;
 $$;


ALTER FUNCTION "public"."handle_new_shop"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
 $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_purchase"("p_supplier_id" "uuid", "p_cart" "jsonb", "p_total_amount" numeric, "p_notes" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE
    v_purchase_id UUID;
    v_shop_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    -- 1. Get the shop_id for the current user
    SELECT id INTO v_shop_id FROM public.shops WHERE owner_id = v_user_id LIMIT 1;
    IF v_shop_id IS NULL THEN
        RAISE EXCEPTION 'User does not own a shop';
    END IF;

    -- 2. Insert into Purchases table
    INSERT INTO public.purchases (shop_id, user_id, supplier_id, total_amount, notes)
    VALUES (v_shop_id, v_user_id, p_supplier_id, p_total_amount, p_notes)
    RETURNING id INTO v_purchase_id;

    -- 3. Insert Purchase Items
    INSERT INTO public.purchase_items (purchase_id, shop_id, product_id, quantity, unit_price, total_price)
    SELECT
        v_purchase_id,
        v_shop_id,
        (item->>'product_id')::UUID,
        (item->>'quantity')::NUMERIC,
        (item->>'unit_price')::NUMERIC,
        (item->>'total_price')::NUMERIC
    FROM jsonb_array_elements(p_cart) AS item;

    -- 4. INCREASE Inventory (Automatic stock addition!)
    UPDATE public.products
    SET quantity = products.quantity + (cart_item->>'quantity')::NUMERIC
    FROM jsonb_array_elements(p_cart) AS cart_item
    WHERE products.id = (cart_item->>'product_id')::UUID
      AND products.shop_id = v_shop_id;

    RETURN v_purchase_id;
END;
 $$;


ALTER FUNCTION "public"."process_purchase"("p_supplier_id" "uuid", "p_cart" "jsonb", "p_total_amount" numeric, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_purchase"("p_supplier_id" "uuid", "p_location_id" "uuid", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_total_amount" numeric, "p_paid_amount" numeric, "p_notes" "text", "p_invoice_url" "text", "p_track_batches" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE
    v_purchase_id UUID;
    v_shop_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_existing_batch_id UUID;
BEGIN
    -- Securely get shop_id from the authenticated session
    v_shop_id := public.get_user_shop_id();
    IF v_shop_id IS NULL THEN
        RAISE EXCEPTION 'User does not belong to any shop';
    END IF;

    INSERT INTO public.purchases (shop_id, user_id, supplier_id, location_id, total_amount, discount, paid_amount, notes, invoice_url)
    VALUES (v_shop_id, auth.uid(), p_supplier_id, p_location_id, p_total_amount, p_discount, p_paid_amount, p_notes, p_invoice_url)
    RETURNING id INTO v_purchase_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;

        INSERT INTO public.purchase_items (
            purchase_id, shop_id, product_id, quantity, unit_price, total_price, batch_number, expiry_date, location_id
        )
        VALUES (
            v_purchase_id, v_shop_id, v_product_id,
            (v_item->>'quantity')::NUMERIC,
            (v_item->>'unit_price')::NUMERIC,
            (v_item->>'total_price')::NUMERIC,
            v_item->>'batch_number',
            NULLIF(v_item->>'expiry_date', '')::DATE,
            p_location_id
        );

        UPDATE public.products
        SET quantity = products.quantity + (v_item->>'quantity')::NUMERIC,
            purchase_price = (v_item->>'unit_price')::NUMERIC
        WHERE products.id = v_product_id AND products.shop_id = v_shop_id;

        IF p_track_batches THEN
            SELECT id INTO v_existing_batch_id
            FROM public.product_batches
            WHERE product_id = v_product_id
              AND shop_id = v_shop_id
              AND (batch_number = v_item->>'batch_number' OR (batch_number IS NULL AND v_item->>'batch_number' IS NULL))
            LIMIT 1;

            IF v_existing_batch_id IS NOT NULL THEN
                UPDATE public.product_batches
                SET quantity = product_batches.quantity + (v_item->>'quantity')::NUMERIC,
                    expiry_date = NULLIF(v_item->>'expiry_date', '')::DATE
                WHERE id = v_existing_batch_id;
            ELSE
                INSERT INTO public.product_batches (shop_id, product_id, location_id, batch_number, expiry_date, quantity)
                VALUES (v_shop_id, v_product_id, p_location_id, v_item->>'batch_number', NULLIF(v_item->>'expiry_date', '')::DATE, (v_item->>'quantity')::NUMERIC);
            END IF;
        END IF;

    END LOOP;

    RETURN v_purchase_id;
END;
 $$;


ALTER FUNCTION "public"."process_purchase"("p_supplier_id" "uuid", "p_location_id" "uuid", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_total_amount" numeric, "p_paid_amount" numeric, "p_notes" "text", "p_invoice_url" "text", "p_track_batches" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_return"("p_sale_id" "uuid", "p_cart" "jsonb", "p_total_refund" numeric) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE
    v_return_id UUID;
    v_shop_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    -- 1. Get the shop_id for the current user
    SELECT id INTO v_shop_id FROM public.shops WHERE owner_id = v_user_id LIMIT 1;
    IF v_shop_id IS NULL THEN
        RAISE EXCEPTION 'User does not own a shop';
    END IF;

    -- 2. Insert into Returns table
    INSERT INTO public.returns (shop_id, sale_id, user_id, total_refund)
    VALUES (v_shop_id, p_sale_id, v_user_id, p_total_refund)
    RETURNING id INTO v_return_id;

    -- 3. Insert Return Items
    INSERT INTO public.return_items (return_id, shop_id, product_id, quantity, unit_price, total_price)
    SELECT
        v_return_id,
        v_shop_id,
        (item->>'product_id')::UUID,
        (item->>'quantity')::NUMERIC,
        (item->>'unit_price')::NUMERIC,
        (item->>'total_price')::NUMERIC
    FROM jsonb_array_elements(p_cart) AS item;

    -- 4. ADD Inventory back (Automatic stock addition!)
    UPDATE public.products
    SET quantity = products.quantity + (cart_item->>'quantity')::NUMERIC
    FROM jsonb_array_elements(p_cart) AS cart_item
    WHERE products.id = (cart_item->>'product_id')::UUID
      AND products.shop_id = v_shop_id;

    -- 5. Update Sale Status to 'refunded' or 'partial_return'
    UPDATE public.sales
    SET status = 'refunded'
    WHERE id = p_sale_id AND shop_id = v_shop_id;

    RETURN v_return_id;
END;
 $$;


ALTER FUNCTION "public"."process_return"("p_sale_id" "uuid", "p_cart" "jsonb", "p_total_refund" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_sale"("p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_total_amount" numeric, "p_payment_method" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE
    v_sale_id UUID;
    v_shop_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    -- 1. Get the shop_id for the current user
    SELECT id INTO v_shop_id FROM public.shops WHERE owner_id = v_user_id LIMIT 1;
    IF v_shop_id IS NULL THEN
        RAISE EXCEPTION 'User does not own a shop';
    END IF;

    -- 2. Insert into Sales table
    INSERT INTO public.sales (shop_id, user_id, customer_name, subtotal, discount, tax, total_amount)
    VALUES (v_shop_id, v_user_id, p_customer_name, p_subtotal, p_discount, p_tax, p_total_amount)
    RETURNING id INTO v_sale_id;

    -- 3. Insert Sale Items
    INSERT INTO public.sale_items (sale_id, shop_id, product_id, product_name, quantity, unit_price, total_price)
    SELECT
        v_sale_id,
        v_shop_id,
        (item->>'product_id')::UUID,
        item->>'name',
        (item->>'quantity')::NUMERIC,
        (item->>'unit_price')::NUMERIC,
        (item->>'total_price')::NUMERIC
    FROM jsonb_array_elements(p_cart) AS item;

    -- 4. Deduct Inventory (Automatic stock deduction!)
    UPDATE public.products
    SET quantity = products.quantity - (cart_item->>'quantity')::NUMERIC
    FROM jsonb_array_elements(p_cart) AS cart_item
    WHERE products.id = (cart_item->>'product_id')::UUID
      AND products.shop_id = v_shop_id;

    -- 5. Insert Payment
    INSERT INTO public.payments (sale_id, shop_id, amount, method)
    VALUES (v_sale_id, v_shop_id, p_total_amount, p_payment_method);

    RETURN v_sale_id;
END;
 $$;


ALTER FUNCTION "public"."process_sale"("p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_total_amount" numeric, "p_payment_method" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_sale"("p_customer_id" "uuid", "p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_total_amount" numeric, "p_payment_method" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE
    v_sale_id UUID;
    v_shop_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    SELECT id INTO v_shop_id FROM public.shops WHERE owner_id = v_user_id LIMIT 1;
    IF v_shop_id IS NULL THEN
        RAISE EXCEPTION 'User does not own a shop';
    END IF;

    INSERT INTO public.sales (shop_id, user_id, customer_id, customer_name, subtotal, discount, tax, total_amount)
    VALUES (v_shop_id, v_user_id, p_customer_id, p_customer_name, p_subtotal, p_discount, p_tax, p_total_amount)
    RETURNING id INTO v_sale_id;

    INSERT INTO public.sale_items (sale_id, shop_id, product_id, product_name, quantity, unit_price, total_price)
    SELECT
        v_sale_id, v_shop_id,
        (item->>'product_id')::UUID,
        item->>'name',
        (item->>'quantity')::NUMERIC,
        (item->>'unit_price')::NUMERIC,
        (item->>'total_price')::NUMERIC
    FROM jsonb_array_elements(p_cart) AS item;

    UPDATE public.products
    SET quantity = products.quantity - (cart_item->>'quantity')::NUMERIC
    FROM jsonb_array_elements(p_cart) AS cart_item
    WHERE products.id = (cart_item->>'product_id')::UUID
      AND products.shop_id = v_shop_id;

    INSERT INTO public.payments (sale_id, shop_id, amount, method)
    VALUES (v_sale_id, v_shop_id, p_total_amount, p_payment_method);

    RETURN v_sale_id;
END;
 $$;


ALTER FUNCTION "public"."process_sale"("p_customer_id" "uuid", "p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_total_amount" numeric, "p_payment_method" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_sale"("p_customer_id" "uuid", "p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_delivery_charges" numeric, "p_total_amount" numeric, "p_payment_method" "text", "p_is_quotation" boolean DEFAULT false) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE
    v_sale_id UUID;
    v_shop_id UUID;
    v_user_id UUID := auth.uid();
    v_sale_status TEXT := 'completed';
BEGIN
    SELECT id INTO v_shop_id FROM public.shops WHERE owner_id = v_user_id LIMIT 1;
    IF v_shop_id IS NULL THEN
        RAISE EXCEPTION 'User does not own a shop';
    END IF;

    IF p_is_quotation THEN
        v_sale_status := 'quotation';
    END IF;

    -- Insert into Sales table (NOW SAVING delivery_charges)
    INSERT INTO public.sales (shop_id, user_id, customer_id, customer_name, subtotal, discount, tax, delivery_charges, total_amount, status)
    VALUES (v_shop_id, v_user_id, p_customer_id, p_customer_name, p_subtotal, p_discount, p_tax, p_delivery_charges, p_total_amount, v_sale_status)
    RETURNING id INTO v_sale_id;

    INSERT INTO public.sale_items (sale_id, shop_id, product_id, product_name, quantity, unit_price, total_price)
    SELECT
        v_sale_id, v_shop_id,
        (item->>'product_id')::UUID,
        item->>'name',
        (item->>'quantity')::NUMERIC,
        (item->>'unit_price')::NUMERIC,
        (item->>'total_price')::NUMERIC
    FROM jsonb_array_elements(p_cart) AS item;

    IF NOT p_is_quotation THEN
        UPDATE public.products
        SET quantity = products.quantity - (cart_item->>'quantity')::NUMERIC
        FROM jsonb_array_elements(p_cart) AS cart_item
        WHERE products.id = (cart_item->>'product_id')::UUID
          AND products.shop_id = v_shop_id;

        INSERT INTO public.payments (sale_id, shop_id, amount, method)
        VALUES (v_sale_id, v_shop_id, p_total_amount, p_payment_method);
    END IF;

    RETURN v_sale_id;
END;
 $$;


ALTER FUNCTION "public"."process_sale"("p_customer_id" "uuid", "p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_delivery_charges" numeric, "p_total_amount" numeric, "p_payment_method" "text", "p_is_quotation" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_sale"("p_customer_id" "uuid", "p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_delivery_charges" numeric, "p_total_amount" numeric, "p_received_amount" numeric, "p_payment_method" "text", "p_is_quotation" boolean DEFAULT false) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE
    v_sale_id UUID;
    v_shop_id UUID;
    v_sale_status TEXT := 'completed';
    v_due_amount NUMERIC := 0;
    v_item JSONB;
    v_qty NUMERIC;
    v_price NUMERIC;
    v_product_id UUID;
    v_user_role TEXT := 'owner';
    v_discount_percent NUMERIC := 0;
    v_current_stock NUMERIC;
BEGIN
    v_shop_id := public.get_user_shop_id();
    IF v_shop_id IS NULL THEN
        RAISE EXCEPTION 'User does not belong to any shop';
    END IF;

    SELECT role INTO v_user_role FROM public.shop_members WHERE user_id = auth.uid() AND shop_id = v_shop_id;
    IF v_user_role IS NULL THEN
        v_user_role := 'owner';
    END IF;

    IF p_subtotal < 0 OR p_total_amount < 0 OR p_received_amount < 0 THEN
        RAISE EXCEPTION 'Invalid financial value: Totals cannot be negative';
    END IF;

    IF p_subtotal > 0 THEN
        v_discount_percent := (p_discount / p_subtotal) * 100;
    END IF;

    IF v_user_role = 'cashier' AND v_discount_percent > 10 THEN
        RAISE EXCEPTION 'Unauthorized: Cashiers cannot apply more than 10%% discount';
    ELSIF v_user_role = 'manager' AND v_discount_percent > 30 THEN
        RAISE EXCEPTION 'Unauthorized: Managers cannot apply more than 30%% discount';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart)
    LOOP
        v_qty := (v_item->>'quantity')::NUMERIC;
        v_price := (v_item->>'unit_price')::NUMERIC;
        v_product_id := (v_item->>'product_id')::UUID;

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Invalid quantity: Must be greater than 0';
        END IF;
        IF v_price < 0 THEN
            RAISE EXCEPTION 'Invalid price: Cannot be negative';
        END IF;

        IF NOT p_is_quotation THEN
            SELECT quantity INTO v_current_stock
            FROM public.products
            WHERE id = v_product_id AND shop_id = v_shop_id
            FOR UPDATE;

            IF v_current_stock IS NULL THEN
                RAISE EXCEPTION 'Product not found or does not belong to your shop';
            END IF;

            IF v_current_stock < v_qty THEN
                RAISE EXCEPTION 'Insufficient stock for product. Available: %, Requested: %', v_current_stock, v_qty;
            END IF;

            UPDATE public.products
            SET quantity = v_current_stock - v_qty
            WHERE id = v_product_id;
        END IF;
    END LOOP;

    IF p_is_quotation THEN
        v_sale_status := 'quotation';
    END IF;

    -- Insert Sale (invoice_number auto-generates via DEFAULT sequence)
    INSERT INTO public.sales (shop_id, user_id, customer_id, customer_name, subtotal, discount, tax, delivery_charges, total_amount, status)
    VALUES (v_shop_id, auth.uid(), p_customer_id, p_customer_name, p_subtotal, p_discount, p_tax, p_delivery_charges, p_total_amount, v_sale_status)
    RETURNING id INTO v_sale_id;

    INSERT INTO public.sale_items (sale_id, shop_id, product_id, product_name, quantity, unit_price, total_price)
    SELECT
        v_sale_id, v_shop_id,
        (item->>'product_id')::UUID,
        item->>'name',
        (item->>'quantity')::NUMERIC,
        (item->>'unit_price')::NUMERIC,
        ((item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC)
    FROM jsonb_array_elements(p_cart) AS item;

    IF NOT p_is_quotation THEN
        INSERT INTO public.payments (sale_id, shop_id, amount, method)
        VALUES (v_sale_id, v_shop_id, p_received_amount, p_payment_method);

        IF p_customer_id IS NOT NULL THEN
            v_due_amount := p_total_amount - p_received_amount;
            IF v_due_amount > 0 THEN
                UPDATE public.customers
                SET balance = balance + v_due_amount
                WHERE id = p_customer_id;
            END IF;
        END IF;
    END IF;

    RETURN v_sale_id;
END;
 $$;


ALTER FUNCTION "public"."process_sale"("p_customer_id" "uuid", "p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_delivery_charges" numeric, "p_total_amount" numeric, "p_received_amount" numeric, "p_payment_method" "text", "p_is_quotation" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_shop_member"("check_shop_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN
  -- Check if user is the owner AND shop is active AND subscription is valid
  IF EXISTS (
    SELECT 1 FROM public.shops
    WHERE id = check_shop_id
      AND owner_id = auth.uid()
      AND status = 'active'
      AND (subscription_end IS NULL OR subscription_end >= CURRENT_DATE)
  ) THEN RETURN TRUE; END IF;

  -- Check if user is staff AND shop is active AND subscription is valid
  IF EXISTS (
    SELECT 1 FROM public.shop_members sm
    JOIN public.shops s ON s.id = sm.shop_id
    WHERE sm.shop_id = check_shop_id
      AND sm.user_id = auth.uid()
      AND s.status = 'active'
      AND (s.subscription_end IS NULL OR s.subscription_end >= CURRENT_DATE)
  ) THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
 $$;


ALTER FUNCTION "public"."user_is_shop_member"("check_shop_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "balance" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "provider_name" "text",
    "account_number" "text",
    CONSTRAINT "accounts_type_check" CHECK (("type" = ANY (ARRAY['cash'::"text", 'bank'::"text", 'wallet'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "old_value" "jsonb",
    "new_value" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "business_type" "text",
    "message" "text" NOT NULL
);


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "address" "text",
    "balance" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customers_balance_check" CHECK (("balance" >= (0)::numeric))
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text",
    "phone" "text",
    "salary" numeric(10,2) DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "expenses_amount_check" CHECK (("amount" >= (0)::numeric))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'shop'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "locations_type_check" CHECK (("type" = ANY (ARRAY['shop'::"text", 'warehouse'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_reset_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."password_reset_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "method" "text" DEFAULT 'cash'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payments_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "payments_method_check" CHECK (("method" = ANY (ARRAY['cash'::"text", 'card'::"text", 'bank_transfer'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "batch_number" "text",
    "expiry_date" "date",
    "quantity" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "name" "text" NOT NULL,
    "sku" "text",
    "barcode" "text",
    "unit" "text" DEFAULT 'Piece'::"text" NOT NULL,
    "purchase_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "selling_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "quantity" numeric(10,2) DEFAULT 0 NOT NULL,
    "min_stock" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "image_url" "text",
    "track_batches" boolean DEFAULT false NOT NULL,
    CONSTRAINT "products_min_stock_check" CHECK (("min_stock" >= (0)::numeric)),
    CONSTRAINT "products_purchase_price_check" CHECK (("purchase_price" >= (0)::numeric)),
    CONSTRAINT "products_quantity_check" CHECK (("quantity" >= (0)::numeric)),
    CONSTRAINT "products_selling_price_check" CHECK (("selling_price" >= (0)::numeric))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_platform_admin" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "purchase_id" "uuid" NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" numeric(10,2) NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "batch_number" "text",
    "expiry_date" "date",
    "location_id" "uuid",
    CONSTRAINT "purchase_items_price_check" CHECK (("unit_price" >= (0)::numeric)),
    CONSTRAINT "purchase_items_qty_check" CHECK (("quantity" >= (0)::numeric))
);


ALTER TABLE "public"."purchase_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "supplier_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "total_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "location_id" "uuid",
    "invoice_url" "text",
    "discount" numeric(10,2) DEFAULT 0 NOT NULL,
    "paid_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    CONSTRAINT "purchases_total_check" CHECK (("total_amount" >= (0)::numeric))
);


ALTER TABLE "public"."purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."return_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "return_id" "uuid" NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" numeric(10,2) NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."return_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."returns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "total_refund" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."returns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "product_name" "text" NOT NULL,
    "quantity" numeric(10,2) NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sale_items_price_check" CHECK (("unit_price" >= (0)::numeric)),
    CONSTRAINT "sale_items_qty_check" CHECK (("quantity" >= (0)::numeric))
);


ALTER TABLE "public"."sale_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sales_invoice_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sales_invoice_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "customer_name" "text",
    "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "discount" numeric(10,2) DEFAULT 0 NOT NULL,
    "tax" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "customer_id" "uuid",
    "delivery_charges" numeric(10,2) DEFAULT 0 NOT NULL,
    "invoice_number" integer DEFAULT "nextval"('"public"."sales_invoice_number_seq"'::"regclass"),
    CONSTRAINT "sales_status_check" CHECK (("status" = ANY (ARRAY['completed'::"text", 'refunded'::"text", 'partial_return'::"text", 'quotation'::"text"]))),
    CONSTRAINT "sales_total_check" CHECK (("total_amount" >= (0)::numeric))
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shop_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'owner'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "shop_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'cashier'::"text", 'inventory_manager'::"text"])))
);


ALTER TABLE "public"."shop_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shops" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "business_type" "text",
    "currency" "text" DEFAULT 'USD'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subtitle" "text",
    "address" "text",
    "invoice_note" "text" DEFAULT 'Thank you for your business!'::"text",
    "logo_url" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "phone" "text",
    "email" "text",
    "subscription_start" "date",
    "subscription_end" "date"
);


ALTER TABLE "public"."shops" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "company" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_shop_id_name_key" UNIQUE ("shop_id", "name");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_attempts"
    ADD CONSTRAINT "password_reset_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_batches"
    ADD CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_members"
    ADD CONSTRAINT "shop_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_members"
    ADD CONSTRAINT "shop_members_shop_id_user_id_key" UNIQUE ("shop_id", "user_id");



ALTER TABLE ONLY "public"."shops"
    ADD CONSTRAINT "shops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_products_barcode" ON "public"."products" USING "btree" ("barcode");



CREATE INDEX "idx_products_shop_id" ON "public"."products" USING "btree" ("shop_id");



CREATE INDEX "password_reset_attempts_email_created_idx" ON "public"."password_reset_attempts" USING "btree" ("email", "created_at" DESC);



CREATE OR REPLACE TRIGGER "on_shop_created" AFTER INSERT ON "public"."shops" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_shop"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_batches"
    ADD CONSTRAINT "product_batches_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_batches"
    ADD CONSTRAINT "product_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_batches"
    ADD CONSTRAINT "product_batches_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shop_members"
    ADD CONSTRAINT "shop_members_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shop_members"
    ADD CONSTRAINT "shop_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shops"
    ADD CONSTRAINT "shops_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can view contact messages" ON "public"."contact_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_platform_admin" = true)))));



CREATE POLICY "Authenticated users can create audit logs" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Members can create accounts" ON "public"."accounts" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can create batches" ON "public"."product_batches" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can create categories" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can create customers" ON "public"."customers" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can create employees" ON "public"."employees" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can create expenses" ON "public"."expenses" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can create locations" ON "public"."locations" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can create payments" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can create products" ON "public"."products" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can create purchase items" ON "public"."purchase_items" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can create purchases" ON "public"."purchases" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can create return items" ON "public"."return_items" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can create returns" ON "public"."returns" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can create sale items" ON "public"."sale_items" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can create sales" ON "public"."sales" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can create suppliers" ON "public"."suppliers" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can delete accounts" ON "public"."accounts" FOR DELETE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can delete categories" ON "public"."categories" FOR DELETE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can delete customers" ON "public"."customers" FOR DELETE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can delete employees" ON "public"."employees" FOR DELETE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can delete expenses" ON "public"."expenses" FOR DELETE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can delete locations" ON "public"."locations" FOR DELETE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can delete products" ON "public"."products" FOR DELETE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can delete suppliers" ON "public"."suppliers" FOR DELETE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can update accounts" ON "public"."accounts" FOR UPDATE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can update batches" ON "public"."product_batches" FOR UPDATE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can update categories" ON "public"."categories" FOR UPDATE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can update customers" ON "public"."customers" FOR UPDATE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can update employees" ON "public"."employees" FOR UPDATE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can update products" ON "public"."products" FOR UPDATE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can update sales" ON "public"."sales" FOR UPDATE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can update suppliers" ON "public"."suppliers" FOR UPDATE USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view accounts" ON "public"."accounts" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view batches" ON "public"."product_batches" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view categories" ON "public"."categories" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view customers" ON "public"."customers" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view employees" ON "public"."employees" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view expenses" ON "public"."expenses" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view locations" ON "public"."locations" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view payments" ON "public"."payments" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view products" ON "public"."products" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view purchase items" ON "public"."purchase_items" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view purchases" ON "public"."purchases" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view return items" ON "public"."return_items" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view returns" ON "public"."returns" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view sale items" ON "public"."sale_items" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view sales" ON "public"."sales" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Members can view suppliers" ON "public"."suppliers" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Only owners can delete shop" ON "public"."shops" FOR DELETE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Only owners can update shop" ON "public"."shops" FOR UPDATE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Owners can add staff" ON "public"."shop_members" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."shops"
  WHERE (("shops"."id" = "shop_members"."shop_id") AND ("shops"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Owners can delete staff" ON "public"."shop_members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."shops"
  WHERE (("shops"."id" = "shop_members"."shop_id") AND ("shops"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Owners can view audit logs" ON "public"."audit_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."shops"
  WHERE (("shops"."id" = "audit_logs"."shop_id") AND ("shops"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Owners can view staff profiles" ON "public"."profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."shop_members" "sm"
     JOIN "public"."shops" "s" ON (("s"."id" = "sm"."shop_id")))
  WHERE (("sm"."user_id" = "profiles"."id") AND ("s"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Owners can view their shop" ON "public"."shops" FOR SELECT USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can create shops" ON "public"."shops" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view members of their shops" ON "public"."shop_members" FOR SELECT USING ("public"."user_is_shop_member"("shop_id"));



CREATE POLICY "Users can view staff records" ON "public"."shop_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."shops"
  WHERE (("shops"."id" = "shop_members"."shop_id") AND ("shops"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their shops" ON "public"."shops" FOR SELECT USING ("public"."user_is_shop_member"("id"));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."password_reset_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."return_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."returns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shop_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_shop_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_shop_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_shop_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_shop"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_shop"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_shop"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_purchase"("p_supplier_id" "uuid", "p_cart" "jsonb", "p_total_amount" numeric, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_purchase"("p_supplier_id" "uuid", "p_cart" "jsonb", "p_total_amount" numeric, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_purchase"("p_supplier_id" "uuid", "p_cart" "jsonb", "p_total_amount" numeric, "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_purchase"("p_supplier_id" "uuid", "p_location_id" "uuid", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_total_amount" numeric, "p_paid_amount" numeric, "p_notes" "text", "p_invoice_url" "text", "p_track_batches" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."process_purchase"("p_supplier_id" "uuid", "p_location_id" "uuid", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_total_amount" numeric, "p_paid_amount" numeric, "p_notes" "text", "p_invoice_url" "text", "p_track_batches" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_purchase"("p_supplier_id" "uuid", "p_location_id" "uuid", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_total_amount" numeric, "p_paid_amount" numeric, "p_notes" "text", "p_invoice_url" "text", "p_track_batches" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."process_return"("p_sale_id" "uuid", "p_cart" "jsonb", "p_total_refund" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."process_return"("p_sale_id" "uuid", "p_cart" "jsonb", "p_total_refund" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_return"("p_sale_id" "uuid", "p_cart" "jsonb", "p_total_refund" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."process_sale"("p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_total_amount" numeric, "p_payment_method" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_sale"("p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_total_amount" numeric, "p_payment_method" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_sale"("p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_total_amount" numeric, "p_payment_method" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_sale"("p_customer_id" "uuid", "p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_total_amount" numeric, "p_payment_method" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_sale"("p_customer_id" "uuid", "p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_total_amount" numeric, "p_payment_method" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_sale"("p_customer_id" "uuid", "p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_total_amount" numeric, "p_payment_method" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_sale"("p_customer_id" "uuid", "p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_delivery_charges" numeric, "p_total_amount" numeric, "p_payment_method" "text", "p_is_quotation" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."process_sale"("p_customer_id" "uuid", "p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_delivery_charges" numeric, "p_total_amount" numeric, "p_payment_method" "text", "p_is_quotation" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_sale"("p_customer_id" "uuid", "p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_delivery_charges" numeric, "p_total_amount" numeric, "p_payment_method" "text", "p_is_quotation" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."process_sale"("p_customer_id" "uuid", "p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_delivery_charges" numeric, "p_total_amount" numeric, "p_received_amount" numeric, "p_payment_method" "text", "p_is_quotation" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."process_sale"("p_customer_id" "uuid", "p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_delivery_charges" numeric, "p_total_amount" numeric, "p_received_amount" numeric, "p_payment_method" "text", "p_is_quotation" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_sale"("p_customer_id" "uuid", "p_customer_name" "text", "p_cart" "jsonb", "p_subtotal" numeric, "p_discount" numeric, "p_tax" numeric, "p_delivery_charges" numeric, "p_total_amount" numeric, "p_received_amount" numeric, "p_payment_method" "text", "p_is_quotation" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_shop_member"("check_shop_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_shop_member"("check_shop_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_shop_member"("check_shop_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages" TO "anon";
GRANT ALL ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_attempts" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."product_batches" TO "anon";
GRANT ALL ON TABLE "public"."product_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."product_batches" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_items" TO "anon";
GRANT ALL ON TABLE "public"."purchase_items" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_items" TO "service_role";



GRANT ALL ON TABLE "public"."purchases" TO "anon";
GRANT ALL ON TABLE "public"."purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."purchases" TO "service_role";



GRANT ALL ON TABLE "public"."return_items" TO "anon";
GRANT ALL ON TABLE "public"."return_items" TO "authenticated";
GRANT ALL ON TABLE "public"."return_items" TO "service_role";



GRANT ALL ON TABLE "public"."returns" TO "anon";
GRANT ALL ON TABLE "public"."returns" TO "authenticated";
GRANT ALL ON TABLE "public"."returns" TO "service_role";



GRANT ALL ON TABLE "public"."sale_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_invoice_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_invoice_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_invoice_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."shop_members" TO "anon";
GRANT ALL ON TABLE "public"."shop_members" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_members" TO "service_role";



GRANT ALL ON TABLE "public"."shops" TO "anon";
GRANT ALL ON TABLE "public"."shops" TO "authenticated";
GRANT ALL ON TABLE "public"."shops" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
