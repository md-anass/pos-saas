[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ProjectRef,
    [Parameter(Mandatory = $true)][string]$DatabaseUrl,
    [switch]$ConfirmProduction,
    [switch]$BackupConfirmed,
    [switch]$PlanOnly,
    [string]$ExpectedProjectRef = $env:KAROBARX_ONLINE_PRODUCTION_REF,
    [string]$MigrationsRoot = (Join-Path $PSScriptRoot '../supabase/migrations')
)

$ErrorActionPreference = 'Stop'

$migrations = @(
    [pscustomobject]@{ Version = '20260820'; File = '20260820_online_schema.sql' }
    [pscustomobject]@{ Version = '20260822'; File = '20260822_industry_adaptive_shop_architecture.sql' }
    [pscustomobject]@{ Version = '20260823'; File = '20260823_grocery_online_extensions.sql' }
    [pscustomobject]@{ Version = '20260824'; File = '20260824_online_security_hardening.sql' }
    [pscustomobject]@{ Version = '20260824152238'; File = '20260824152238_complete_industry_workflows.sql' }
    [pscustomobject]@{ Version = '20260825160000'; File = '20260825160000_restaurant_deals.sql' }
    [pscustomobject]@{ Version = '20260825170000'; File = '20260825170000_restaurant_simplified_orders.sql' }
)

function Abort([string]$Reason) {
    Write-Output "ONLINE_MIGRATION_ABORT reason=$Reason"
    exit 2
}

if (-not $ConfirmProduction) { Abort 'production_confirmation_required' }
if (-not $BackupConfirmed) { Abort 'backup_not_confirmed' }
if ([string]::IsNullOrWhiteSpace($ExpectedProjectRef) -or $ProjectRef -ne $ExpectedProjectRef) { Abort 'project_ref_mismatch_or_missing_expected_ref' }
if ($ProjectRef -match '(?i)test|offline|baseline|auth|storage') { Abort 'test_or_offline_project_ref' }
if ($DatabaseUrl -match '(?i)localhost|127\.0\.0\.1|offline|karobarx-test|baseline-test|auth-test|storage-test') { Abort 'non_production_database_url' }
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) { Abort 'psql_not_available' }

$root = (Resolve-Path $MigrationsRoot -ErrorAction Stop).Path
$precheckPath = Join-Path $PSScriptRoot 'online-production-precheck.ps1'
if (-not (Test-Path -LiteralPath $precheckPath -PathType Leaf)) { Abort 'precheck_missing' }

$allowedFiles = @($migrations.File)
foreach ($migration in $migrations) {
    if ($migration.File -match '(?i)offline' -or $migration.File -notin $allowedFiles) {
        Abort 'migration_not_allowlisted'
    }

    $migration | Add-Member -NotePropertyName Path -NotePropertyValue (Join-Path $root $migration.File)
    if (-not (Test-Path -LiteralPath $migration.Path -PathType Leaf)) {
        Abort "migration_missing_$($migration.File)"
    }
}

