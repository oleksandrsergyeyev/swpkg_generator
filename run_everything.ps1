# --- config (edit if paths change) ---
$win      = 0
$root     = 'C:\projects\swpkg_generator'
$backend  = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$venvAct  = Join-Path $root '.venv\Scripts\Activate.ps1'
$pyVenv   = Join-Path $root '.venv\Scripts\python.exe'

# --- backend: new tab, activate venv, run uvicorn (no semicolons) ---
wt -w $win new-tab -d $backend powershell -NoExit -Command "Set-Location -LiteralPath '$backend' `n . '$venvAct' `n & '$pyVenv' -m uvicorn main:app --reload --port 8000"

# --- frontend: split pane, run npm start (no semicolons) ---
wt -w $win split-pane -H -d $frontend powershell -NoExit -Command "Set-Location -LiteralPath '$frontend' `n npm start"
