param(
  [string]$Prompt = "Build a SaaS analytics dashboard with sidebar, KPI cards, charts, and a data table",
  [string]$Id     = "",
  [string]$FastApiUrl = "http://localhost:8000"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Auto-generate a short readable ID if not provided
if (-not $Id) {
  $Id = "test-" + (Get-Date -Format "yyyyMMdd-HHmmss")
}

$projectDir = Join-Path $PSScriptRoot "..\projects\$Id"

Write-Host ""
Write-Host "======================================"
Write-Host " AI UI Generator - Direct Test"
Write-Host "======================================"
Write-Host " ID      : $Id"
Write-Host " Prompt  : $Prompt"
Write-Host " Output  : $projectDir"
Write-Host "======================================"
Write-Host ""

# Check FastAPI is reachable
try {
  $health = Invoke-RestMethod -Uri "$FastApiUrl/health" -Method Get -TimeoutSec 5
  Write-Host "[OK] FastAPI is up: $($health.status)"
} catch {
  Write-Error "[ERROR] FastAPI not reachable at $FastApiUrl - is Docker running?"
  exit 1
}

# Build request body
$body = @{
  generationId = $Id
  prompt       = $Prompt
  mode         = "full"
  fileRefs     = @()
} | ConvertTo-Json -Depth 5

Write-Host ""
Write-Host "Generating... (this takes 1-3 min depending on file count)"
Write-Host ""

$start = Get-Date

try {
  $response = Invoke-RestMethod `
    -Uri "$FastApiUrl/internal/generate" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body `
    -TimeoutSec 3600
} catch {
  Write-Error "[ERROR] Generation failed: $_"
  exit 1
}

$elapsed = [math]::Round(((Get-Date) - $start).TotalSeconds, 1)

# Print summary
$report   = $response.aiReport
$files    = $response.codeBundle.files
$issues   = $report.issues

Write-Host "======================================"
Write-Host " Done in ${elapsed}s"
Write-Host " Provider : $($report.llm_provider)"
Write-Host " Score    : $($report.score)/100"
Write-Host " Files    : $($files.Count)"
foreach ($f in $files) {
  Write-Host "   - $($f.path)  ($($f.content.Length) chars)"
}
if ($issues.Count -gt 0) {
  Write-Host " Issues   :"
  foreach ($i in $issues) {
    Write-Host "   [$($i.type)] $($i.message)"
  }
}
Write-Host "======================================"
Write-Host ""

# Open index.html in default browser
$indexPath = Join-Path $projectDir "index.html"
if (Test-Path $indexPath) {
  Write-Host "Opening $indexPath ..."
  Start-Process $indexPath
} else {
  Write-Host "[WARN] index.html not found in $projectDir"
}
