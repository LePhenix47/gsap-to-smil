<#
  One-time (or repeat) setup for Windows:
  - Global commands: deepseek, deepseek-init (in %USERPROFILE%\.local\bin)
  - Saves repo path → %USERPROFILE%\.local\share\free-claude-code\repo.txt
  - User env: FREE_CLAUDE_CODE_HOME
  - Prepends .local\bin to user PATH + Git Bash ~/.bashrc
  - Startup shortcut (per-user): starts uvicorn proxy at logon (127.0.0.1:8082), hidden window

  Run from this repo (PowerShell):
    .\install-windows-global.ps1
  Or with an explicit clone path:
    .\install-windows-global.ps1 -RepoRoot "D:\repos\free-claude-code"

  Then open a NEW terminal anywhere:
    deepseek

  Repair / change clone path:
    deepseek-init -RepoRoot "C:\new\path\to\free-claude-code"
#>
param(
    [string] $RepoRoot = ""
)
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = $PSScriptRoot
}

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path.TrimEnd("\")

function ConvertTo-MsysPath([string] $winPath) {
    $norm = $winPath.TrimEnd("\") -replace "\\", "/"
    if ($norm -match "^([A-Za-z]):/(.*)$") {
        return "/" + $Matches[1].ToLowerInvariant() + "/" + $Matches[2]
    }
    throw "Cannot convert path: $winPath"
}

function Write-LfUtf8NoBom([string] $Path, [string] $Content) {
    $enc = New-Object System.Text.UTF8Encoding $false
    $n = $Content -replace "`r`n", "`n" -replace "`r", "`n"
    [System.IO.File]::WriteAllText($Path, $n, $enc)
}

function Set-GitBashExecutableBit([string] $MsysBinDir) {
    $candidates = @(
        (Join-Path ${env:ProgramFiles} "Git\bin\bash.exe"),
        (Join-Path ${env:ProgramFiles(x86)} "Git\bin\bash.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Git\bin\bash.exe")
    ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $candidates) { return }
    & $candidates -lc "chmod +x '$MsysBinDir/deepseek' '$MsysBinDir/deepseek-init' 2>/dev/null || true"
}

function Install-FccProxyStartupShortcut([string] $proxyPs1Path) {
    # Per-user Startup folder (no admin; ScheduledTask often hits Access denied).
    $startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
    if (-not (Test-Path -LiteralPath $startup)) {
        New-Item -ItemType Directory -Force -Path $startup | Out-Null
    }
    $lnkPath = Join-Path $startup "FreeClaudeCode-DeepSeek-Proxy.lnk"
    $ws = New-Object -ComObject WScript.Shell
    $sc = $ws.CreateShortcut($lnkPath)
    $sc.TargetPath = "powershell.exe"
    $sc.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$proxyPs1Path`""
    $sc.WindowStyle = 7
    $sc.Description = "Start free-claude-code proxy for Claude Code + DeepSeek"
    $sc.Save()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($sc) | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ws) | Out-Null
}

# --- layout under user profile ---
$shareDir = Join-Path $env:USERPROFILE ".local\share\free-claude-code"
$binDir = Join-Path $env:USERPROFILE ".local\bin"
New-Item -ItemType Directory -Force -Path $shareDir, $binDir | Out-Null

$repoFile = Join-Path $shareDir "repo.txt"
[System.IO.File]::WriteAllText($repoFile, $RepoRoot, (New-Object System.Text.UTF8Encoding $false))
[Environment]::SetEnvironmentVariable("FREE_CLAUDE_CODE_HOME", $RepoRoot, "User")
$env:FREE_CLAUDE_CODE_HOME = $RepoRoot

$proxyPs1Path = Join-Path $binDir "fcc-proxy.ps1"
$deepseekPs1Path = Join-Path $binDir "deepseek.ps1"
$initPs1Path = Join-Path $binDir "deepseek-init.ps1"

# Logon / Startup: start proxy from saved repo path.
# Prefer repo .venv (no "uv" on PATH required); fall back to README-style "uv run" if .venv missing.
# Writes one-line status + fatal errors to proxy.log (SSE not logged).
$proxyScript = @'
$ErrorActionPreference = "Stop"
$m = [Environment]::GetEnvironmentVariable("Path", "Machine")
$u = [Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = ($m, $u | Where-Object { $_ }) -join ";"
$share = Join-Path $env:USERPROFILE ".local\share\free-claude-code"
$logFile = Join-Path $share "proxy.log"
$repoFile = Join-Path $share "repo.txt"
if (-not (Test-Path -LiteralPath $repoFile)) { exit 1 }
$repo = [System.IO.File]::ReadAllText($repoFile).Trim()
Set-Location -LiteralPath $repo
New-Item -ItemType Directory -Force -Path $share | Out-Null
function Log([string] $Message) {
    Add-Content -LiteralPath $logFile -Value ("{0:o} {1}" -f (Get-Date), $Message) -Encoding UTF8
}
trap { Log "TRAP: $($_.Exception.Message)"; break }
Log "cwd=$($PWD.Path)"
$venvPy = Join-Path $repo ".venv\Scripts\python.exe"
if (Test-Path -LiteralPath $venvPy) {
    Log "launch: $venvPy -m uvicorn server:app (repo .venv)"
    & $venvPy -m uvicorn server:app --host 0.0.0.0 --port 8082
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        Log "uvicorn exited with code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}
else {
    Log "no .venv\Scripts\python.exe - falling back to: uv run uvicorn (run 'uv sync' in the repo if this fails)"
    uv run uvicorn server:app --host 0.0.0.0 --port 8082
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        Log "uvicorn exited with code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}
'@
$utf8BomEnc = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText($proxyPs1Path, $proxyScript, $utf8BomEnc)

# Global: Claude Code → localhost proxy (reads ANTHROPIC_AUTH_TOKEN from repo .env)
$deepseekScript = @'
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $RemainingArguments
)
$ErrorActionPreference = "Stop"
function Read-RepoRoot {
    $p = Join-Path $env:USERPROFILE ".local\share\free-claude-code\repo.txt"
    if (Test-Path -LiteralPath $p) { return [System.IO.File]::ReadAllText($p).Trim() }
    $e = $env:FREE_CLAUDE_CODE_HOME
    if ($e) { return $e.TrimEnd("\") }
    throw "Repo path not configured. Run: deepseek-init -RepoRoot `"C:\path\to\free-claude-code`""
}
function Read-AuthToken([string] $repo) {
    $envFile = Join-Path $repo ".env"
    $token = "freecc"
    if (-not (Test-Path -LiteralPath $envFile)) { return $token }
    foreach ($line in Get-Content -LiteralPath $envFile) {
        $t = $line.Trim()
        if ($t.StartsWith("#") -or $t.Length -eq 0) { continue }
        if ($t -match '^\s*ANTHROPIC_AUTH_TOKEN\s*=\s*"([^"]*)"') { return $Matches[1] }
        if ($t -match '^\s*ANTHROPIC_AUTH_TOKEN\s*=\s*(.+)$') { return $Matches[1].Trim().Trim('"') }
    }
    return $token
}
function Test-ProxyHealthy {
    try {
        $null = Invoke-WebRequest -Uri "http://127.0.0.1:8082/health" -UseBasicParsing -TimeoutSec 2
        return $true
    }
    catch {
        return $false
    }
}
function Wait-ProxyHealthy([int] $TimeoutSec = 90) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-ProxyHealthy) { return }
        Start-Sleep -Milliseconds 500
    }
    $logFile = Join-Path $env:USERPROFILE ".local\share\free-claude-code\proxy.log"
    Write-Host ""
    Write-Host "(free-claude-code) Proxy log (last lines): $logFile" -ForegroundColor Yellow
    if (Test-Path -LiteralPath $logFile) {
        Get-Content -LiteralPath $logFile -Tail 40 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
    }
    else {
        Write-Host "(no proxy.log yet - e.g. missing .venv: run 'uv sync' in the repo, then re-run install-windows-global.ps1)" -ForegroundColor DarkYellow
    }
    Write-Host ""
    throw "free-claude-code proxy did not become ready on port 8082 within ${TimeoutSec}s. In PowerShell run: powershell -NoProfile -ExecutionPolicy Bypass -File ""$env:USERPROFILE\.local\bin\fcc-proxy.ps1"""
}
function Ensure-ProxyRunning {
    if (Test-ProxyHealthy) { return }
    $proxyPs1 = Join-Path $env:USERPROFILE ".local\bin\fcc-proxy.ps1"
    if (-not (Test-Path -LiteralPath $proxyPs1)) {
        throw "Missing proxy launcher: $proxyPs1 - re-run install-windows-global.ps1 from the free-claude-code repo."
    }
    Write-Host ""
    Write-Host "(free-claude-code) Proxy was not running - starting it in the background..." -ForegroundColor Yellow
    Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoProfile", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-File", $proxyPs1
    ) -WindowStyle Hidden
    Write-Host "(free-claude-code) Waiting for http://127.0.0.1:8082/health ..." -ForegroundColor DarkGray
    Wait-ProxyHealthy 90
    Write-Host "(free-claude-code) Proxy is up; starting Claude Code." -ForegroundColor Green
    Write-Host ""
}
$repo = Read-RepoRoot
$ra = @(if ($null -ne $RemainingArguments) { $RemainingArguments })
$ProjectPath = (Get-Location).Path
$claudeArgs = [string[]]@()
if ($ra.Count -ge 1) {
    $first = $ra[0]
    if (Test-Path -LiteralPath $first -PathType Container) {
        $ProjectPath = (Resolve-Path -LiteralPath $first).Path
        if ($ra.Count -gt 1) { $claudeArgs = $ra[1..($ra.Count - 1)] }
    }
    else { $claudeArgs = $ra }
}
$env:ANTHROPIC_AUTH_TOKEN = Read-AuthToken $repo
$env:ANTHROPIC_BASE_URL = "http://localhost:8082"
Ensure-ProxyRunning
Set-Location -LiteralPath $ProjectPath
& claude @claudeArgs
'@
[System.IO.File]::WriteAllText($deepseekPs1Path, $deepseekScript, $utf8BomEnc)

