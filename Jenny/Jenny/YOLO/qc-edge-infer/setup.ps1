$ErrorActionPreference = "Stop"

# Always run from project root
Set-Location $PSScriptRoot

# 1) Ensure Python 3.10 is available
py -3.10 -V

# 2) Create venv if missing
if (-not (Test-Path ".\.venv")) {
  Write-Host "[INFO] Creating venv..."
  py -3.10 -m venv .venv
}

# 3) Activate venv
Write-Host "[INFO] Activating venv..."
.\.venv\Scripts\Activate.ps1

# 4) Upgrade pip
Write-Host "[INFO] Upgrading pip..."
python -m pip install --upgrade pip

# 5) Install deps
Write-Host "[INFO] Installing requirements..."
pip install -r requirements.txt

# 6) Quick sanity check
python -c "import ultralytics, torch; print('ultralytics', ultralytics.__version__); print('torch', torch.__version__); print('cuda', torch.cuda.is_available())"

Write-Host "[OK] Setup finished."
