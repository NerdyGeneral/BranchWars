param([int]$Port = 8765, [switch]$NoBrowser, [switch]$LoopbackOnly)

$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$gameFile = Join-Path $gameRoot 'BRANCH_WARS.html'
$rooms = @{}
$roomAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function New-RoomCode {
    do {
        $code = -join (1..6 | ForEach-Object { $roomAlphabet[(Get-Random -Minimum 0 -Maximum $roomAlphabet.Length)] })
    } while ($rooms.ContainsKey($code))
    return $code
}

function ConvertTo-ResponseBytes([object]$Value) {
    $json = $Value | ConvertTo-Json -Depth 30 -Compress
    return [Text.Encoding]::UTF8.GetBytes($json)
}

function Send-HttpResponse($Stream, [int]$Status, [string]$ContentType, [byte[]]$Body) {
    $reason = switch ($Status) { 200 {'OK'} 204 {'No Content'} 400 {'Bad Request'} 403 {'Forbidden'} 404 {'Not Found'} 409 {'Conflict'} default {'Error'} }
    $header = "HTTP/1.1 $Status $reason`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`nX-Content-Type-Options: nosniff`r`n`r`n"
    $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
    $Stream.Write($headerBytes, 0, $headerBytes.Length)
    if ($Body.Length -gt 0) { $Stream.Write($Body, 0, $Body.Length) }
    $Stream.Flush()
}

function Send-Json($Stream, [int]$Status, [object]$Value) {
    Send-HttpResponse $Stream $Status 'application/json; charset=utf-8' (ConvertTo-ResponseBytes $Value)
}

function Read-HttpRequest($Stream) {
    $bytes = [Collections.Generic.List[byte]]::new()
    $tail = 0
    while ($bytes.Count -lt 65536) {
        $value = $Stream.ReadByte()
        if ($value -lt 0) { break }
        $bytes.Add([byte]$value)
        $tail = (($tail -shl 8) -bor $value) -band 0xffffffffL
        if ($tail -eq 0x0d0a0d0aL) { break }
    }
    if ($bytes.Count -eq 0) { return $null }
    $headerText = [Text.Encoding]::ASCII.GetString($bytes.ToArray())
    $lines = $headerText -split "`r`n"
    $requestParts = $lines[0] -split ' '
    if ($requestParts.Count -lt 2) { throw 'Malformed HTTP request.' }
    $headers = @{}
    foreach ($line in $lines[1..($lines.Count - 1)]) {
        $colon = $line.IndexOf(':')
        if ($colon -gt 0) { $headers[$line.Substring(0, $colon).Trim().ToLowerInvariant()] = $line.Substring($colon + 1).Trim() }
    }
    $length = if ($headers.ContainsKey('content-length')) { [int]$headers['content-length'] } else { 0 }
    if ($length -gt 1048576) { throw 'Request body is too large.' }
    $bodyBytes = [byte[]]::new($length)
    $offset = 0
    while ($offset -lt $length) {
        $count = $Stream.Read($bodyBytes, $offset, $length - $offset)
        if ($count -le 0) { break }
        $offset += $count
    }
    if ($offset -ne $length) { throw 'Incomplete HTTP request body.' }
    return [pscustomobject]@{ Method = $requestParts[0].ToUpperInvariant(); Target = $requestParts[1]; Body = [Text.Encoding]::UTF8.GetString($bodyBytes) }
}

function Parse-Query([string]$Query) {
    $values = @{}
    foreach ($part in $Query.TrimStart('?') -split '&') {
        if (-not $part) { continue }
        $pair = $part -split '=', 2
        $key = [Uri]::UnescapeDataString($pair[0].Replace('+', ' '))
        $value = if ($pair.Count -gt 1) { [Uri]::UnescapeDataString($pair[1].Replace('+', ' ')) } else { '' }
        $values[$key] = $value
    }
    return $values
}

function Get-RoomAndRole([string]$Code, [string]$Token) {
    $normalized = $Code.Trim().ToUpperInvariant()
    if (-not $rooms.ContainsKey($normalized)) { throw 'Room not found.' }
    $room = $rooms[$normalized]
    $role = if ($Token -eq $room.HostToken) { 'host' } elseif ($Token -eq $room.GuestToken) { 'guest' } else { '' }
    if (-not $role) { throw 'Invalid room token.' }
    return [pscustomobject]@{ Room = $room; Role = $role; Code = $normalized }
}

