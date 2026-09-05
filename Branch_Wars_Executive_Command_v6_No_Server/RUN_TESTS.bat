@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. The game does not require Node.js to play.
  echo Tests are optional developer checks only.
  pause
  exit /b 1
)
node tools\build_reference.js --check
if errorlevel 1 goto :stale
node tests\capture_baseline.js
if errorlevel 1 goto :failed
node tests\release_balance.test.js --report
if errorlevel 1 goto :failed
echo.
echo All Branch Wars tests passed.
pause
exit /b 0

:stale
echo.
echo GAME_REFERENCE.md is out of date with the engine.
echo Rebuild it with:  node tools\build_reference.js
pause
exit /b 1

:failed
echo.
echo One or more Branch Wars tests failed.
pause
exit /b 1
