param(
  [string]$ApiRoot = "http://localhost:10001/api"
)

$ErrorActionPreference = 'Stop'

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    $Body = $null,
    [string]$Token = $null
  )
  $uri = "$ApiRoot/$Path"
  $headers = @{}
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }

  if ($Body -ne $null) {
    $json = $Body | ConvertTo-Json -Depth 6
    return Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -ContentType 'application/json' -Body $json
  } else {
    return Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
  }
}

Write-Host "API root: $ApiRoot"
Write-Host "1) Health check..."
$health = Invoke-Api -Method 'Get' -Path 'health'
if ($health.ok -ne $true) { throw "Health check failed: $($health | ConvertTo-Json -Depth 4)" }
Write-Host "Health OK. ts: $($health.ts)"

# Register rater
$ts = (Get-Date).ToString('yyyyMMddHHmmss')
$raterPayload = @{
  username = "auto_rater_$ts"
  email    = "auto_rater_$ts@example.com"
  password = "password123"
} | ConvertTo-Json

Write-Host "`n2) Register rater..."
$regR = Invoke-Api -Method 'Post' -Path 'users/register' -Body ($raterPayload | ConvertFrom-Json)
$RATER_ID = $regR.user.id
$TOKEN = $regR.token
Write-Host "Rater id=$RATER_ID token present=$([bool]$TOKEN)"

# Register ratee
$ts2 = (Get-Date).ToString('yyyyMMddHHmmss')
$rateePayload = @{
  username = "auto_ratee_$ts2"
  email    = "auto_ratee_$ts2@example.com"
  password = "password123"
} | ConvertTo-Json

Write-Host "`n3) Register ratee..."
$regE = Invoke-Api -Method 'Post' -Path 'users/register' -Body ($rateePayload | ConvertFrom-Json)
$RATEE_ID = $regE.user.id
Write-Host "Ratee id=$RATEE_ID"

# Create a project as rater (authenticated)
Write-Host "`n4) Create a project as rater..."
$projectPayload = @{
  title = "Smoke project $ts"
  description = "Smoke-test project created at $ts"
  price = 25.00
}
$svcResp = Invoke-Api -Method 'Post' -Path 'projects' -Body $projectPayload -Token $TOKEN
if ($svcResp.project) {
  Write-Host "project created id=$($svcResp.project.id) title=$($svcResp.project.title)"
} else {
  Write-Host "Unexpected project response: $($svcResp | ConvertTo-Json -Depth 4)"
}

# Mark rater as paid using Node script (requires DATABASE_URL in env)
Write-Host "`n5) Mark rater as paid (node script)..."
if (-Not (Test-Path .\scripts\make-paid.js -PathType Leaf)) {
  Write-Host "Warning: scripts/make-paid.js not found. Skipping mark-paid step."
} else {
  if (-not $env:DATABASE_URL) {
    Write-Host "Setting DATABASE_URL from .env if present..."
    if (Test-Path .\.env) {
      # naive .env loader for DATABASE_URL only
      $lines = Get-Content .\.env
      foreach ($l in $lines) {
        if ($l -match '^\s*DATABASE_URL\s*=\s*(.+)\s*$') {
          $env:DATABASE_URL = $Matches[1].Trim()
          break
        }
      }
    }
  }
  if (-not $env:DATABASE_URL) {
    Write-Host "DATABASE_URL not set in environment. Please set it before running make-paid.js. Skipping mark-paid."
  } else {
    # run the node script
    Write-Host "Running: node .\scripts\make-paid.js $RATER_ID active 1"
    $proc = Start-Process -FilePath 'node' -ArgumentList ".\scripts\make-paid.js $RATER_ID active 1" -NoNewWindow -Wait -PassThru
    if ($proc.ExitCode -ne 0) {
      Write-Host "make-paid.js exited with code $($proc.ExitCode). Check script output above for errors."
    } else {
      Write-Host "make-paid.js completed."
    }
  }
}

# Post a rating as the rater
Write-Host "`n6) Post rating (rater -> ratee)..."
$ratingPayload = @{
  rateeId = $RATEE_ID
  stars   = 5
  comment = "Automated end-to-end rating: great!"
} | ConvertTo-Json

try {
  $ratingResp = Invoke-Api -Method 'Post' -Path 'ratings' -Body ($ratingPayload | ConvertFrom-Json) -Token $TOKEN
  Write-Host "Rating created:"
  $ratingResp | ConvertTo-Json -Depth 5
  Write-Host "`nEnd-to-end test succeeded."
} catch {
  $r = $_.Exception.Response
  if ($r) {
    $sr = New-Object System.IO.StreamReader($r.GetResponseStream())
    Write-Host "HTTP error body:`n" ($sr.ReadToEnd())
  } else {
    Write-Host "Error: $_"
  }
  exit 1
}