function Handle-Request($Stream, $Request) {
    $uri = [Uri]("http://branch-wars.local" + $Request.Target)
    $path = $uri.AbsolutePath
    $query = Parse-Query $uri.Query

    if ($Request.Method -eq 'GET' -and ($path -eq '/' -or $path -eq '/BRANCH_WARS.html')) {
        $body = [IO.File]::ReadAllBytes($gameFile)
        Send-HttpResponse $Stream 200 'text/html; charset=utf-8' $body
        return
    }
    if ($Request.Method -eq 'GET' -and $path -eq '/api/health') {
        Send-Json $Stream 200 @{ ok = $true; version = '7.1'; rooms = $rooms.Count }
        return
    }
    if ($Request.Method -eq 'GET' -and $path -eq '/favicon.ico') {
        Send-HttpResponse $Stream 204 'image/x-icon' ([byte[]]::new(0))
        return
    }
    if ($Request.Method -eq 'POST' -and $path -eq '/api/create') {
        $payload = $Request.Body | ConvertFrom-Json
        foreach ($oldCode in @($rooms.Keys)) {
            if (([DateTime]::UtcNow - $rooms[$oldCode].Touched).TotalHours -gt 12) { [void]$rooms.Remove($oldCode) }
        }
        $code = New-RoomCode
        $room = [pscustomobject]@{
            Code = $code
            HostToken = [guid]::NewGuid().ToString('N')
            GuestToken = ''
            HostName = [string]$payload.hostName
            GuestName = ''
            NextSequence = 1
            Messages = [Collections.ArrayList]::new()
            Created = [DateTime]::UtcNow
            Touched = [DateTime]::UtcNow
            SeenIds = @{ host = @{}; guest = @{} }
        }
        $rooms[$code] = $room
        Send-Json $Stream 200 @{ room = $code; token = $room.HostToken }
        Write-Host "Room $code created by $($room.HostName)." -ForegroundColor Cyan
        return
    }
    if ($Request.Method -eq 'POST' -and $path -eq '/api/join') {
        $payload = $Request.Body | ConvertFrom-Json
        $code = ([string]$payload.room).Trim().ToUpperInvariant()
        if (-not $rooms.ContainsKey($code)) { Send-Json $Stream 404 @{ error = 'Room not found.' }; return }
        $room = $rooms[$code]
        if ($room.GuestToken) { Send-Json $Stream 409 @{ error = 'That room already has two institutions.' }; return }
        $room.GuestToken = [guid]::NewGuid().ToString('N')
        $room.GuestName = [string]$payload.name
        $room.Touched = [DateTime]::UtcNow
        Send-Json $Stream 200 @{ room = $code; token = $room.GuestToken }
        Write-Host "$($room.GuestName) joined room $code." -ForegroundColor Green
        return
    }
    if ($Request.Method -eq 'POST' -and $path -eq '/api/send') {
        $payload = $Request.Body | ConvertFrom-Json
        try { $auth = Get-RoomAndRole ([string]$payload.room) ([string]$payload.token) } catch { Send-Json $Stream 403 @{ error = $_.Exception.Message }; return }
        $clientId = ([string]$payload.clientId).Trim()
        $seen = $auth.Room.SeenIds[$auth.Role]
        if ($clientId -and $seen.ContainsKey($clientId)) {
            Send-Json $Stream 200 @{ ok = $true; seq = $seen[$clientId]; duplicate = $true }
            return
        }
        $item = [pscustomobject]@{ seq = $auth.Room.NextSequence; sender = $auth.Role; message = $payload.message }
        $auth.Room.NextSequence++
        [void]$auth.Room.Messages.Add($item)
        if ($clientId) { $seen[$clientId] = $item.seq }
        if ($auth.Room.Messages.Count -gt 256) { $auth.Room.Messages.RemoveRange(0, $auth.Room.Messages.Count - 256) }
        $auth.Room.Touched = [DateTime]::UtcNow
        Send-Json $Stream 200 @{ ok = $true; seq = $item.seq }
        return
    }
    if ($Request.Method -eq 'GET' -and $path -eq '/api/poll') {
        try { $auth = Get-RoomAndRole ([string]$query.room) ([string]$query.token) } catch { Send-Json $Stream 403 @{ error = $_.Exception.Message }; return }
        $after = 0
        [void][int]::TryParse([string]$query.after, [ref]$after)
        $messages = @($auth.Room.Messages | Where-Object { $_.seq -gt $after -and $_.sender -ne $auth.Role })
        $auth.Room.Touched = [DateTime]::UtcNow
        Send-Json $Stream 200 @{ messages = $messages; connected = [bool]$auth.Room.GuestToken }
        return
    }
    Send-Json $Stream 404 @{ error = 'Route not found.' }
}

if (-not (Test-Path -LiteralPath $gameFile -PathType Leaf)) { throw "Missing game file: $gameFile" }

