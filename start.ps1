# Mata processos travados nas portas antes de iniciar
$ports = @(8001)
foreach ($port in $ports) {
    $pids = (netstat -ano | Select-String ":$port\s" | ForEach-Object { ($_ -split '\s+')[-1] }) | Sort-Object -Unique
    foreach ($pid in $pids) {
        if ($pid -match '^\d+$' -and $pid -ne '0') {
            Write-Host "Encerrando PID $pid na porta $port..."
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
}

uvicorn main:app --port 8001 --reload
