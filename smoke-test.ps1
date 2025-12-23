# smoke-test.ps1
# Run from repo root PowerShell. Requires docker-compose up running the stack.

$ErrorActionPreference = 'Stop'

# Config
$baseUrl = 'http://localhost:10002'
$dbContainer = 'Surreal Systems-db-1'
$dbName = 'Surreal Systems_test'

# Make unique suffix so we don't clash with prior runs
$suffix = (Get-Date -UFormat %s)

# Test users
$user1 = @{
  username = "smoketest1_$suffix"
  email    = "smoketest1_$suffix@example.com"
  password = "Password123!"
  description = "smoke1"
}
$user2 = @{
  username = "smoketest2_$suffix"
  email    = "smoketest2_$suffix@example.com"
  password = "Password123!"
  description = "smoke2"
}

function RegisterOrLogin($u) {
  $body = $u | ConvertTo-Json
  try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/api/users/register" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 30
    if ($resp.success) {
      Write-Host "Registered $($u.username) id=$($resp.user.id)"
      return $resp
    } else {
      throw "Register failed"
    }
  } catch {
    Write-Host "Register failed or user exists. Trying login for $($u.email)..."
    $loginBody = @{ email = $u.email; password = $u.password } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "$baseUrl/api/users/login" -Method Post -ContentType 'application/json' -Body $loginBody -TimeoutSec 30
    if ($resp.success) {
      Write-Host "Logged in $($u.email)"
      return $resp
    } else {
      throw "Login failed for $($u.email): $($_.Exception.Message)"
    }
  }
}

# 1) Register or login users
$resp1 = RegisterOrLogin $user1
$token1 = if ($resp1.token) { $resp1.token } elseif ($resp1.data -and $resp1.data.token) { $resp1.data.token } else { $null }
$user1Id = if ($resp1.user -and $resp1.user.id) { $resp1.user.id } elseif ($resp1.data -and $resp1.data.user -and $resp1.data.user.id) { $resp1.data.user.id } else { throw "Cannot get user1 id" }

$resp2 = RegisterOrLogin $user2
$token2 = if ($resp2.token) { $resp2.token } elseif ($resp2.data -and $resp2.data.token) { $resp2.data.token } else { $null }
$user2Id = if ($resp2.user -and $resp2.user.id) { $resp2.user.id } elseif ($resp2.data -and $resp2.data.user -and $resp2.data.user.id) { $resp2.data.user.id } else { throw "Cannot get user2 id" }

Write-Host "User1: id=$user1Id, token len=$($token1.Length)"
Write-Host "User2: id=$user2Id, token len=$($token2.Length)"

# Prepare headers
$headers1 = @{ Authorization = "Bearer $token1" }
$headers2 = @{ Authorization = "Bearer $token2" }

# 2) Create a project as user1
$svcBody = @{ title = "Test project $suffix"; description = "Test desc"; price = 25 } | ConvertTo-Json
$svcResp = Invoke-RestMethod -Uri "$baseUrl/api/projects" -Method Post -ContentType 'application/json' -Headers $headers1 -Body $svcBody
Write-Host "Create project response: $($svcResp | ConvertTo-Json -Depth 2)"

# 3) Send a message (content must be a string)
$msg = @{
  to = $user2Id
  content = "Subject: Hi`nHello from $($user1.username)"
} | ConvertTo-Json -Depth 3
$msgResp = Invoke-RestMethod -Uri "$baseUrl/api/messages" -Method Post -ContentType 'application/json' -Headers $headers1 -Body $msg
Write-Host "Message response: $($msgResp | ConvertTo-Json -Depth 2)"

# 4) Insert active billing row for user1 (use SQL piped into psql to avoid quoting pain)
$sqlInsertBilling = @"
INSERT INTO "billings" ("userId","stripeCustomerId","stripeSubscriptionId","status","priceId","currentPeriodEnd","createdAt","updatedAt")
VALUES ($user1Id, 'cst_mock', 'sub_mock', 'active', NULL, NOW(), NOW(), NOW());
"@

Write-Host "Inserting test billing for userId=$user1Id..."
$null = $sqlInsertBilling | docker exec -i $dbContainer psql -U postgres -d $dbName -q

# 5) Verify billing row
$sqlCheckBilling = "SELECT ""id"",""userId"",""status"",""stripeCustomerId"",""createdAt"" FROM ""billings"" WHERE ""userId"" = $user1Id ORDER BY ""createdAt"" DESC LIMIT 5;"
Write-Host "Checking billing rows:"
$null = $sqlCheckBilling | docker exec -i $dbContainer psql -U postgres -d $dbName

# 6) Post a rating from user1 -> user2
$rateBody = @{ rateeId = $user2Id; stars = 5; comment = 'Great!' } | ConvertTo-Json
$rateResp = Invoke-RestMethod -Uri "$baseUrl/api/ratings" -Method Post -ContentType 'application/json' -Headers $headers1 -Body $rateBody -TimeoutSec 30
Write-Host "Rate response: $($rateResp | ConvertTo-Json -Depth 4)"

# 7) Verify rating row in DB
$sqlCheckRating = "SELECT ""id"",""raterId"",""rateeId"",""stars"",""comment"",""createdAt"" FROM ""ratings"" WHERE ""raterId"" = $user1Id ORDER BY ""createdAt"" DESC LIMIT 5;"
Write-Host "Checking ratings rows:"
$null = $sqlCheckRating | docker exec -i $dbContainer psql -U postgres -d $dbName

# 8) Optional cleanup prompt
Write-Host ""
$response = Read-Host "Remove test billing and rating rows? (y/n)"
if ($response -match '^[Yy]') {
  $sqlDelBilling = "DELETE FROM ""billings"" WHERE ""userId"" = $user1Id AND ""stripeCustomerId"" = 'cst_mock';"
  $sqlDelRating  = "DELETE FROM ""ratings"" WHERE ""raterId"" = $user1Id AND ""rateeId"" = $user2Id AND ""comment"" = 'Great!';"
  Write-Host "Deleting billing..."
  $sqlDelBilling | docker exec -i $dbContainer psql -U postgres -d $dbName -q
  Write-Host "Deleting rating..."
  $sqlDelRating  | docker exec -i $dbContainer psql -U postgres -d $dbName -q
  Write-Host "Cleanup done."
} else {
  Write-Host "Kept test data."
}

Write-Host "`nSmoke test finished."
