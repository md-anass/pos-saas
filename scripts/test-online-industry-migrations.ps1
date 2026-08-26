[CmdletBinding()]
param([string]$HostName='localhost',[int]$Port=5432,[string]$AdminUser='postgres',[string]$DatabaseName='karobarx_industry_disposable',[string]$Password=$env:KAROBARX_DISPOSABLE_POSTGRES_PASSWORD,[switch]$ConfirmDisposable)
$ErrorActionPreference='Stop'
if(-not $ConfirmDisposable){throw 'DISPOSABLE_TEST_ABORT reason=confirmation_required'}
if($HostName -notin @('localhost','127.0.0.1','::1')){throw 'DISPOSABLE_TEST_ABORT reason=localhost_required'}
if($DatabaseName -notmatch '^karobarx_.*_disposable$'){throw 'DISPOSABLE_TEST_ABORT reason=unsafe_database_name'}
if([string]::IsNullOrWhiteSpace($Password)){throw 'DISPOSABLE_TEST_ABORT reason=KAROBARX_DISPOSABLE_POSTGRES_PASSWORD_missing'}
$bin='C:\Program Files\PostgreSQL\17\bin';$psql=Join-Path $bin 'psql.exe';$createdb=Join-Path $bin 'createdb.exe';$dropdb=Join-Path $bin 'dropdb.exe'
foreach($tool in @($psql,$createdb,$dropdb)){if(-not(Test-Path -LiteralPath $tool)){throw "DISPOSABLE_TEST_ABORT reason=tool_missing path=$tool"}}
$env:PGPASSWORD=$Password;$root=(Resolve-Path(Join-Path $PSScriptRoot '..')).Path
$migrations=@('20260820_online_schema.sql','20260822_industry_adaptive_shop_architecture.sql','20260823_grocery_online_extensions.sql','20260824_online_security_hardening.sql','20260824152238_complete_industry_workflows.sql','20260825160000_restaurant_deals.sql','20260825170000_restaurant_simplified_orders.sql')
function ConvertTo-WindowsCommandLineArgument([AllowNull()][string]$Argument) {
    if ($null -eq $Argument -or $Argument.Length -eq 0) { return '""' }
    if ($Argument -notmatch '[\s"]') { return $Argument }

    $builder = New-Object System.Text.StringBuilder
    $backslash = [char]92
    $quote = [char]34
    [void]$builder.Append($quote)
    $backslashCount = 0

    foreach ($character in $Argument.ToCharArray()) {
        if ($character -eq $backslash) {
            $backslashCount++
            continue
        }
        if ($character -eq $quote) {
            if ($backslashCount -gt 0) {
                [void]$builder.Append(($backslash.ToString() * ($backslashCount * 2)))
            }
            [void]$builder.Append($backslash)
            [void]$builder.Append($quote)
            $backslashCount = 0
            continue
        }
        if ($backslashCount -gt 0) {
            [void]$builder.Append(($backslash.ToString() * $backslashCount))
            $backslashCount = 0
        }
        [void]$builder.Append($character)
    }

    if ($backslashCount -gt 0) {
        [void]$builder.Append(($backslash.ToString() * ($backslashCount * 2)))
    }
    [void]$builder.Append($quote)
    return $builder.ToString()
}

