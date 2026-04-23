param(
  [Parameter(Mandatory = $false)]
  [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

$endpoints = @(
  "/api/health",
  "/api/dashboard/summary",
  "/api/inventory/list",
  "/api/sales/options?q=",
  "/api/reports/model-supplier-performance?month=2026-04"
)

$failed = $false

Write-Host "[HEALTH] Base URL: $BaseUrl"

foreach ($ep in $endpoints) {
  $url = "$BaseUrl$ep"
  try {
    $res = Invoke-WebRequest -Uri $url -UseBasicParsing
    $contentType = [string]$res.Headers["Content-Type"]
    if ($res.StatusCode -ne 200) {
      Write-Host "[FAIL] $ep -> HTTP $($res.StatusCode)"
      $failed = $true
      continue
    }
    if (-not $contentType.StartsWith("application/json")) {
      Write-Host "[FAIL] $ep -> Content-Type $contentType (expected application/json)"
      $failed = $true
      continue
    }

    $json = $null
    try { $json = $res.Content | ConvertFrom-Json } catch {}
    if ($ep -eq "/api/health" -and ($null -eq $json -or $json.ok -ne $true)) {
      Write-Host "[FAIL] /api/health -> response not OK"
      $failed = $true
      continue
    }

    Write-Host "[OK]   $ep"
  }
  catch {
    Write-Host "[FAIL] $ep -> $($_.Exception.Message)"
    $failed = $true
  }
}

if ($failed) {
  Write-Host "[RESULT] HEALTH CHECK FAILED"
  exit 1
}

Write-Host "[RESULT] HEALTH CHECK OK"
exit 0
