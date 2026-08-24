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

function Read-Sql([string]$Sql) {
    $output = & psql $DatabaseUrl -X -v ON_ERROR_STOP=1 -At -c "BEGIN TRANSACTION READ ONLY; $Sql; ROLLBACK;" 2>&1
    if ($LASTEXITCODE -ne 0) { throw ($output -join [Environment]::NewLine) }
    return $output[-1]
}

Write-Output "ONLINE_POSTCHECK target=$ProjectRef"

$checks = @(
    @('shops.shop_type', "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shops' AND column_name='shop_type')"),
    @('shop_modules.is_customized', "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shop_modules' AND column_name='is_customized')"),
    @('shop_modules.unique', "SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.shop_modules'::regclass AND contype='u' AND conname='shop_modules_shop_id_module_key_key')"),
    @('products.unit_type', "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='unit_type')"),
    @('products.allows_decimal_quantity', "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='allows_decimal_quantity')"),
    @('product_batches.quantity_validated', "SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.product_batches'::regclass AND conname='product_batches_quantity_nonnegative' AND convalidated)"),
    @('idx_products_shop_barcode', "SELECT to_regclass('public.idx_products_shop_barcode') IS NOT NULL"),
    @('idx_product_batches_shop_expiry', "SELECT to_regclass('public.idx_product_batches_shop_expiry') IS NOT NULL"),
    @('idx_product_batches_product_expiry', "SELECT to_regclass('public.idx_product_batches_product_expiry') IS NOT NULL"),
    @('complete_shop_onboarding', "SELECT to_regprocedure('public.complete_shop_onboarding(text,text,text)') IS NOT NULL")
)

foreach ($check in $checks) {
    $result = Read-Sql $check[1]
    Write-Output "ONLINE_POSTCHECK check=$($check[0]) result=$result"
    if ($result -notin @('t', 'true')) { throw "ONLINE_POSTCHECK_ABORT reason=failed_$($check[0])" }
}

foreach ($version in @('20260820', '20260822', '20260823', '20260824')) {
    $applied = Read-Sql "SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AND EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='$version')"
    if ($applied -notin @('t', 'true')) { throw "ONLINE_POSTCHECK_ABORT reason=history_missing_$version" }
}

foreach ($table in @('shop_modules', 'restaurant_tables', 'restaurant_orders', 'medicine_batches', 'prescriptions', 'product_batches', 'sales', 'purchases')) {
    $enabled = Read-Sql "SELECT COALESCE((SELECT relrowsecurity::text FROM pg_class WHERE oid='public.$table'::regclass),'false')"
    Write-Output "ONLINE_POSTCHECK rls table=$table enabled=$enabled"
    if ($enabled -notin @('t', 'true')) { throw "ONLINE_POSTCHECK_ABORT reason=rls_disabled_$table" }
}

$unsafeDefiners = Read-Sql "SELECT count(*) FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND p.proname IN('get_user_shop_id','user_is_shop_member','complete_shop_onboarding','process_sale','process_purchase','process_return','seed_shop_modules','handle_shop_module_seed','handle_new_shop','handle_new_user','rls_auto_enable') AND (NOT EXISTS(SELECT 1 FROM unnest(COALESCE(p.proconfig,ARRAY[]::text[])) AS setting WHERE setting LIKE 'search_path=%') OR EXISTS(SELECT 1 FROM unnest(COALESCE(p.proconfig,ARRAY[]::text[])) AS setting WHERE setting LIKE 'search_path=%public%'))"
$publicOrAnonExecute = Read-Sql "SELECT count(*) FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('get_user_shop_id','user_is_shop_member','complete_shop_onboarding','process_sale','process_purchase','process_return','seed_shop_modules','handle_shop_module_seed','handle_new_shop','handle_new_user','rls_auto_enable') AND EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) AS acl WHERE acl.privilege_type='EXECUTE' AND (acl.grantee=0 OR acl.grantee=(SELECT oid FROM pg_roles WHERE rolname='anon')))"
$membershipDefinitionSafe = Read-Sql "SELECT pg_get_functiondef('public.user_is_shop_member(uuid)'::regprocedure) ILIKE '%status = ''active''%' AND pg_get_functiondef('public.user_is_shop_member(uuid)'::regprocedure) ILIKE '%subscription_end%'"
$anonTenantDml = Read-Sql "SELECT count(*) FROM information_schema.role_table_grants WHERE grantee='anon' AND table_schema='public' AND privilege_type IN('INSERT','UPDATE','DELETE') AND table_name IN('shops','shop_modules','products','product_batches','restaurant_tables','restaurant_orders','medicine_batches','prescriptions','sales','sale_items','purchases','purchase_items','returns','return_items')"

Write-Output "ONLINE_POSTCHECK unsafeSecurityDefiners=$unsafeDefiners"
Write-Output "ONLINE_POSTCHECK publicOrAnonFunctionExecute=$publicOrAnonExecute"
Write-Output "ONLINE_POSTCHECK membershipDefinitionSafe=$membershipDefinitionSafe"
Write-Output "ONLINE_POSTCHECK anonTenantDmlGrants=$anonTenantDml"

if ($unsafeDefiners -ne '0') { throw 'ONLINE_POSTCHECK_ABORT reason=unsafe_security_definer_search_path' }
if ($publicOrAnonExecute -ne '0') { throw 'ONLINE_POSTCHECK_ABORT reason=public_or_anon_function_execute' }
if ($membershipDefinitionSafe -notin @('t', 'true')) { throw 'ONLINE_POSTCHECK_ABORT reason=membership_helper_weakened' }
if ($anonTenantDml -ne '0') { throw 'ONLINE_POSTCHECK_ABORT reason=anon_tenant_dml_grants' }

Write-Output 'ONLINE_POSTCHECK result=PASS'
