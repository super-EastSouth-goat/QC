$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Activate venv
.\.venv\Scripts\Activate.ps1

# Read runtime config
$runtime = Get-Content -Raw .\config\runtime.json | ConvertFrom-Json
$bindHost = $runtime.host
$port = $runtime.port

Write-Host "[INFO] Starting service on http://$bindHost`:$port"
python -m uvicorn app.main:app --host $bindHost --port $port
