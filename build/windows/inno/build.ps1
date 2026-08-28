param(
    [string]$Version,
    [string]$Iscc = "iscc"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$mainGoPath = Join-Path $repoRoot "main.go"
$installerScript = Join-Path $PSScriptRoot "Miku.iss"

if ([string]::IsNullOrWhiteSpace($Version)) {
    $mainGo = Get-Content -Raw -LiteralPath $mainGoPath
    if ($mainGo -notmatch 'const Version = "(?<Version>[^"]+)"') {
        throw "Could not find the application version in main.go."
    }
    $Version = $Matches.Version
}

$Version = $Version.Trim()
if ($Version.StartsWith("v")) {
    $Version = $Version.Substring(1)
}

if ($Version -match '^(?<NumericVersion>\d+(\.\d+){0,2})(?:-.+)?$') {
    $Version = $Matches.NumericVersion
} else {
    throw "Inno Setup requires a numeric version or a numeric prerelease tag. Received '$Version'."
}

$compiler = $null
$command = Get-Command $Iscc -ErrorAction SilentlyContinue
if ($null -ne $command) {
    $compiler = $command.Source
} elseif (Test-Path -LiteralPath $Iscc) {
    $compiler = (Resolve-Path -LiteralPath $Iscc).Path
} else {
    $knownPaths = @(
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "${env:ProgramFiles}\Inno Setup 6\ISCC.exe"
    )
    $compiler = $knownPaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

if ([string]::IsNullOrWhiteSpace($compiler)) {
    throw "Inno Setup compiler not found. Install Inno Setup 6 or pass -Iscc with the path to ISCC.exe."
}

Write-Host "Building Miku $Version installer with $compiler"
& $compiler "/DAppVersion=$Version" $installerScript
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