$initScript = @'
param([string] $RepoRoot = "")
$ErrorActionPreference = "Stop"
if (-not $RepoRoot) {
    $f = Join-Path $env:USERPROFILE ".local\share\free-claude-code\repo.txt"
    if (Test-Path -LiteralPath $f) { $RepoRoot = [System.IO.File]::ReadAllText($f).Trim() }
}
if (-not $RepoRoot) {
    Write-Host "Usage: deepseek-init -RepoRoot `"C:\full\path\to\free-claude-code`"" -ForegroundColor Yellow
    Write-Host "Or run from the repo: .\install-windows-global.ps1" -ForegroundColor Yellow
    exit 1
}
$install = Join-Path ((Resolve-Path -LiteralPath $RepoRoot).Path) "install-windows-global.ps1"
if (-not (Test-Path -LiteralPath $install)) {
    Write-Host "install-windows-global.ps1 not found in that folder." -ForegroundColor Red
    exit 1
}
& $install -RepoRoot (Resolve-Path -LiteralPath $RepoRoot).Path
'@
[System.IO.File]::WriteAllText($initPs1Path, $initScript, $utf8BomEnc)

@(
    @"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\.local\bin\deepseek.ps1" %*
"@
    @"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\.local\bin\deepseek-init.ps1" %*
"@
) | ForEach-Object -Begin { $i = 0 } -Process {
    $name = if ($i -eq 0) { "deepseek.cmd" } else { "deepseek-init.cmd" }
    Set-Content -LiteralPath (Join-Path $binDir $name) -Value $_ -Encoding ASCII
    $i++
}

# Git Bash: bare "deepseek" does NOT run deepseek.cmd; need extensionless shims (LF, +x).
$shimDeepseek = @'
#!/usr/bin/env bash
set -e
_ps="$HOME/.local/bin/deepseek.ps1"
if command -v cygpath >/dev/null 2>&1; then _ps=$(cygpath -w "$_ps"); fi
exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$_ps" "$@"
'@
$shimInit = @'
#!/usr/bin/env bash
set -e
_ps="$HOME/.local/bin/deepseek-init.ps1"
if command -v cygpath >/dev/null 2>&1; then _ps=$(cygpath -w "$_ps"); fi
exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$_ps" "$@"
'@
Write-LfUtf8NoBom (Join-Path $binDir "deepseek") $shimDeepseek
Write-LfUtf8NoBom (Join-Path $binDir "deepseek-init") $shimInit
$msysBinForChmod = ConvertTo-MsysPath $binDir
Set-GitBashExecutableBit $msysBinForChmod
Write-Host "Wrote Git Bash shims: deepseek, deepseek-init (extensionless)" -ForegroundColor Green

# --- Windows user PATH ---
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$parts = @(
    $userPath -split ";" |
    ForEach-Object { $_.Trim().TrimEnd("\") } |
    Where-Object { $_ -ne "" }
)
if ($parts -notcontains $binDir) {
    $newPath = if ([string]::IsNullOrWhiteSpace($userPath)) { $binDir } else { "$userPath;$binDir" }
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    $env:Path = "$env:Path;$binDir"
    Write-Host "Prepended to user PATH: $binDir" -ForegroundColor Green
}
else {
    Write-Host "Already on user PATH: $binDir" -ForegroundColor DarkGray
}

# --- Git Bash ~/.bashrc ---
$msysBin = ConvertTo-MsysPath $binDir
$bashrc = Join-Path $env:USERPROFILE ".bashrc"
$begin = "# BEGIN free-claude-code-global"
$end = "# END free-claude-code-global"
$exportLine = 'export PATH="{0}:$PATH"' -f $msysBin
$newBlock = "$begin`n$exportLine`n$end`n"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
if (Test-Path -LiteralPath $bashrc) {
    $text = [System.IO.File]::ReadAllText($bashrc)
    if ($text.Contains($begin)) {
        $pattern = '(?s)# BEGIN free-claude-code-global.*?# END free-claude-code-global\s*'
        $updated = [regex]::Replace($text, $pattern, $newBlock.TrimEnd() + "`n", 1)
        [System.IO.File]::WriteAllText($bashrc, $updated, $utf8NoBom)
        Write-Host "Updated Git Bash ~/.bashrc" -ForegroundColor Green
    }
    else {
        [System.IO.File]::AppendAllText($bashrc, "`n$newBlock", $utf8NoBom)
        Write-Host "Appended Git Bash ~/.bashrc" -ForegroundColor Green
    }
}
else {
    [System.IO.File]::WriteAllText($bashrc, $newBlock, $utf8NoBom)
    Write-Host "Created ~/.bashrc" -ForegroundColor Green
}

Install-FccProxyStartupShortcut $proxyPs1Path
Write-Host "Installed Startup shortcut: FreeClaudeCode-DeepSeek-Proxy.lnk" -ForegroundColor Green

Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  1) Open a NEW terminal (Git Bash: source ~/.bashrc if deepseek was not found)." -ForegroundColor White
Write-Host "  2) From any folder: deepseek  (starts the proxy in the background if it is not up, then Claude Code)." -ForegroundColor White
Write-Host "  Optional: Startup shortcut starts the proxy at logon so the first deepseek is instant." -ForegroundColor DarkGray
Write-Host "Change clone path / repair: deepseek-init -RepoRoot `"$RepoRoot`"" -ForegroundColor DarkGray
