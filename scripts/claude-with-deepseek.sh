#!/usr/bin/env bash
# Load DeepSeek-backed Claude Code env from gitignored local file, then run `claude`.
# Usage: from repo root — bash scripts/claude-with-deepseek.sh
#        with args — bash scripts/claude-with-deepseek.sh --help

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCAL_ENV="$SCRIPT_DIR/claude-deepseek.local.env"

if [[ ! -f "$LOCAL_ENV" ]]; then
  printf '%s\n' "Missing: $LOCAL_ENV" "" "Copy and fill:" \
    "  cp scripts/claude-deepseek.env.example scripts/claude-deepseek.local.env" \
    "  # edit scripts/claude-deepseek.local.env — set ANTHROPIC_AUTH_TOKEN" >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$LOCAL_ENV"
set +a

export ANTHROPIC_BASE_URL="${ANTHROPIC_BASE_URL:-https://api.deepseek.com/anthropic}"
export ANTHROPIC_MODEL="${ANTHROPIC_MODEL:-deepseek-v4-pro[1m]}"
export ANTHROPIC_DEFAULT_OPUS_MODEL="${ANTHROPIC_DEFAULT_OPUS_MODEL:-deepseek-v4-pro[1m]}"
export ANTHROPIC_DEFAULT_SONNET_MODEL="${ANTHROPIC_DEFAULT_SONNET_MODEL:-deepseek-v4-pro[1m]}"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="${ANTHROPIC_DEFAULT_HAIKU_MODEL:-deepseek-v4-flash}"
export CLAUDE_CODE_SUBAGENT_MODEL="${CLAUDE_CODE_SUBAGENT_MODEL:-deepseek-v4-flash}"
export CLAUDE_CODE_EFFORT_LEVEL="${CLAUDE_CODE_EFFORT_LEVEL:-max}"

if [[ -z "${ANTHROPIC_AUTH_TOKEN:-}" ]]; then
  printf '%s\n' "ANTHROPIC_AUTH_TOKEN is empty in $LOCAL_ENV" >&2
  exit 1
fi

cd "$REPO_ROOT"
exec claude "$@"
