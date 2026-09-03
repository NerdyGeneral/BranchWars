@echo off
cd /d "%~dp0"
title Branch Wars v7.1 - Local Intranet Server
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0BRANCH_WARS_LAN_SERVER.ps1"
echo.
echo The Branch Wars LAN server has stopped.
pause
