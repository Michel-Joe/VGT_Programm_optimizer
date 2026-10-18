@echo off
cd /d "%~dp0"
python --version >nul 2>&1
if not errorlevel 1 (
  python app.py
  if errorlevel 1 pause
  exit /b
)
py -3 --version >nul 2>&1
if not errorlevel 1 (
  py -3 app.py
  if errorlevel 1 pause
  exit /b
)
set "VGT_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%VGT_PYTHON%" (
  "%VGT_PYTHON%" app.py
  if errorlevel 1 pause
  exit /b
)
echo Python 3.10 oder neuer wurde nicht gefunden. Bitte Python installieren.
pause
