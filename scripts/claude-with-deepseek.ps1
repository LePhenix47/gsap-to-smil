# Load DeepSeek-backed Claude Code env from gitignored local file, then run `claude`.
# Usage:  cd <repo-root>;  .\scripts\claude-with-deepseek.ps1
#         .\scripts\claude-with-deepseek.ps1 --help

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$LocalEnv = Join-Path $ScriptDir "claude-deepseek.local.env"

if (-not (Test-Path $LocalEnv)) {
  Write-Host "Missing: $LocalEnv`nCopy and fill:`n  copy scripts\claude-deepseek.env.example scripts\claude-deepseek.local.env`n  # edit scripts\claude-deepseek.local.env — set ANTHROPIC_AUTH_TOKEN"
  exit 1
}

Get-Content $LocalEnv | ForEach-Object {
  $line = $_.Trim()
  if ($line -match "^\s*#" -or $line -eq "") { return }
  if ($line -match "^([^=]+)=(.*)$") {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim().Trim('"').Trim("'")
    Set-Item -Path "env:$name" -Value $value
  }
}

if (-not $env:ANTHROPIC_BASE_URL) { $env:ANTHROPIC_BASE_URL = "https://api.deepseek.com/anthropic" }
if (-not $env:ANTHROPIC_MODEL) { $env:ANTHROPIC_MODEL = "deepseek-v4-pro[1m]" }
if (-not $env:ANTHROPIC_DEFAULT_OPUS_MODEL) { $env:ANTHROPIC_DEFAULT_OPUS_MODEL = "deepseek-v4-pro[1m]" }
if (-not $env:ANTHROPIC_DEFAULT_SONNET_MODEL) { $env:ANTHROPIC_DEFAULT_SONNET_MODEL = "deepseek-v4-pro[1m]" }
if (-not $env:ANTHROPIC_DEFAULT_HAIKU_MODEL) { $env:ANTHROPIC_DEFAULT_HAIKU_MODEL = "deepseek-v4-flash" }
if (-not $env:CLAUDE_CODE_SUBAGENT_MODEL) { $env:CLAUDE_CODE_SUBAGENT_MODEL = "deepseek-v4-flash" }
if (-not $env:CLAUDE_CODE_EFFORT_LEVEL) { $env:CLAUDE_CODE_EFFORT_LEVEL = "max" }

if ([string]::IsNullOrWhiteSpace($env:ANTHROPIC_AUTH_TOKEN)) {
  Write-Error "ANTHROPIC_AUTH_TOKEN is empty in $LocalEnv"
  exit 1
}

Set-Location $RepoRoot
claude @args
