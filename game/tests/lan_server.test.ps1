$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$serverScript = Join-Path $root 'BRANCH_WARS_LAN_SERVER.ps1'

$probe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$probe.Start()
$port = ([Net.IPEndPoint]$probe.LocalEndpoint).Port
$probe.Stop()

$process = $null
try {
    $arguments = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', ('"' + $serverScript + '"'),
        '-Port', $port,
        '-NoBrowser',
        '-LoopbackOnly'
    )
    $process = Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -WindowStyle Hidden -PassThru
    $base = "http://127.0.0.1:$port"
    $health = $null
    for ($attempt = 0; $attempt -lt 40 -and -not $health; $attempt++) {
        Start-Sleep -Milliseconds 125
        try { $health = Invoke-RestMethod -Uri "$base/api/health" -TimeoutSec 2 } catch { }
    }
    if (-not $health.ok) { throw 'LAN test server did not become healthy.' }
    if ($health.version -ne '8.0') { throw "Unexpected LAN server version $($health.version)." }

    $hostRoom = Invoke-RestMethod -Method Post -Uri "$base/api/create" -ContentType 'application/json' -Body '{"hostName":"Host Test Bank"}'
    $guestBody = @{ room = $hostRoom.room; name = 'Guest Test Bank' } | ConvertTo-Json -Compress
    $guest = Invoke-RestMethod -Method Post -Uri "$base/api/join" -ContentType 'application/json' -Body $guestBody

    $clientId = [guid]::NewGuid().ToString('N')
    $messageBody = @{ room = $hostRoom.room; token = $guest.token; clientId = $clientId; message = @{ type = 'hello'; name = 'Guest Test Bank' } } | ConvertTo-Json -Depth 8 -Compress
    $first = Invoke-RestMethod -Method Post -Uri "$base/api/send" -ContentType 'application/json' -Body $messageBody
    $duplicate = Invoke-RestMethod -Method Post -Uri "$base/api/send" -ContentType 'application/json' -Body $messageBody
    if (-not $first.ok -or -not $duplicate.ok -or -not $duplicate.duplicate) { throw 'Duplicate LAN message was not acknowledged idempotently.' }
    if ($first.seq -ne $duplicate.seq) { throw 'Duplicate LAN message received a second sequence number.' }

    $poll = Invoke-RestMethod -Uri "$base/api/poll?room=$($hostRoom.room)&token=$($hostRoom.token)&after=0" -TimeoutSec 2
    if (@($poll.messages).Count -ne 1) { throw "Host received $(@($poll.messages).Count) copies of one guest message." }
    if ($poll.messages[0].message.type -ne 'hello') { throw 'LAN relay changed the message payload.' }

    Write-Host 'Branch Wars PowerShell LAN server tests passed: health, create, join, relay, and retry deduplication.' -ForegroundColor Green
} finally {
    if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
}
