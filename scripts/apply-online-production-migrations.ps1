[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ProjectRef,
    [Parameter(Mandatory = $true)][string]$DatabaseUrl,
    [switch]$ConfirmProduction,
    [switch]$BackupConfirmed,
    [string]$ExpectedProjectRef = $env:KAROBARX_ONLINE_PRODUCTION_REF,
    [string]$MigrationsRoot = (Join-Path $PSScriptRoot '..\supabase\migrations')
)

$ErrorActionPreference = 'Stop'

$migrations = @(
    [pscustomobject]@{
        Version = '20260820'
        File = '20260820_online_schema.sql'
        ExpectedMarkers = 3
        StateSql = "SELECT CASE count(*) WHEN 0 THEN 'NOT_APPLIED' WHEN 3 THEN 'FULLY_APPLIED' ELSE 'PARTIALLY_APPLIED' END FROM (VALUES (to_regclass('public.shops') IS NOT NULL), (to_regclass('public.products') IS NOT NULL), (to_regclass('public.sales') IS NOT NULL)) AS markers(present) WHERE present"
    },
    [pscustomobject]@{
        Version = '20260822'
        File = '20260822_industry_adaptive_shop_architecture.sql'
        ExpectedMarkers = 7
        StateSql = "SELECT CASE count(*) WHEN 0 THEN 'NOT_APPLIED' WHEN 7 THEN 'FULLY_APPLIED' ELSE 'PARTIALLY_APPLIED' END FROM (VALUES (EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shops' AND column_name='shop_type')), (to_regclass('public.shop_modules') IS NOT NULL), (EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shop_modules' AND column_name='is_customized')), (to_regclass('public.restaurant_tables') IS NOT NULL), (to_regclass('public.restaurant_orders') IS NOT NULL), (to_regclass('public.medicine_batches') IS NOT NULL), (to_regclass('public.prescriptions') IS NOT NULL)) AS markers(present) WHERE present"
    },
    [pscustomobject]@{
        Version = '20260823'
        File = '20260823_grocery_online_extensions.sql'
        ExpectedMarkers = 5
        StateSql = "SELECT CASE count(*) WHEN 0 THEN 'NOT_APPLIED' WHEN 5 THEN 'FULLY_APPLIED' ELSE 'PARTIALLY_APPLIED' END FROM (VALUES (EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='unit_type')), (EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='allows_decimal_quantity')), (to_regclass('public.idx_products_shop_barcode') IS NOT NULL), (to_regclass('public.idx_product_batches_shop_expiry') IS NOT NULL), (to_regclass('public.idx_product_batches_product_expiry') IS NOT NULL)) AS markers(present) WHERE present"
    },
    [pscustomobject]@{
        Version = '20260824'
        File = '20260824_online_security_hardening.sql'
        ExpectedMarkers = 5
        StateSql = "SELECT CASE count(*) WHEN 0 THEN 'NOT_APPLIED' WHEN 5 THEN 'FULLY_APPLIED' ELSE 'PARTIALLY_APPLIED' END FROM (VALUES (EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.user_is_shop_member(uuid)') AND EXISTS(SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) config WHERE config LIKE 'search_path=%' AND config NOT LIKE '%public%') AND NOT EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'))), (EXISTS(SELECT 1 FROM pg_constraint WHERE conname='product_batches_quantity_nonnegative' AND convalidated)), (EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='validate_quantity_sale_items' AND NOT tgisinternal)), (EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='prevent_shop_id_change_products' AND NOT tgisinternal))), (to_regprocedure('public.complete_shop_onboarding(text,text,text)') IS NOT NULL)) AS markers(present) WHERE present"
    }
)

function Abort([string]$Reason) {
    Write-Output "ONLINE_MIGRATION_ABORT reason=$Reason"
    exit 2
}

function Invoke-ReadSql([string]$Sql) {
    $output = & psql $DatabaseUrl -X -v ON_ERROR_STOP=1 -At -c "BEGIN TRANSACTION READ ONLY; $Sql; ROLLBACK;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Abort ('sql_read_failed_' + (($output -join ' ') -replace '\s+', '_'))
    }
    return $output[-1]
}

if (-not $ConfirmProduction) { Abort 'production_confirmation_required' }
if (-not $BackupConfirmed) { Abort 'backup_not_confirmed' }
if ([string]::IsNullOrWhiteSpace($ExpectedProjectRef) -or $ProjectRef -ne $ExpectedProjectRef) { Abort 'project_ref_mismatch_or_missing_expected_ref' }
if ($ProjectRef -match '(?i)test|offline|baseline|auth|storage') { Abort 'test_or_offline_project_ref' }
if ($DatabaseUrl -match '(?i)localhost|127\.0\.0\.1|offline|karobarx-test|baseline-test|auth-test|storage-test') { Abort 'non_production_database_url' }
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) { Abort 'psql_not_available' }

$root = (Resolve-Path $MigrationsRoot -ErrorAction Stop).Path
$historyExists = Invoke-ReadSql "SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL"
if ($historyExists -notin @('t', 'true')) { Abort 'migration_history_missing' }

$plan = foreach ($migration in $migrations) {
    if ($migration.File -match '(?i)offline' -or $migration.File -notin $migrations.File) {
        Abort 'migration_not_allowlisted'
    }

    $path = Join-Path $root $migration.File
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        Abort "migration_missing_$($migration.File)"
    }

    $historyApplied = Invoke-ReadSql "SELECT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='$($migration.Version)')"
    $schemaState = Invoke-ReadSql $migration.StateSql
    $isApplied = $historyApplied -in @('t', 'true')

    if ($schemaState -eq 'PARTIALLY_APPLIED') {
        Abort "partial_schema_state_$($migration.Version)"
    }
    if ($isApplied -and $schemaState -ne 'FULLY_APPLIED') {
        Abort "history_schema_mismatch_$($migration.Version)"
    }
    if (-not $isApplied -and $schemaState -ne 'NOT_APPLIED') {
        Abort "unrecorded_schema_state_$($migration.Version)"
    }

    [pscustomobject]@{
        Migration = $migration
        Path = $path
        Applied = $isApplied
    }
}

Write-Output "ONLINE_MIGRATION target=$ProjectRef"
Write-Output 'ONLINE_MIGRATION_PLAN'
foreach ($item in $plan) {
    $action = if ($item.Applied) { 'SKIP' } else { 'APPLY' }
    Write-Output "$action version=$($item.Migration.Version) file=$($item.Migration.File)"
}

foreach ($item in $plan) {
    if ($item.Applied) {
        Write-Output "ONLINE_MIGRATION_SKIP version=$($item.Migration.Version) reason=already_applied"
        continue
    }

    $version = $item.Migration.Version
    $recordSql = "INSERT INTO supabase_migrations.schema_migrations(version) VALUES ('$version') ON CONFLICT (version) DO NOTHING"

    Write-Output "ONLINE_MIGRATION_APPLY version=$version file=$($item.Migration.File)"
    & psql $DatabaseUrl -X -v ON_ERROR_STOP=1 -1 -f $item.Path -c $recordSql
    if ($LASTEXITCODE -ne 0) {
        Abort "sql_failure_$version"
    }

    $historyApplied = Invoke-ReadSql "SELECT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='$version')"
    $schemaState = Invoke-ReadSql $item.Migration.StateSql
    if ($historyApplied -notin @('t', 'true') -or $schemaState -ne 'FULLY_APPLIED') {
        Abort "post_apply_verification_failed_$version"
    }

    Write-Output "ONLINE_MIGRATION_APPLIED version=$version"
}