function Invoke-NativeCommand([string]$Tool, [string[]]$Arguments) {
    $resolvedTool = (Resolve-Path -LiteralPath $Tool -ErrorAction Stop).Path
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $resolvedTool
    $startInfo.Arguments = (($Arguments | ForEach-Object { ConvertTo-WindowsCommandLineArgument $_ }) -join ' ')
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    try {
        if (-not $process.Start()) { throw "Unable to start native command: $resolvedTool" }
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $stdout = $stdoutTask.GetAwaiter().GetResult()
        $stderr = $stderrTask.GetAwaiter().GetResult()
        if ($null -eq $stdout) { $stdout = '' }
        if ($null -eq $stderr) { $stderr = '' }
        [pscustomobject]@{ ExitCode = $process.ExitCode; Stdout = [string]$stdout; Stderr = [string]$stderr }
    }
    finally {
        if ($null -ne $process) { $process.Dispose() }
    }
}
function Get-SqlFailureDetails([string[]]$Arguments, [string]$Output) {
    $fileArgumentIndex = [Array]::IndexOf($Arguments, '-f')
    $sourceFile = if ($fileArgumentIndex -ge 0 -and $fileArgumentIndex + 1 -lt $Arguments.Count) {
        Split-Path -Leaf $Arguments[$fileArgumentIndex + 1]
    } else {
        'inline-sql'
    }
    $safeOutput = $Output -replace '(?i)postgres(?:ql)?://[^\s]+', '[REDACTED_DATABASE_URL]'
    $line = 'unknown'
    $message = 'psql command failed without a PostgreSQL ERROR or FATAL message'
    $match = [regex]::Match($safeOutput, '(?m)^psql:(?<file>.*?):(?<line>[0-9]+): (?:ERROR|FATAL):\s*(?<message>[^\r\n]+)')
    if ($match.Success) {
        $sourceFile = Split-Path -Leaf $match.Groups['file'].Value
        $line = $match.Groups['line'].Value
        $message = $match.Groups['message'].Value.Trim()
    } else {
        $match = [regex]::Match($safeOutput, '(?m)^(?:ERROR|FATAL):\s*(?<message>[^\r\n]+)')
        if ($match.Success) { $message = $match.Groups['message'].Value.Trim() }
    }
    [pscustomobject]@{ File = $sourceFile; Line = $line; Message = $message }
}

function Invoke-Tool([string]$Tool, [string[]]$Arguments, [string]$Section) {
    $result = Invoke-NativeCommand $Tool $Arguments
    if ($result.ExitCode -eq 0) {
        if (-not [string]::IsNullOrWhiteSpace($result.Stdout)) { Write-Output $result.Stdout.TrimEnd() }
        if (-not [string]::IsNullOrWhiteSpace($result.Stderr)) { Write-Output $result.Stderr.TrimEnd() }
        return
    }

    $details = Get-SqlFailureDetails $Arguments ($result.Stdout + [Environment]::NewLine + $result.Stderr)
    Write-Output "DISPOSABLE_TEST_SQL_ERROR section=$Section"
    Write-Output "file=$($details.File)"
    Write-Output "line=$($details.Line)"
    Write-Output "message=$($details.Message)"
    throw "DISPOSABLE_TEST_ABORT reason=command_failed section=$Section exitCode=$($result.ExitCode)"
}

