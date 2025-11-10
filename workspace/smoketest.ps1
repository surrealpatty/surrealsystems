# smoketest.ps1
$base='http://127.0.0.1:10000'
function Js($o) { $o | ConvertTo-Json -Depth 5 }

Write-Host "Logging in..."
$login = Invoke-RestMethod -Uri "$base/api/users/login" -Method Post `
  -Headers @{ 'Content-Type'='application/json' } `
  -Body (Js @{ email='admin@example.com'; password='adminpass' }) -ErrorAction Stop

if ($login.token) { $token = $login.token } else { $token = $login.data.token }
if (-not $token) { Write-Error "Login failed. Response:`n$(Js $login)"; exit 1 }
Write-Host "Got token (len):" $token.Length

Write-Host "`nGET /api/users/me"
Invoke-RestMethod -Uri "$base/api/users/me" -Method Get -Headers @{ Authorization = "Bearer $token" } | Js | Write-Host

Write-Host "`nCreating service..."
$newService = Invoke-RestMethod -Uri "$base/api/services" -Method Post `
  -Headers @{ 'Content-Type'='application/json'; Authorization = "Bearer $token" } `
  -Body (Js @{ title='PS Smoke Service'; description='Created by smoketest'; price = 42.5 }) -ErrorAction Stop
Write-Host "Created:"; $newService | Js | Write-Host

Write-Host "`nListing services..."
Invoke-RestMethod -Uri "$base/api/services" -Method Get | Js | Write-Host

Write-Host "`nPosting rating..."
# change rateeId to an existing user id if required
$r = Invoke-RestMethod -Uri "$base/api/ratings" -Method Post `
  -Headers @{ 'Content-Type'='application/json'; Authorization = "Bearer $token" } `
  -Body (Js @{ rateeId = 3; stars = 5; comment = 'Great work!' }) -ErrorAction Continue
$r | Js | Write-Host

Write-Host "`nSmoke test completed."
