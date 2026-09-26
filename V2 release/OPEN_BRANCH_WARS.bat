@echo off
cd /d "%~dp0"
title Branch Wars - Executive Command

rem Work out this computer's LAN address and hand it to the page. Browsers hide
rem local addresses from web pages (mDNS obfuscation), which stops a direct link
rem forming between two different subnets. Supplying it here is the player
rem volunteering their own address to their own opponent, and it saves them
rem running ipconfig and typing it in. If anything below fails the game simply
rem opens without it and the address can still be entered by hand.
set "LANIP="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='SilentlyContinue';" ^
  "$ips=@();" ^
  "Get-NetRoute -DestinationPrefix '0.0.0.0/0' ^| Sort-Object { $_.RouteMetric + $_.InterfaceMetric } ^| ForEach-Object { Get-NetIPAddress -InterfaceIndex $_.ifIndex -AddressFamily IPv4 ^| Where-Object { $_.AddressState -eq 'Preferred' -and -not $_.SkipAsSource } ^| ForEach-Object { $ips += $_.IPAddress } };" ^
  "if (-not $ips) { $ips = [Net.Dns]::GetHostAddresses([Net.Dns]::GetHostName()) ^| Where-Object { $_.AddressFamily -eq 'InterNetwork' } ^| ForEach-Object { $_.IPAddressToString } };" ^
  "($ips ^| Where-Object { $_ -ne '0.0.0.0' -and $_ -notlike '127.*' -and $_ -notlike '169.254.*' } ^| Select-Object -Unique -First 1)"`) do set "LANIP=%%I"

if defined LANIP (
  echo Direct-link address for this computer: %LANIP%
  set "GAMEURL="
  set "GAMEFILE=%~dp0BRANCH_WARS.html"
  set "GAMEIP=%LANIP%"
  for /f "usebackq delims=" %%U in (`powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$path=(Resolve-Path -LiteralPath $env:GAMEFILE).Path;" ^
    "$uri=([Uri]$path).AbsoluteUri + '#lanip=' + [Uri]::EscapeDataString($env:GAMEIP);" ^
    "$uri"`) do set "GAMEURL=%%U"
  if defined GAMEURL (
    start "" "%GAMEURL%"
  ) else (
    echo Could not build the direct-link URL. The game will open normally.
    start "" "%~dp0BRANCH_WARS.html"
  )
) else (
  echo Could not detect a LAN address. The game will open normally.
  start "" "%~dp0BRANCH_WARS.html"
)
exit /b 0