$listener = $null
$listenAddress = if ($LoopbackOnly) { [Net.IPAddress]::Loopback } else { [Net.IPAddress]::Any }
foreach ($candidate in $Port..($Port + 10)) {
    try {
        $listener = [Net.Sockets.TcpListener]::new($listenAddress, $candidate)
        $listener.Start()
        $Port = $candidate
        break
    } catch { $listener = $null }
}
if (-not $listener) { throw 'Could not open a LAN port between 8765 and 8775.' }

# DNS returns adapters in no useful order, so a VPN, Hyper-V, WSL, Docker or
# VirtualBox address is often first and is unreachable from another desk. Prefer
# the adapter carrying the default route, then list the rest as fallbacks.
$ranked = New-Object System.Collections.Generic.List[string]
try {
    Get-NetIPConfiguration -ErrorAction Stop |
        Where-Object { $_.NetAdapter.Status -eq 'Up' -and $_.IPv4DefaultGateway -and $_.IPv4Address } |
        Sort-Object { $_.NetIPInterface.InterfaceMetric } |
        ForEach-Object {
            foreach ($address in @($_.IPv4Address)) { $ranked.Add($address.IPAddress) }
        }
} catch { }
try {
    Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop |
        Sort-Object { $_.RouteMetric + $_.InterfaceMetric } |
        ForEach-Object {
            Get-NetIPAddress -InterfaceIndex $_.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
                Where-Object { $_.AddressState -eq 'Preferred' -and -not $_.SkipAsSource } |
                ForEach-Object { $ranked.Add($_.IPAddress) }
        }
} catch { }
try {
    [Net.Dns]::GetHostAddresses([Net.Dns]::GetHostName()) |
        Where-Object { $_.AddressFamily -eq [Net.Sockets.AddressFamily]::InterNetwork } |
        ForEach-Object { $ranked.Add($_.IPAddressToString) }
} catch { }

$addresses = New-Object System.Collections.Generic.List[string]
foreach ($ip in $ranked) {
    if ($ip -and $ip -ne '0.0.0.0' -and -not $ip.StartsWith('127.') -and -not $ip.StartsWith('169.254.') -and -not $addresses.Contains($ip)) {
        $addresses.Add($ip)
    }
}
$lanAddress = if ($addresses.Count -gt 0) { $addresses[0] } else { 'THIS-COMPUTER-IP' }

$networkProfile = ''
try { $networkProfile = (Get-NetConnectionProfile -ErrorAction Stop | ForEach-Object { $_.NetworkCategory }) -join ', ' } catch { }
$localUrl = "http://127.0.0.1:$Port/"
$lanUrl = "http://${lanAddress}:$Port/"

Clear-Host
Write-Host '============================================================' -ForegroundColor DarkCyan
Write-Host ' BRANCH WARS v7.1 // LOCAL INTRANET SERVER' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor DarkCyan
Write-Host "Host browser:  $localUrl"
Write-Host "Friends join:  $lanUrl" -ForegroundColor Yellow
if ($addresses.Count -gt 1) {
    Write-Host 'Other possible addresses:'
    foreach ($address in ($addresses | Select-Object -Skip 1)) { Write-Host "  http://${address}:$Port/" }
    Write-Host 'If the yellow address does not work, try those from the other computer.'
} elseif ($addresses.Count -eq 0) {
    Write-Host 'No LAN address detected. Run ipconfig and use the IPv4 address of your active adapter.' -ForegroundColor Red
}
Write-Host ''
Write-Host "Test it from the other computer first:  ${lanUrl}api/health" -ForegroundColor DarkCyan
Write-Host 'That should return {"ok":true}. If it times out, the address or the'
Write-Host 'firewall is the problem, not the game.'
Write-Host ''
Write-Host 'Keep this window open during the game. Press Ctrl+C to stop.'
if ($networkProfile) { Write-Host "Active network profile: $networkProfile" }
Write-Host 'A Windows Firewall prompt may appear the first time; allow only'
Write-Host 'the network profiles where you intend to play. If no prompt appears'
Write-Host 'and friends cannot connect, run this once in an ADMIN PowerShell:'
Write-Host "  New-NetFirewallRule -DisplayName 'Branch Wars LAN' -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Domain,Private" -ForegroundColor Yellow
Write-Host '============================================================' -ForegroundColor DarkCyan
if (-not $NoBrowser) { Start-Process $localUrl }

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $client.ReceiveTimeout = 10000
        $client.SendTimeout = 10000
        $stream = $client.GetStream()
        try {
            $request = Read-HttpRequest $stream
            if ($request) { Handle-Request $stream $request }
        } catch {
            try { Send-Json $stream 400 @{ error = $_.Exception.Message } } catch {}
        } finally {
            $stream.Dispose()
            $client.Dispose()
        }
    }
} finally {
    $listener.Stop()
}
