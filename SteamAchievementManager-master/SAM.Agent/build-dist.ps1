# ============================================================================
#  build-dist.ps1 — build SAM.Agent (Release, x86) and assemble the download.
#
#  Produces:
#    dist\out\           runtime files + install scripts (unzipped layout)
#    dist\AchivoAgent.zip  the archive users download
#
#  Run from a Developer PowerShell (needs the .NET SDK or MSBuild + net48
#  targeting pack). Usage:  pwsh -File build-dist.ps1
# ============================================================================
$ErrorActionPreference = "Stop"
$root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$proj    = Join-Path $root "SAM.Agent.csproj"
$bin     = Join-Path $root "bin\Release\net48"
$scripts = Join-Path $root "installer"          # tracked source scripts
$dist    = Join-Path $root "dist"               # generated output (gitignored)
$outDir  = Join-Path $dist "out"
$zip     = Join-Path $dist "AchivoAgent.zip"

Write-Host "==> Building SAM.Agent (Release, x86)..." -ForegroundColor Cyan
# SAM.API uses unsafe blocks (native string interop), so /unsafe is required.
# NB: do NOT pass -p:Platform=x86 — that redirects output to bin\x86\Release\net48
# and breaks $bin below. The csproj's <PlatformTarget>x86</PlatformTarget> already
# produces an x86 binary at the default bin\Release\net48 path.
dotnet build $proj -c Release -p:AllowUnsafeBlocks=true -v minimal
if ($LASTEXITCODE -ne 0) {
    Write-Host "dotnet build failed, trying msbuild..." -ForegroundColor Yellow
    msbuild $proj /p:Configuration=Release /p:AllowUnsafeBlocks=true /v:minimal
    if ($LASTEXITCODE -ne 0) { throw "Build failed (dotnet and msbuild)." }
}

Write-Host "==> Assembling dist\out ..." -ForegroundColor Cyan
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir | Out-Null

# Runtime files.
foreach ($f in @("SAM.Agent.exe", "SAM.Agent.exe.config", "SAM.API.dll")) {
    $p = Join-Path $bin $f
    if (-not (Test-Path $p)) { throw "Missing build output: $p" }
    Copy-Item $p $outDir
}
# Install scripts + docs (from the tracked installer/ folder).
foreach ($f in @("install.bat", "uninstall.bat", "run-hidden.vbs", "INSTALL.md")) {
    Copy-Item (Join-Path $scripts $f) $outDir
}

Write-Host "==> Zipping ..." -ForegroundColor Cyan
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $outDir "*") -DestinationPath $zip

Write-Host "==> Done: $zip" -ForegroundColor Green
Write-Host "    Host this file and point VITE_AGENT_DOWNLOAD_URL at it."
