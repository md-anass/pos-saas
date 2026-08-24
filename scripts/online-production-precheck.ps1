[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ProjectRef,
    [Parameter(Mandatory = $true)][string]$DatabaseUrl,
    [string]$ExpectedProjectRef = $env:KAROBARX_ONLINE_PRODUCTION_REF
)

$ErrorActionPreference = 'Stop'
$blocked = 'localhost|127\.0\.0\.1|offline|karobarx-test|baseline-test|auth-test|storage-test'

function New-SignatureCheck {
    param([string]$Version, [string]$File, [string[]]$Markers)

    [pscustomobject]@{
        Version = $Version
        File = $File
        Expected = $Markers.Count
        Sql = "SELECT count(*) FROM (VALUES $($Markers -join ', ')) AS markers(present) WHERE present"
        IntroducedSql = $null
    }
}

$checks = @(
    New-SignatureCheck -Version '20260820' -File '20260820_online_schema.sql' -Markers @(
        "(to_regclass('public.shops') IS NOT NULL)",
        "(to_regclass('public.shop_members') IS NOT NULL)",
        "(to_regclass('public.products') IS NOT NULL)",
        "(to_regclass('public.product_batches') IS NOT NULL)",
        "(to_regclass('public.categories') IS NOT NULL)",
        "(to_regclass('public.customers') IS NOT NULL)",
        "(to_regclass('public.suppliers') IS NOT NULL)",
        "(to_regclass('public.sales') IS NOT NULL)",
        "(to_regclass('public.sale_items') IS NOT NULL)",
        "(to_regclass('public.purchases') IS NOT NULL)",
        "(to_regclass('public.purchase_items') IS NOT NULL)",
        "(to_regclass('public.returns') IS NOT NULL)",
        "(to_regclass('public.return_items') IS NOT NULL)",
        "(to_regclass('public.expenses') IS NOT NULL)",
        "(to_regclass('public.payments') IS NOT NULL)",
        "(to_regclass('public.locations') IS NOT NULL)",
        "(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shops' AND column_name='owner_id'))",
        "(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shops' AND column_name='subscription_end'))",
        "(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='barcode'))",
        "(to_regprocedure('public.get_user_shop_id()') IS NOT NULL)",
        "(to_regprocedure('public.user_is_shop_member(uuid)') IS NOT NULL)",
        "(to_regprocedure('public.process_sale(uuid,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,boolean)') IS NOT NULL)",
        "(to_regprocedure('public.process_purchase(uuid,uuid,jsonb,numeric,numeric,numeric,numeric,text,text,boolean)') IS NOT NULL)",
        "(to_regprocedure('public.process_return(uuid,jsonb,numeric)') IS NOT NULL)",
        "(EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.shops') AND relrowsecurity))",
        "(EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.products') AND relrowsecurity))",
        "(EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.sales') AND relrowsecurity))"
    )
    New-SignatureCheck -Version '20260822' -File '20260822_industry_adaptive_shop_architecture.sql' -Markers @(
        "(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shops' AND column_name='shop_type' AND is_nullable='NO' AND column_default LIKE '%retail%'))",
        "(to_regclass('public.shop_modules') IS NOT NULL)",
        "(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shop_modules' AND column_name='is_customized'))",
        "(to_regclass('public.restaurant_tables') IS NOT NULL)",
        "(to_regclass('public.restaurant_orders') IS NOT NULL)",
        "(to_regclass('public.medicine_batches') IS NOT NULL)",
        "(to_regclass('public.prescriptions') IS NOT NULL)",
        "(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.shop_modules') AND conname='shop_modules_shop_id_module_key_key' AND contype='u'))",
        "(to_regprocedure('public.shop_type_default_modules(text)') IS NOT NULL)",
        "(to_regprocedure('public.seed_shop_modules(uuid,text)') IS NOT NULL)",
        "(to_regprocedure('public.handle_shop_module_seed()') IS NOT NULL)",
        "(EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.shops') AND tgname='trg_seed_shop_modules' AND NOT tgisinternal))",
        "(EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.shop_modules') AND relrowsecurity))",
        "(EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.restaurant_tables') AND relrowsecurity))",
        "(EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.restaurant_orders') AND relrowsecurity))",
        "(EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.medicine_batches') AND relrowsecurity))",
        "(EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.prescriptions') AND relrowsecurity))"
    )
    New-SignatureCheck -Version '20260823' -File '20260823_grocery_online_extensions.sql' -Markers @(
        "(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='unit_type' AND is_nullable='NO'))",
        "(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='allows_decimal_quantity' AND is_nullable='NO'))",
        "(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.products') AND conname='products_unit_type_check' AND contype='c'))",
        "(to_regclass('public.idx_products_shop_barcode') IS NOT NULL)",
        "(to_regclass('public.idx_product_batches_shop_expiry') IS NOT NULL)",
        "(to_regclass('public.idx_product_batches_product_expiry') IS NOT NULL)"
    )
    New-SignatureCheck -Version '20260824' -File '20260824_online_security_hardening.sql' -Markers @(
        "(to_regprocedure('public.complete_shop_onboarding(text,text,text)') IS NOT NULL)",
        "(to_regprocedure('public.prevent_shop_id_change()') IS NOT NULL)",
        "(to_regprocedure('public.validate_shop_scoped_references()') IS NOT NULL)",
        "(to_regprocedure('public.validate_product_quantity()') IS NOT NULL)",
        "(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.product_batches') AND conname='product_batches_quantity_nonnegative' AND convalidated))",
        "((SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'prevent_shop_id_change_%' AND NOT tgisinternal)=17)",
        "((SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'validate_shop_references_%' AND NOT tgisinternal)=11)",
        "((SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'validate_quantity_%' AND NOT tgisinternal)=3)",
        "(EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=to_regclass('public.products') AND polname='Members can update products' AND polwithcheck IS NOT NULL))",
        "(EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=to_regclass('public.product_batches') AND polname='Members can update batches' AND polwithcheck IS NOT NULL))",
        "(EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=to_regclass('public.sales') AND polname='Members can update sales' AND polwithcheck IS NOT NULL))",
        "((SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND p.proname IN ('get_user_shop_id','user_is_shop_member','complete_shop_onboarding','process_sale','process_purchase','process_return','seed_shop_modules','handle_shop_module_seed','handle_new_shop','handle_new_user','rls_auto_enable') AND (NOT EXISTS(SELECT 1 FROM unnest(COALESCE(p.proconfig,ARRAY[]::text[])) setting WHERE setting LIKE 'search_path=%') OR EXISTS(SELECT 1 FROM unnest(COALESCE(p.proconfig,ARRAY[]::text[])) setting WHERE setting LIKE 'search_path=%public%')))=0)",
        "((SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('get_user_shop_id','user_is_shop_member','complete_shop_onboarding','process_sale','process_purchase','process_return','seed_shop_modules','handle_shop_module_seed','handle_new_shop','handle_new_user','rls_auto_enable') AND EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) acl WHERE acl.privilege_type='EXECUTE' AND (acl.grantee=0 OR acl.grantee=(SELECT oid FROM pg_roles WHERE rolname='anon'))))=0)",
        "(EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.complete_shop_onboarding(text,text,text)') AND has_function_privilege('authenticated', p.oid, 'EXECUTE')))",
        "(EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.user_is_shop_member(uuid)') AND pg_get_functiondef(p.oid) ILIKE '%status = ''active''%' AND pg_get_functiondef(p.oid) ILIKE '%subscription_end%'))",
        "((SELECT count(*) FROM information_schema.role_table_grants WHERE grantee='anon' AND table_schema='public' AND privilege_type IN ('INSERT','UPDATE','DELETE') AND table_name IN ('shops','shop_modules','products','product_batches','restaurant_tables','restaurant_orders','medicine_batches','prescriptions','sales','sale_items','purchases','purchase_items','returns','return_items'))=0)"
    )
)

