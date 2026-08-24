[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ProjectRef,
    [Parameter(Mandatory = $true)][string]$DatabaseUrl,
    [string]$ExpectedProjectRef = $env:KAROBARX_ONLINE_PRODUCTION_REF
)

$ErrorActionPreference = 'Stop'
$blocked = 'localhost|127\.0\.0\.1|offline|karobarx-test|baseline-test|auth-test|storage-test'

$checks = @(
    [pscustomobject]@{ Version = '20260820'; Expected = 3; Sql = "SELECT CASE count(*) WHEN 0 THEN 'NOT_APPLIED' WHEN 3 THEN 'FULLY_APPLIED' ELSE 'PARTIALLY_APPLIED' END FROM (VALUES (to_regclass('public.shops') IS NOT NULL), (to_regclass('public.products') IS NOT NULL), (to_regclass('public.sales') IS NOT NULL)) AS markers(present) WHERE present" },
    [pscustomobject]@{ Version = '20260822'; Expected = 7; Sql = "SELECT CASE count(*) WHEN 0 THEN 'NOT_APPLIED' WHEN 7 THEN 'FULLY_APPLIED' ELSE 'PARTIALLY_APPLIED' END FROM (VALUES (EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shops' AND column_name='shop_type')), (to_regclass('public.shop_modules') IS NOT NULL), (EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shop_modules' AND column_name='is_customized')), (to_regclass('public.restaurant_tables') IS NOT NULL), (to_regclass('public.restaurant_orders') IS NOT NULL), (to_regclass('public.medicine_batches') IS NOT NULL), (to_regclass('public.prescriptions') IS NOT NULL)) AS markers(present) WHERE present" },
    [pscustomobject]@{ Version = '20260823'; Expected = 5; Sql = "SELECT CASE count(*) WHEN 0 THEN 'NOT_APPLIED' WHEN 5 THEN 'FULLY_APPLIED' ELSE 'PARTIALLY_APPLIED' END FROM (VALUES (EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='unit_type')), (EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='allows_decimal_quantity')), (to_regclass('public.idx_products_shop_barcode') IS NOT NULL), (to_regclass('public.idx_product_batches_shop_expiry') IS NOT NULL), (to_regclass('public.idx_product_batches_product_expiry') IS NOT NULL)) AS markers(present) WHERE present" },
    [pscustomobject]@{ Version = '20260824'; Expected = 5; Sql = "SELECT CASE count(*) WHEN 0 THEN 'NOT_APPLIED' WHEN 5 THEN 'FULLY_APPLIED' ELSE 'PARTIALLY_APPLIED' END FROM (VALUES (EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.user_is_shop_member(uuid)') AND EXISTS(SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) config WHERE config LIKE 'search_path=%' AND config NOT LIKE '%public%') AND NOT EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'))), (EXISTS(SELECT 1 FROM pg_constraint WHERE conname='product_batches_quantity_nonnegative' AND convalidated)), (EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='validate_quantity_sale_items' AND NOT tgisinternal)), (EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='prevent_shop_id_change_products' AND NOT tgisinternal))), (to_regprocedure('public.complete_shop_onboarding(text,text,text)') IS NOT NULL)) AS markers(present) WHERE present" }
)

if ($ProjectRef -match '(?i)test|offline|baseline|auth|storage') { throw 'ONLINE_PRECHECK_ABORT reason=invalid_or_test_project_ref' }
if ($DatabaseUrl -match "(?i)$blocked") { throw 'ONLINE_PRECHECK_ABORT reason=non_production_database_url' }
if (-not $ExpectedProjectRef -or $ProjectRef -ne $ExpectedProjectRef) { throw 'ONLINE_PRECHECK_ABORT reason=project_ref_mismatch_or_missing_expected_ref' }
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) { throw 'ONLINE_PRECHECK_ABORT reason=psql_not_available' }

function Read-Sql([string]$Sql) {
    $output = & psql $DatabaseUrl -X -v ON_ERROR_STOP=1 -At -c "BEGIN TRANSACTION READ ONLY; $Sql; ROLLBACK;" 2>&1
    if ($LASTEXITCODE -ne 0) { throw ($output -join [Environment]::NewLine) }
    return $output[-1]
}

Write-Output "ONLINE_PRECHECK target=$ProjectRef"
Write-Output 'ONLINE_PRECHECK connection=PASS'

$historyExists = Read-Sql "SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL"
if ($historyExists -notin @('t', 'true')) { throw 'ONLINE_PRECHECK_ABORT reason=migration_history_missing' }

foreach ($check in $checks) {
    $historyApplied = Read-Sql "SELECT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='$($check.Version)')"
    $schemaState = Read-Sql $check.Sql
    $isApplied = $historyApplied -in @('t', 'true')

    if ($schemaState -eq 'PARTIALLY_APPLIED') { throw "ONLINE_PRECHECK_ABORT reason=partial_schema_state_$($check.Version)" }
    if ($isApplied -and $schemaState -ne 'FULLY_APPLIED') { throw "ONLINE_PRECHECK_ABORT reason=history_schema_mismatch_$($check.Version)" }
    if (-not $isApplied -and $schemaState -ne 'NOT_APPLIED') { throw "ONLINE_PRECHECK_ABORT reason=unrecorded_schema_state_$($check.Version)" }

    Write-Output "ONLINE_PRECHECK migration=$($check.Version) history=$(if ($isApplied) { 'APPLIED' } else { 'PENDING' }) schema=$schemaState"
}

Write-Output 'ONLINE_PRECHECK result=PASS'
