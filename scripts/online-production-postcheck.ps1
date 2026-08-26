[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ProjectRef,
    [Parameter(Mandatory = $true)][string]$DatabaseUrl,
    [string]$ExpectedProjectRef = $env:KAROBARX_ONLINE_PRODUCTION_REF
)

$ErrorActionPreference = 'Stop'

if (-not $ExpectedProjectRef -or $ProjectRef -ne $ExpectedProjectRef) { throw 'ONLINE_POSTCHECK_ABORT reason=project_ref_mismatch_or_missing_expected_ref' }
if ($DatabaseUrl -match '(?i)localhost|127\.0\.0\.1|offline|karobarx-test|baseline-test|auth-test|storage-test') { throw 'ONLINE_POSTCHECK_ABORT reason=non_production_database_url' }
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) { throw 'ONLINE_POSTCHECK_ABORT reason=psql_not_available' }

function Read-Sql([string]$Sql, [string]$Section) {
    $output = @(& psql $DatabaseUrl -X -v ON_ERROR_STOP=1 -qAt -c "BEGIN TRANSACTION READ ONLY; $Sql; ROLLBACK;" 2>&1)
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "ONLINE_POSTCHECK_ABORT reason=psql_failed section=$Section exitCode=$exitCode"
    }

    $rows = @($output | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_.Length -gt 0 })
    if ($rows.Count -ne 1) {
        throw "ONLINE_POSTCHECK_ABORT reason=unexpected_sql_row_count section=$Section count=$($rows.Count)"
    }
    return $rows[0]
}

function Read-BooleanSql([string]$Sql, [string]$Section) {
    $value = Read-Sql $Sql $Section
    if ($value -notmatch '^(t|f|true|false)$') {
        throw "ONLINE_POSTCHECK_ABORT reason=invalid_boolean_result section=$Section"
    }
    return $value -in @('t', 'true')
}

function Read-IntegerSql([string]$Sql, [string]$Section) {
    $value = Read-Sql $Sql $Section
    if ($value -notmatch '^[0-9]+$') {
        throw "ONLINE_POSTCHECK_ABORT reason=invalid_integer_result section=$Section"
    }
    return [int64]$value
}

function Assert-MigrationState {
    $precheckPath = Join-Path $PSScriptRoot 'online-production-precheck.ps1'
    if (-not (Test-Path -LiteralPath $precheckPath -PathType Leaf)) {
        throw 'ONLINE_POSTCHECK_ABORT reason=precheck_missing'
    }

    try {
        $output = @(& $precheckPath -ProjectRef $ProjectRef -DatabaseUrl $DatabaseUrl -ExpectedProjectRef $ExpectedProjectRef 2>&1)
    } catch {
        throw 'ONLINE_POSTCHECK_ABORT reason=migration_state_precheck_failed'
    }

    $lines = @($output | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_.Length -gt 0 })
    if (@($lines | Where-Object { $_ -eq 'ONLINE_PRECHECK result=PASS' }).Count -ne 1) {
        throw 'ONLINE_POSTCHECK_ABORT reason=migration_state_precheck_not_pass'
    }
    if (@($lines | Where-Object { $_ -eq 'ONLINE_PRECHECK dataCompatibility=PASS' }).Count -ne 1) {
        throw 'ONLINE_POSTCHECK_ABORT reason=data_compatibility_not_pass'
    }

    $stateLines = @($lines | Where-Object { $_ -match '^ONLINE_PRECHECK migration=' })
    if ($stateLines.Count -ne 7) {
        throw 'ONLINE_POSTCHECK_ABORT reason=migration_state_count_invalid'
    }

    $expected = @{
        '20260820' = '20260820_online_schema.sql'
        '20260822' = '20260822_industry_adaptive_shop_architecture.sql'
        '20260823' = '20260823_grocery_online_extensions.sql'
        '20260824' = '20260824_online_security_hardening.sql'
        '20260824152238' = '20260824152238_complete_industry_workflows.sql'
        '20260825160000' = '20260825160000_restaurant_deals.sql'
        '20260825170000' = '20260825170000_restaurant_simplified_orders.sql'
    }
    $seen = @{}

    foreach ($line in $stateLines) {
        if ($line -notmatch '^ONLINE_PRECHECK migration=(20260820|20260822|20260823|20260824|20260824152238|20260825160000|20260825170000) file=([^ ]+) history=(APPLIED|PENDING|UNAVAILABLE) schema=APPLIED state=APPLIED$') {
            throw 'ONLINE_POSTCHECK_ABORT reason=migration_not_fully_applied'
        }
        $version = $Matches[1]
        $file = $Matches[2]
        if ($expected[$version] -ne $file -or $seen.ContainsKey($version)) {
            throw 'ONLINE_POSTCHECK_ABORT reason=migration_state_allowlist_mismatch'
        }
        $seen[$version] = $true
    }

    if ($seen.Count -ne $expected.Count) {
        throw 'ONLINE_POSTCHECK_ABORT reason=migration_state_missing'
    }
}