# These structural objects are unique to 20260824. Security properties are still
# required for APPLIED, but do not make an otherwise untouched baseline PARTIAL.
$hardeningIntroducedSql = "SELECT count(*) FROM (VALUES
    (to_regprocedure('public.complete_shop_onboarding(text,text,text)') IS NOT NULL),
    (to_regprocedure('public.prevent_shop_id_change()') IS NOT NULL),
    (to_regprocedure('public.validate_shop_scoped_references()') IS NOT NULL),
    (to_regprocedure('public.validate_product_quantity()') IS NOT NULL),
    (EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.product_batches') AND conname='product_batches_quantity_nonnegative' AND convalidated)),
    ((SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'prevent_shop_id_change_%' AND NOT tgisinternal)=17),
    ((SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'validate_shop_references_%' AND NOT tgisinternal)=11),
    ((SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'validate_quantity_%' AND NOT tgisinternal)=3)
) AS markers(present) WHERE present"

if ($ProjectRef -match '(?i)test|offline|baseline|auth|storage') { throw 'ONLINE_PRECHECK_ABORT reason=invalid_or_test_project_ref' }
if ($DatabaseUrl -match "(?i)$blocked") { throw 'ONLINE_PRECHECK_ABORT reason=non_production_database_url' }
if (-not $ExpectedProjectRef -or $ProjectRef -ne $ExpectedProjectRef) { throw 'ONLINE_PRECHECK_ABORT reason=project_ref_mismatch_or_missing_expected_ref' }
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) { throw 'ONLINE_PRECHECK_ABORT reason=psql_not_available' }

