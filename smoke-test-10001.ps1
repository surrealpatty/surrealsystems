# smoke-test.ps1
# Usage: .\smoke-test.ps1
$ErrorActionPreference = 'Stop'

$ApiRoot = 'http://localhost:10001/api'
$ts = (Get-Date).ToString('yyyyMMddHHmmss')

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

Write-Host "1) Health check..."
try {
    $health = Invoke-Api -Method 'Get' -Path 'health'
    if ($health.ok -ne $true) {
        Write-Host "Health check returned not-ok: $($health | ConvertTo-Json -Depth 4)"
        exit 1
    }
    Write-Host "Health OK. ts: $($health.ts)"
} catch {
    Write-Host "Health check failed: $($_ | Out-String)"
    exit 1
}

# Create two unique users: A = sender, B = recipient
$userAPrefix = "smoketest_$ts"
$emailA = "smokeA_$ts@example.com"
$password = "password123"

$userBPrefix = "smoketest_recv_$ts"
$emailB = "smokeB_$ts@example.com"

Write-Host "`n2) Register user A (sender): $userAPrefix / $emailA"
try {
    $regA = Invoke-Api -Method 'Post' -Path 'users/register' -Body @{
        username = $userAPrefix
        email    = $emailA
        password = $password
    }
    $tokenA = $regA.token
    $userA = $regA.user
    Write-Host "Registered A: id=$($userA.id) username=$($userA.username) token-present=$([bool]$tokenA)"
} catch {
    Write-Host "Register A failed. Error:`n$($_ | Out-String)"
    exit 1
}

Write-Host "`n3) Register user B (recipient): $userBPrefix / $emailB"
try {
    $regB = Invoke-Api -Method 'Post' -Path 'users/register' -Body @{
        username = $userBPrefix
        email    = $emailB
        password = $password
    }
    $tokenB = $regB.token
    $userB = $regB.user
    Write-Host "Registered B: id=$($userB.id) username=$($userB.username) token-present=$([bool]$tokenB)"
} catch {
    Write-Host "Register B failed. Error:`n$($_ | Out-String)"
    exit 1
}

# Create a project as user A
Write-Host "`n4) Create a project as user A..."
try {
    $projectResp = Invoke-Api -Method 'Post' -Path 'projects' -Body @{
        title = "Smoke project $ts"
        description = "Smoke-test project created at $ts"
        price = 25.00
    } -Token $tokenA

    if ($projectResp.project) {
        $svc = $projectResp.project
        Write-Host "project created: id=$($svc.id) title=$($svc.title) price=$($svc.price)"
    } else {
        Write-Host "Unexpected project response: $($projectResp | ConvertTo-Json -Depth 4)"
    }
} catch {
    Write-Host "Create project failed: $($_ | Out-String)"
    exit 1
}

# Send a message from A -> B
Write-Host "`n5) Send message from A -> B..."
try {
    $msgResp = Invoke-Api -Method 'Post' -Path 'messages' -Body @{
        to = [int]$userB.id
        content = "Hello from smoke test at $ts"
    } -Token $tokenA

    Write-Host "Message response: $($msgResp | ConvertTo-Json -Depth 4)"
} catch {
    Write-Host "Send message failed: $($_ | Out-String)"
    exit 1
}

# Show / verify logged-in user (A)
Write-Host "`n6) Verify /users/me for A..."
try {
    $me = Invoke-Api -Method 'Get' -Path 'users/me' -Token $tokenA
    Write-Host "Me (A): $($me.user | ConvertTo-Json -Depth 4)"
} catch {
    Write-Host "Failed to fetch /users/me: $($_ | Out-String)"
}

Write-Host "`nSmoke test completed successfully."
Write-Host "Summary:"
Write-Host "  User A: id=$($userA.id) username=$($userA.username) email=$emailA"
Write-Host "  User B: id=$($userB.id) username=$($userB.username) email=$emailB"
Write-Host "  project: id=$($svc.id) title=$($svc.title) price=$($svc.price)"
Write-Host "`nTokens (A/B):"
Write-Host "  tokenA present: $([bool]$tokenA)"
Write-Host "  tokenB present: $([bool]$tokenB)"