Write-Output "ONLINE_POSTCHECK target=$ProjectRef"

$checks = @(
    [pscustomobject]@{ Name = 'shops.shop_type'; Sql = "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shops' AND column_name='shop_type')" }
    [pscustomobject]@{ Name = 'shop_modules.is_customized'; Sql = "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shop_modules' AND column_name='is_customized')" }
    [pscustomobject]@{ Name = 'shop_modules.unique'; Sql = "SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.shop_modules'::regclass AND contype='u' AND conname='shop_modules_shop_id_module_key_key')" }
    [pscustomobject]@{ Name = 'restaurant_tables'; Sql = "SELECT to_regclass('public.restaurant_tables') IS NOT NULL" }
    [pscustomobject]@{ Name = 'restaurant_orders'; Sql = "SELECT to_regclass('public.restaurant_orders') IS NOT NULL" }
    [pscustomobject]@{ Name = 'medicine_batches'; Sql = "SELECT to_regclass('public.medicine_batches') IS NOT NULL" }
    [pscustomobject]@{ Name = 'prescriptions'; Sql = "SELECT to_regclass('public.prescriptions') IS NOT NULL" }
    [pscustomobject]@{ Name = 'products.unit_type'; Sql = "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='unit_type')" }
    [pscustomobject]@{ Name = 'products.allows_decimal_quantity'; Sql = "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='allows_decimal_quantity')" }
    [pscustomobject]@{ Name = 'product_batches.quantity_validated'; Sql = "SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.product_batches'::regclass AND conname='product_batches_quantity_nonnegative' AND convalidated)" }
    [pscustomobject]@{ Name = 'idx_products_shop_barcode'; Sql = "SELECT to_regclass('public.idx_products_shop_barcode') IS NOT NULL" }
    [pscustomobject]@{ Name = 'idx_product_batches_shop_expiry'; Sql = "SELECT to_regclass('public.idx_product_batches_shop_expiry') IS NOT NULL" }
    [pscustomobject]@{ Name = 'idx_product_batches_product_expiry'; Sql = "SELECT to_regclass('public.idx_product_batches_product_expiry') IS NOT NULL" }
    [pscustomobject]@{ Name = 'complete_shop_onboarding'; Sql = "SELECT to_regprocedure('public.complete_shop_onboarding(text,text,text)') IS NOT NULL" }
    [pscustomobject]@{ Name = 'industry.products_active'; Sql = "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='is_active')" }
    [pscustomobject]@{ Name = 'industry.product_batches_active'; Sql = "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_batches' AND column_name='is_active')" }
    [pscustomobject]@{ Name = 'industry.medicine_batches_active'; Sql = "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='medicine_batches' AND column_name='is_active')" }
    [pscustomobject]@{ Name = 'industry.restaurant_order_items'; Sql = "SELECT to_regclass('public.restaurant_order_items') IS NOT NULL" }
    [pscustomobject]@{ Name = 'industry.prescription_items'; Sql = "SELECT to_regclass('public.prescription_items') IS NOT NULL" }
    [pscustomobject]@{ Name = 'industry.manage_batch_rpc'; Sql = "SELECT to_regprocedure('public.manage_inventory_batch(text,text,uuid,uuid,text,date,date,numeric,uuid,numeric,numeric)') IS NOT NULL" }
    [pscustomobject]@{ Name = 'industry.restaurant_payment_rpc'; Sql = "SELECT to_regprocedure('public.complete_restaurant_order(uuid,text)') IS NOT NULL" }
    [pscustomobject]@{ Name = 'industry.pharmacy_dispense_rpc'; Sql = "SELECT to_regprocedure('public.dispense_prescription(uuid,text)') IS NOT NULL" }
    [pscustomobject]@{ Name = 'industry.batch_sale_trigger'; Sql = "SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.sale_items'::regclass AND tgname='sale_items_consume_tracked_batches' AND NOT tgisinternal)" }
    [pscustomobject]@{ Name = 'industry.stock_guard_trigger'; Sql = "SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.products'::regclass AND tgname='products_tracked_stock_guard' AND NOT tgisinternal)" }
    [pscustomobject]@{ Name = 'industry.pharmacy_batch_duplicate_guard'; Sql = "SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.product_batches'::regclass AND tgname='product_batches_pharmacy_duplicate_guard' AND NOT tgisinternal)" }
    [pscustomobject]@{ Name = 'industry.pharmacy_expiry_guard'; Sql = "SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.medicine_batches'::regclass AND tgname='medicine_batches_expiry_required' AND NOT tgisinternal)" }
    [pscustomobject]@{ Name = 'restaurant.table_archive_guard'; Sql = "SELECT to_regprocedure('public.prevent_occupied_restaurant_table_archive()') IS NOT NULL" }
    [pscustomobject]@{ Name = 'restaurant.order_workspace'; Sql = "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='restaurant_orders' AND column_name='order_number') AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='restaurant_orders' AND column_name='guest_count') AND to_regprocedure('public.create_restaurant_order(text,uuid,integer,text)') IS NOT NULL AND to_regprocedure('public.adjust_restaurant_order_item(uuid,uuid,integer,text)') IS NOT NULL" }
    [pscustomobject]@{ Name = 'restaurant.simplified_orders'; Sql = "SELECT to_regprocedure('public.create_restaurant_order(text,uuid,integer,text)') IS NOT NULL AND to_regprocedure('public.prevent_occupied_restaurant_table_archive()') IS NOT NULL" }
    [pscustomobject]@{ Name = 'restaurant.no_kitchen_module'; Sql = "SELECT NOT public.shop_type_default_modules('restaurant') @> ARRAY['kitchen']" }
    [pscustomobject]@{ Name = 'restaurant.deals'; Sql = "SELECT to_regclass('public.restaurant_deals') IS NOT NULL AND to_regclass('public.restaurant_deal_items') IS NOT NULL" }
    [pscustomobject]@{ Name = 'restaurant.deal_rpcs'; Sql = "SELECT to_regprocedure('public.manage_restaurant_deal(text,uuid,text,text,numeric,uuid[],numeric[])') IS NOT NULL AND to_regprocedure('public.add_restaurant_deal_to_order(uuid,uuid,integer,text)') IS NOT NULL" })