function Read-Sql([string]$Sql, [string]$Section) {
    $output = @(& psql $DatabaseUrl -X -v ON_ERROR_STOP=1 -qAt -c "BEGIN TRANSACTION READ ONLY; $Sql; ROLLBACK;" 2>&1)
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "ONLINE_PRECHECK_ABORT reason=psql_failed section=$Section exitCode=$exitCode"
    }

    $rows = @($output | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_.Length -gt 0 })
    if ($rows.Count -ne 1) {
        throw "ONLINE_PRECHECK_ABORT reason=unexpected_sql_row_count section=$Section count=$($rows.Count)"
    }

    return $rows[0]
}

function Read-IntegerSql([string]$Sql, [string]$Section) {
    $value = Read-Sql $Sql $Section
    if ($value -notmatch '^[0-9]+$') {
        throw "ONLINE_PRECHECK_ABORT reason=invalid_integer_result section=$Section"
    }
    return [int64]$value
}

function Read-BooleanSql([string]$Sql, [string]$Section) {
    $value = Read-Sql $Sql $Section
    if ($value -notmatch '^(t|f|true|false)$') {
        throw "ONLINE_PRECHECK_ABORT reason=invalid_boolean_result section=$Section"
    }
    return $value -in @('t', 'true')
}

function Get-SchemaState($Check, [string]$Section) {
    $present = Read-IntegerSql $Check.Sql $Section
    if ($present -eq $Check.Expected) { return 'APPLIED' }

    if ($Check.Version -eq '20260824') {
        $introduced = Read-IntegerSql $hardeningIntroducedSql 'hardening-structural'
        if ($introduced -eq 0) { return 'PENDING' }
    } elseif ($present -eq 0) {
        return 'PENDING'
    }

    return 'PARTIAL'
}

Write-Output "ONLINE_PRECHECK target=$ProjectRef"
Write-Output 'ONLINE_PRECHECK connection=PASS'

Write-Output 'ONLINE_PRECHECK_SQL section=migration-history'
$historyExists = Read-BooleanSql "SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL" 'migration-history'
if ($historyExists) {
    Write-Output 'ONLINE_PRECHECK migrationHistory=PRESENT'
    Write-Output 'ONLINE_PRECHECK migrationStateMode=HISTORY_PRIMARY'
} else {
    Write-Output 'ONLINE_PRECHECK migrationHistory=MISSING'
    Write-Output 'ONLINE_PRECHECK migrationStateMode=SCHEMA_FALLBACK'
}

$states = @()
foreach ($check in $checks) {
    $section = switch ($check.Version) {
        '20260820' { 'baseline-signature' }
        '20260822' { 'industry-signature' }
        '20260823' { 'grocery-signature' }
        '20260824' { 'hardening-signature' }
        default { 'unknown-signature' }
    }
    Write-Output "ONLINE_PRECHECK_SQL section=$section"
    $schemaState = Get-SchemaState $check $section
    $state = $schemaState
    $historyLabel = 'UNAVAILABLE'

    if ($historyExists) {
        $historyApplied = Read-BooleanSql "SELECT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='$($check.Version)')" "migration-history-$($check.Version)"
        $historyLabel = if ($historyApplied) { 'APPLIED' } else { 'PENDING' }

        if ($schemaState -eq 'PARTIAL') {
            $state = 'PARTIAL'
        } elseif (($historyApplied -and $schemaState -ne 'APPLIED') -or (-not $historyApplied -and $schemaState -ne 'PENDING')) {
            $state = 'AMBIGUOUS'
        }
    }

    $states += [pscustomobject]@{ Check = $check; State = $state }
    Write-Output "ONLINE_PRECHECK migration=$($check.Version) file=$($check.File) history=$historyLabel schema=$schemaState state=$state"
}

$unsafeStates = @($states | Where-Object { $_.State -in @('PARTIAL', 'AMBIGUOUS') })
if ($unsafeStates.Count -gt 0) {
    $versions = ($unsafeStates | ForEach-Object { $_.Check.Version }) -join ','
    throw "ONLINE_PRECHECK_ABORT reason=unsafe_migration_state versions=$versions"
}

Write-Output 'ONLINE_PRECHECK_SQL section=batch-compatibility'
$productBatchesExists = Read-BooleanSql "SELECT to_regclass('public.product_batches') IS NOT NULL" 'batch-compatibility'
if ($productBatchesExists) {
    $invalidBatchQuantityCount = Read-IntegerSql "SELECT count(*) FROM public.product_batches WHERE quantity < 0 OR quantity::text IN ('NaN','Infinity','-Infinity')" 'batch-compatibility'
    if ($invalidBatchQuantityCount -gt 0) {
        throw "ONLINE_PRECHECK_ABORT reason=incompatible_product_batch_quantities count=$invalidBatchQuantityCount"
    }
}

Write-Output 'ONLINE_PRECHECK dataCompatibility=PASS'
Write-Output 'ONLINE_PRECHECK result=PASS'
