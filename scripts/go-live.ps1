param(
  [Parameter(Mandatory = $false)]
  [string]$BaseUrl = "http://localhost:3000",
  [Parameter(Mandatory = $false)]
  [switch]$SkipHealth
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
  Write-Host "[ERROR] Missing required env: DATABASE_URL"
  exit 1
}

Write-Host "[INFO] DATABASE_URL detected"

Write-Host "[STEP] prisma generate"
npm run db:generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[STEP] prisma migrate deploy"
npm run db:deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $SkipHealth) {
  Write-Host "[STEP] health check"
  powershell -ExecutionPolicy Bypass -File "$PSScriptRoot/check-health.ps1" -BaseUrl $BaseUrl
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "[RESULT] GO-LIVE CHECKS OK"
exit 0