foreach ($check in $checks) {
    Write-Output "ONLINE_POSTCHECK_SQL section=$($check.Name)"
    $result = Read-BooleanSql $check.Sql $check.Name
    Write-Output "ONLINE_POSTCHECK check=$($check.Name) result=$($result.ToString().ToLowerInvariant())"
    if (-not $result) { throw "ONLINE_POSTCHECK_ABORT reason=failed_$($check.Name)" }
}

Write-Output 'ONLINE_POSTCHECK_SQL section=migration-state'
Assert-MigrationState

Write-Output 'ONLINE_POSTCHECK_SQL section=migration-history'
$historyExists = Read-BooleanSql "SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL" 'migration-history'
if ($historyExists) {
    foreach ($version in @('20260820', '20260822', '20260823', '20260824', '20260824152238', '20260825160000', '20260825170000')) {
        $applied = Read-BooleanSql "SELECT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='$version')" "migration-history-$version"
        if (-not $applied) { throw "ONLINE_POSTCHECK_ABORT reason=history_missing_$version" }
    }
    Write-Output 'ONLINE_POSTCHECK migrationHistory=PRESENT'
} else {
    Write-Output 'ONLINE_POSTCHECK migrationHistory=MISSING schemaState=VERIFIED'
}

foreach ($table in @('shop_modules', 'restaurant_tables', 'restaurant_orders', 'restaurant_order_items', 'restaurant_deals', 'restaurant_deal_items', 'medicine_batches', 'prescriptions', 'prescription_items', 'product_batches', 'sales', 'purchases')) {
    $section = "rls-$table"
    Write-Output "ONLINE_POSTCHECK_SQL section=$section"
    $enabled = Read-BooleanSql "SELECT COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid='public.$table'::regclass),false)" $section
    Write-Output "ONLINE_POSTCHECK rls table=$table enabled=$($enabled.ToString().ToLowerInvariant())"
    if (-not $enabled) { throw "ONLINE_POSTCHECK_ABORT reason=rls_disabled_$table" }
}