function Invoke-ExpectedFailure([string]$Tool, [string[]]$Arguments, [string]$Section, [string]$ExpectedMessage) {
    $result = Invoke-NativeCommand $Tool $Arguments
    if ($result.ExitCode -eq 0) { throw "DISPOSABLE_TEST_ABORT reason=expected_failure_missing section=$Section" }
    $safeOutput = ($result.Stdout + [Environment]::NewLine + $result.Stderr) -replace '(?i)postgres(?:ql)?://[^\s]+', '[REDACTED_DATABASE_URL]'
    if ($safeOutput -notmatch [regex]::Escape($ExpectedMessage)) {
        $details = Get-SqlFailureDetails $Arguments $safeOutput
        Write-Output "DISPOSABLE_TEST_SQL_ERROR section=$Section"
        Write-Output "file=$($details.File)"
        Write-Output "line=$($details.Line)"
        Write-Output "message=$($details.Message)"
        throw "DISPOSABLE_TEST_ABORT reason=unexpected_failure section=$Section exitCode=$($result.ExitCode)"
    }
    Write-Output "DISPOSABLE_TEST expectedFailure=$Section result=PASS"
}
Write-Output('DISPOSABLE_TEST target='+$HostName+':'+$Port+'/'+$DatabaseName)
Invoke-Tool $dropdb @('-h',$HostName,'-p',"$Port",'-U',$AdminUser,'--if-exists',$DatabaseName) 'drop-database'
Invoke-Tool $createdb @('-h',$HostName,'-p',"$Port",'-U',$AdminUser,$DatabaseName) 'create-database'
try{
 $dollar='$'
 $bootstrap=@("DO $dollar$dollar BEGIN"," IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;"," IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;"," IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;","END $dollar$dollar;","CREATE SCHEMA IF NOT EXISTS auth;","CREATE TABLE IF NOT EXISTS auth.users(id uuid PRIMARY KEY,email text);","CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $dollar$dollar"," SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid","$dollar$dollar;","GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;","GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;")-join[Environment]::NewLine
 Invoke-Tool $psql @('-X','-v','ON_ERROR_STOP=1','-q','-h',$HostName,'-p',"$Port",'-U',$AdminUser,'-d',$DatabaseName,'-c',$bootstrap) 'bootstrap'
 foreach($file in $migrations[0..3]){
  $path=Join-Path $root "supabase\migrations\$file"
  if(-not(Test-Path -LiteralPath $path -PathType Leaf)){throw "DISPOSABLE_TEST_ABORT reason=migration_missing file=$file"}
  Write-Output "DISPOSABLE_TEST migration=$file"
  Invoke-Tool $psql @('-X','-v','ON_ERROR_STOP=1','-q','-1','-h',$HostName,'-p',"$Port",'-U',$AdminUser,'-d',$DatabaseName,'-f',$path) "migration-$file"
 }
 $fixturePath=Join-Path $PSScriptRoot 'test-online-industry-existing-data-fixture.sql'
 Invoke-Tool $psql @('-X','-v','ON_ERROR_STOP=1','-q','-1','-h',$HostName,'-p',"$Port",'-U',$AdminUser,'-d',$DatabaseName,'-f',$fixturePath) 'existing-data-fixture'
 $workflowFile=$migrations[4];$workflowPath=Join-Path $root "supabase\migrations\$workflowFile"
 Invoke-ExpectedFailure $psql @('-X','-v','ON_ERROR_STOP=1','-q','-1','-h',$HostName,'-p',"$Port",'-U',$AdminUser,'-d',$DatabaseName,'-f',$workflowPath) 'legacy-stock-compatibility' 'stock reconciliation required'
 $reconcilePath=Join-Path $PSScriptRoot 'test-online-industry-existing-data-reconcile.sql'
 Invoke-Tool $psql @('-X','-v','ON_ERROR_STOP=1','-q','-1','-h',$HostName,'-p',"$Port",'-U',$AdminUser,'-d',$DatabaseName,'-f',$reconcilePath) 'existing-data-reconciliation'
 Write-Output "DISPOSABLE_TEST migration=$workflowFile"
 Invoke-Tool $psql @('-X','-v','ON_ERROR_STOP=1','-q','-1','-h',$HostName,'-p',"$Port",'-U',$AdminUser,'-d',$DatabaseName,'-f',$workflowPath) "migration-$workflowFile"
 foreach($restaurantMigration in $migrations[5..6]){
  $restaurantMigrationPath=Join-Path $root "supabase\migrations\$restaurantMigration"
  Write-Output "DISPOSABLE_TEST migration=$restaurantMigration"
  Invoke-Tool $psql @('-X','-v','ON_ERROR_STOP=1','-q','-1','-h',$HostName,'-p',"$Port",'-U',$AdminUser,'-d',$DatabaseName,'-f',$restaurantMigrationPath) "migration-$restaurantMigration"
 }
 $existingDataPath=Join-Path $PSScriptRoot 'test-online-industry-existing-data.sql'
 Invoke-Tool $psql @('-X','-v','ON_ERROR_STOP=1','-q','-1','-h',$HostName,'-p',"$Port",'-U',$AdminUser,'-d',$DatabaseName,'-f',$existingDataPath) 'existing-data-tests'
 $testPath=Join-Path $PSScriptRoot 'test-online-industry-workflows.sql'
 Invoke-Tool $psql @('-X','-v','ON_ERROR_STOP=1','-q','-1','-h',$HostName,'-p',"$Port",'-U',$AdminUser,'-d',$DatabaseName,'-f',$testPath) 'integration-tests'
 $restaurantTestPath=Join-Path $PSScriptRoot 'test-restaurant-orders.sql'
 Invoke-Tool $psql @('-X','-v','ON_ERROR_STOP=1','-q','-1','-h',$HostName,'-p',"$Port",'-U',$AdminUser,'-d',$DatabaseName,'-f',$restaurantTestPath) 'restaurant-order-tests'
 Write-Output 'DISPOSABLE_TEST result=PASS'
}finally{
 $cleanup=Invoke-NativeCommand $dropdb @('-h',$HostName,'-p',"$Port",'-U',$AdminUser,'--if-exists',$DatabaseName)
 if($cleanup.ExitCode-ne 0){Write-Warning 'Disposable database cleanup failed; remove it manually.'}
 Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
