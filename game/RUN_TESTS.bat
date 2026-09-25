@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. The game does not require Node.js to play.
  echo Tests are optional developer checks only.
  pause
  exit /b 1
)
node tools\check.js --full
if errorlevel 1 goto :failed
echo.
echo All Branch Wars tests passed.
pause
exit /b 0

:failed
echo.
echo One or more Branch Wars tests failed.
pause
exit /b 1