Write-Output 'ONLINE_POSTCHECK_SQL section=security-counts'
$unsafeDefiners = Read-IntegerSql "SELECT count(*) FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND p.proname IN('get_user_shop_id','user_is_shop_member','complete_shop_onboarding','process_sale','process_purchase','process_return','seed_shop_modules','handle_shop_module_seed','handle_new_shop','handle_new_user','rls_auto_enable','manage_inventory_batch','create_restaurant_order','complete_restaurant_order','dispense_prescription','industry_module_enabled','consume_tracked_sale_batches','sync_pharmacy_purchase_batch','protect_industry_stock_and_records','prevent_duplicate_pharmacy_product_batch','require_pharmacy_batch_expiry','manage_restaurant_deal','set_restaurant_deal_active','add_restaurant_deal_to_order') AND (NOT EXISTS(SELECT 1 FROM unnest(COALESCE(p.proconfig,ARRAY[]::text[])) AS setting WHERE setting LIKE 'search_path=%') OR EXISTS(SELECT 1 FROM unnest(COALESCE(p.proconfig,ARRAY[]::text[])) AS setting WHERE setting LIKE 'search_path=%public%'))" 'unsafe-security-definers'
$publicOrAnonExecute = Read-IntegerSql "SELECT count(*) FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('get_user_shop_id','user_is_shop_member','complete_shop_onboarding','process_sale','process_purchase','process_return','seed_shop_modules','handle_shop_module_seed','handle_new_shop','handle_new_user','rls_auto_enable','manage_inventory_batch','create_restaurant_order','complete_restaurant_order','dispense_prescription','industry_module_enabled','consume_tracked_sale_batches','sync_pharmacy_purchase_batch','protect_industry_stock_and_records','prevent_duplicate_pharmacy_product_batch','require_pharmacy_batch_expiry','manage_restaurant_deal','set_restaurant_deal_active','add_restaurant_deal_to_order') AND EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) AS acl WHERE acl.privilege_type='EXECUTE' AND (acl.grantee=0 OR acl.grantee=(SELECT oid FROM pg_roles WHERE rolname='anon')))" 'public-anon-function-execute'
$membershipDefinitionSafe = Read-BooleanSql "SELECT pg_get_functiondef('public.user_is_shop_member(uuid)'::regprocedure) ILIKE '%status = ''active''%' AND pg_get_functiondef('public.user_is_shop_member(uuid)'::regprocedure) ILIKE '%subscription_end%'" 'membership-definition'
$anonTenantDml = Read-IntegerSql "SELECT count(*) FROM information_schema.role_table_grants WHERE grantee='anon' AND table_schema='public' AND privilege_type IN('INSERT','UPDATE','DELETE') AND table_name IN('shops','shop_modules','products','product_batches','restaurant_tables','restaurant_orders','restaurant_order_items','medicine_batches','prescriptions','prescription_items','sales','sale_items','purchases','purchase_items','returns','return_items')" 'anon-tenant-dml'
$authenticatedTransactionDml = Read-IntegerSql "SELECT count(*) FROM information_schema.role_table_grants WHERE grantee='authenticated' AND table_schema='public' AND privilege_type IN('INSERT','UPDATE','DELETE') AND table_name IN('product_batches','medicine_batches','sales','sale_items','payments','purchases','purchase_items','returns','return_items')" 'authenticated-transaction-dml'