function Get-PrecheckSnapshot {
    try {
        $output = @(& $precheckPath -ProjectRef $ProjectRef -DatabaseUrl $DatabaseUrl -ExpectedProjectRef $ExpectedProjectRef 2>&1)
    } catch {
        Abort 'precheck_failed'
    }

    $lines = @($output | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_.Length -gt 0 })
    if (@($lines | Where-Object { $_ -eq 'ONLINE_PRECHECK result=PASS' }).Count -ne 1) {
        Abort 'precheck_result_not_pass'
    }
    if (@($lines | Where-Object { $_ -eq 'ONLINE_PRECHECK dataCompatibility=PASS' }).Count -ne 1) {
        Abort 'precheck_data_compatibility_not_pass'
    }

    $historyLines = @($lines | Where-Object { $_ -match '^ONLINE_PRECHECK migrationHistory=(PRESENT|MISSING)$' })
    if ($historyLines.Count -ne 1) { Abort 'precheck_history_state_invalid' }
    $historyExists = $historyLines[0] -eq 'ONLINE_PRECHECK migrationHistory=PRESENT'

    $states = @{}
    $stateLines = @($lines | Where-Object { $_ -match '^ONLINE_PRECHECK migration=' })
    if ($stateLines.Count -ne $migrations.Count) { Abort 'precheck_migration_state_count_invalid' }

    foreach ($line in $stateLines) {
        if ($line -notmatch '^ONLINE_PRECHECK migration=(20260820|20260822|20260823|20260824|20260824152238|20260825160000|20260825170000) file=([^ ]+) history=(APPLIED|PENDING|UNAVAILABLE) schema=(APPLIED|PENDING|PARTIAL) state=(APPLIED|PENDING|PARTIAL|AMBIGUOUS)$') {
            Abort 'precheck_migration_state_format_invalid'
        }

        $version = $Matches[1]
        $file = $Matches[2]
        $state = $Matches[5]
        $expected = @($migrations | Where-Object { $_.Version -eq $version })
        if ($expected.Count -ne 1 -or $expected[0].File -ne $file -or $states.ContainsKey($version)) {
            Abort 'precheck_migration_state_allowlist_mismatch'
        }
        $states[$version] = $state
    }

    foreach ($migration in $migrations) {
        if (-not $states.ContainsKey($migration.Version)) { Abort 'precheck_migration_state_missing' }
        if ($states[$migration.Version] -in @('PARTIAL', 'AMBIGUOUS')) {
            Abort "unsafe_migration_state_$($migration.Version)"
        }
    }

    return [pscustomobject]@{
        HistoryExists = $historyExists
        States = $states
    }
}

$snapshot = Get-PrecheckSnapshot

Write-Output "ONLINE_MIGRATION target=$ProjectRef"
Write-Output "ONLINE_MIGRATION migrationHistory=$(if ($snapshot.HistoryExists) { 'PRESENT' } else { 'MISSING' })"
Write-Output "ONLINE_MIGRATION migrationStateMode=$(if ($snapshot.HistoryExists) { 'HISTORY_PRIMARY' } else { 'SCHEMA_FALLBACK' })"
Write-Output 'ONLINE_MIGRATION_PLAN'
foreach ($migration in $migrations) {
    $state = $snapshot.States[$migration.Version]
    if ($state -eq 'APPLIED') {
        Write-Output "SKIP $($migration.File) state=APPLIED"
    } elseif ($state -eq 'PENDING') {
        Write-Output "APPLY $($migration.File)"
    } else {
        Abort "unsupported_migration_state_$($migration.Version)"
    }
}

if ($PlanOnly) {
    Write-Output 'ONLINE_MIGRATION_PLAN result=PASS mode=DRY_RUN'
    exit 0
}

foreach ($migration in $migrations) {
    if ($snapshot.States[$migration.Version] -eq 'APPLIED') {
        Write-Output "ONLINE_MIGRATION_SKIP version=$($migration.Version) reason=schema_applied"
        continue
    }

    Write-Output "ONLINE_MIGRATION_APPLY version=$($migration.Version) file=$($migration.File)"
    if ($snapshot.HistoryExists) {
        $recordSql = "INSERT INTO supabase_migrations.schema_migrations(version) VALUES ('$($migration.Version)') ON CONFLICT (version) DO NOTHING"
        & psql $DatabaseUrl -X -v ON_ERROR_STOP=1 -1 -f $migration.Path -c $recordSql
    } else {
        & psql $DatabaseUrl -X -v ON_ERROR_STOP=1 -1 -f $migration.Path
    }
    if ($LASTEXITCODE -ne 0) { Abort "sql_failure_$($migration.Version)" }

    $snapshot = Get-PrecheckSnapshot
    if ($snapshot.States[$migration.Version] -ne 'APPLIED') {
        Abort "post_apply_verification_failed_$($migration.Version)"
    }
    Write-Output "ONLINE_MIGRATION_APPLIED version=$($migration.Version)"
}

Write-Output 'ONLINE_MIGRATION result=PASS'
