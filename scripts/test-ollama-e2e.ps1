param(
  [int]$Runs = 3,
  [string]$DocPath = "scripts/fixtures/sample-spec.txt",
  [string]$Framework = "HTML/CSS",
  [string]$ProjectName = "DocDriven",
  [string]$Goal = "Generate a UI based on the uploaded document text",
  [string]$Auth = "none",
  [string]$Styling = "clean",
  [string]$BffBaseUrl = "http://localhost:8081",
  [string]$KeycloakTokenUrl = "http://localhost:8083/realms/ai-ui/protocol/openid-connect/token",
  [string]$Username = "developpeur",
  [string]$Password = "developpeur",
  [string]$ClientId = "ai-ui-cli"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Net.Http

function Get-AccessToken {
  $body = "grant_type=password&client_id=$ClientId&username=$Username&password=$Password"
  $resp = Invoke-RestMethod -Method Post -Uri $KeycloakTokenUrl -ContentType 'application/x-www-form-urlencoded' -Body $body
  if (-not $resp.access_token) {
    throw "No access_token returned by Keycloak"
  }
  return [string]$resp.access_token
}

function New-Prompt {
  return @(
    "Project name: $ProjectName",
    "Framework: $Framework",
    "Goal: $Goal",
    "Auth: $Auth",
    "Styling: $Styling"
  ) -join "`n"
}

function Invoke-Generation([string]$token, [string]$prompt, [string]$docPath) {
  if (-not (Test-Path -Path $docPath)) {
    throw "DocPath not found: $docPath"
  }

  $url = ($BffBaseUrl.TrimEnd('/') + '/api/generations')

  $fileName = [System.IO.Path]::GetFileName($docPath)
  $fileBytes = [System.IO.File]::ReadAllBytes($docPath)

  $handler = New-Object System.Net.Http.HttpClientHandler
  $client = New-Object System.Net.Http.HttpClient($handler)
  try {
    $client.Timeout = [TimeSpan]::FromSeconds(3600)
    $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $token)

    $multipart = New-Object System.Net.Http.MultipartFormDataContent

    $promptContent = New-Object System.Net.Http.StringContent($prompt, [System.Text.Encoding]::UTF8)
    $multipart.Add($promptContent, 'prompt')

    $fileContent = New-Object System.Net.Http.ByteArrayContent(,$fileBytes)
    $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse('text/plain')
    $multipart.Add($fileContent, 'files', $fileName)

    $resp = $client.PostAsync($url, $multipart).GetAwaiter().GetResult()
    $raw = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    if (-not $resp.IsSuccessStatusCode) {
      throw "HTTP $([int]$resp.StatusCode) $($resp.ReasonPhrase): $raw"
    }
    return ($raw | ConvertFrom-Json)
  }
  finally {
    if ($client) { $client.Dispose() }
  }
}

$token = Get-AccessToken
$prompt = New-Prompt

$results = @()
1..$Runs | ForEach-Object {
  $res = Invoke-Generation -token $token -prompt $prompt -docPath $DocPath

  $issuesCount = 0
  if ($res.aiReport -and $res.aiReport.issues) { $issuesCount = @($res.aiReport.issues).Count }

  $fileCount = 0
  if ($res.codeBundle -and $res.codeBundle.files) { $fileCount = @($res.codeBundle.files).Count }
  $filePaths = ""
  if ($fileCount -gt 0) { $filePaths = ($res.codeBundle.files | ForEach-Object { $_.path }) -join ", " }

  $results += [pscustomobject]@{
    run = $_
    llm_provider = $res.aiReport.llm_provider
    title = $res.uiSpec.page.title
    issuesCount = $issuesCount
    files = $fileCount
    filePaths = $filePaths
    total_ms = $res.aiReport.durations.total_ms
    plan_ms = $res.aiReport.durations.plan_ms
    codegen_ms = $res.aiReport.durations.codegen_ms
  }

  if ($issuesCount -gt 0) {
    Write-Host "--- issues (run $_) ---"
    ($res.aiReport.issues | ConvertTo-Json -Depth 10)
  }

  Start-Sleep -Milliseconds 200
}

$results | Format-Table -AutoSize