Write-Output 'ONLINE_POSTCHECK_SQL section=data-compatibility'
$shopCount = Read-IntegerSql "SELECT count(*) FROM public.shops" 'existing-shops'
$duplicateModules = Read-IntegerSql "SELECT count(*) FROM (SELECT shop_id,module_key FROM public.shop_modules GROUP BY shop_id,module_key HAVING count(*) > 1) duplicates" 'duplicate-shop-modules'
$invalidBatchQuantities = Read-IntegerSql "SELECT (SELECT count(*) FROM public.product_batches WHERE quantity < 0 OR quantity::text IN ('NaN','Infinity','-Infinity')) + (SELECT count(*) FROM public.medicine_batches WHERE quantity < 0 OR quantity::text IN ('NaN','Infinity','-Infinity'))" 'batch-quantities'
$invalidShopTypes = Read-IntegerSql "SELECT count(*) FROM public.shops WHERE shop_type IS NULL OR shop_type NOT IN ('retail','restaurant','pharmacy','grocery','clothing','electronics','salon','wholesale','services','other')" 'shop-types'
$groceryStockMismatches = Read-IntegerSql "SELECT count(*) FROM public.products p JOIN public.shops s ON s.id=p.shop_id AND s.shop_type='grocery' WHERE p.track_batches AND p.quantity IS DISTINCT FROM (SELECT COALESCE(sum(b.quantity),0) FROM public.product_batches b WHERE b.shop_id=p.shop_id AND b.product_id=p.id AND b.is_active)" 'grocery-stock-invariant'
$pharmacyStockMismatches = Read-IntegerSql "SELECT count(*) FROM public.products p JOIN public.shops s ON s.id=p.shop_id AND s.shop_type='pharmacy' WHERE p.quantity IS DISTINCT FROM (SELECT COALESCE(sum(b.quantity),0) FROM public.medicine_batches b WHERE b.shop_id=p.shop_id AND b.product_id=p.id AND b.is_active)" 'pharmacy-stock-invariant'
$pharmacyNullExpiryStock = Read-IntegerSql "SELECT count(*) FROM public.medicine_batches b JOIN public.shops s ON s.id=b.shop_id AND s.shop_type='pharmacy' WHERE b.is_active AND b.quantity>0 AND b.expiry_date IS NULL" 'pharmacy-expiry-invariant'

Write-Output "ONLINE_POSTCHECK unsafeSecurityDefiners=$unsafeDefiners"
Write-Output "ONLINE_POSTCHECK publicOrAnonFunctionExecute=$publicOrAnonExecute"
Write-Output "ONLINE_POSTCHECK membershipDefinitionSafe=$($membershipDefinitionSafe.ToString().ToLowerInvariant())"
Write-Output "ONLINE_POSTCHECK anonTenantDmlGrants=$anonTenantDml"
Write-Output "ONLINE_POSTCHECK authenticatedTransactionDmlGrants=$authenticatedTransactionDml"
Write-Output "ONLINE_POSTCHECK existingShops=$shopCount"
Write-Output "ONLINE_POSTCHECK duplicateShopModules=$duplicateModules"
Write-Output "ONLINE_POSTCHECK invalidBatchQuantities=$invalidBatchQuantities"
Write-Output "ONLINE_POSTCHECK invalidShopTypes=$invalidShopTypes"
Write-Output "ONLINE_POSTCHECK groceryStockMismatches=$groceryStockMismatches"
Write-Output "ONLINE_POSTCHECK pharmacyStockMismatches=$pharmacyStockMismatches"
Write-Output "ONLINE_POSTCHECK pharmacyNullExpiryStock=$pharmacyNullExpiryStock"

if ($unsafeDefiners -ne 0) { throw 'ONLINE_POSTCHECK_ABORT reason=unsafe_security_definer_search_path' }
if ($publicOrAnonExecute -ne 0) { throw 'ONLINE_POSTCHECK_ABORT reason=public_or_anon_function_execute' }
if (-not $membershipDefinitionSafe) { throw 'ONLINE_POSTCHECK_ABORT reason=membership_helper_weakened' }
if ($anonTenantDml -ne 0) { throw 'ONLINE_POSTCHECK_ABORT reason=anon_tenant_dml_grants' }
if ($authenticatedTransactionDml -ne 0) { throw 'ONLINE_POSTCHECK_ABORT reason=authenticated_transaction_dml_grants' }
if ($shopCount -lt 1) { throw 'ONLINE_POSTCHECK_ABORT reason=existing_shops_missing' }
if ($duplicateModules -ne 0) { throw 'ONLINE_POSTCHECK_ABORT reason=duplicate_shop_modules' }
if ($invalidBatchQuantities -ne 0) { throw 'ONLINE_POSTCHECK_ABORT reason=invalid_batch_quantities' }
if ($invalidShopTypes -ne 0) { throw 'ONLINE_POSTCHECK_ABORT reason=invalid_shop_types' }
if ($groceryStockMismatches -ne 0) { throw 'ONLINE_POSTCHECK_ABORT reason=grocery_stock_invariant_failed' }
if ($pharmacyStockMismatches -ne 0) { throw 'ONLINE_POSTCHECK_ABORT reason=pharmacy_stock_invariant_failed' }
if ($pharmacyNullExpiryStock -ne 0) { throw 'ONLINE_POSTCHECK_ABORT reason=pharmacy_null_expiry_stock' }

Write-Output 'ONLINE_POSTCHECK result=PASS'
