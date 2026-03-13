param(
  [string]$Id = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectsDir = Join-Path $PSScriptRoot "..\projects"

# If no ID given, pick the most recently modified project
if (-not $Id) {
  $latest = Get-ChildItem -Path $projectsDir -Directory |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
  if (-not $latest) {
    Write-Error "No projects found in $projectsDir"
    exit 1
  }
  $Id = $latest.Name
  Write-Host "No ID specified — using latest project: $Id"
}

$projectDir = Join-Path $projectsDir $Id

if (-not (Test-Path $projectDir)) {
  Write-Error "Project not found: $projectDir"
  exit 1
}

# List all files in the project
Write-Host ""
Write-Host "======================================"
Write-Host " Project: $Id"
Write-Host " Path   : $projectDir"
Write-Host "======================================"
Get-ChildItem $projectDir | ForEach-Object {
  Write-Host "   $($_.Name)  ($([math]::Round($_.Length / 1KB, 1)) KB)"
}
Write-Host "======================================"
Write-Host ""

# Open index.html in browser
$indexPath = Join-Path $projectDir "index.html"
if (Test-Path $indexPath) {
  Write-Host "Opening in browser: $indexPath"
  Start-Process $indexPath
} else {
  Write-Host "[WARN] No index.html found — opening folder instead"
  Start-Process $projectDir
}

Write-Host ""
Write-Host "Tip: Edit files in VS Code and just refresh the browser tab."
Write-Host "  code `"$projectDir`""
Write-Host ""

# Open project folder in VS Code if available
$vscodePath = Get-Command code -ErrorAction SilentlyContinue
if ($vscodePath) {
  $answer = Read-Host "Open project in VS Code? [y/N]"
  if ($answer -eq 'y' -or $answer -eq 'Y') {
    code $projectDir
  }
}
