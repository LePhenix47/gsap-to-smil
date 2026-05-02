# DeepSeek V4 + Claude Code (Jack Roberts)

Source: [DeepSeekV4 + Claude Code = 100X Cheaper](https://youtu.be/tn7zXRv3Xmo?si=Nsh8JpTNz1pU4zB3) — Jack Roberts ([@Itssssss_Jack](https://www.youtube.com/@Itssssss_Jack)).

**Primary setup (always re-check upstream):** [Integrate with AI Tools → Claude Code](https://api-docs.deepseek.com/guides/coding_agents) and [Anthropic API compatibility](https://api-docs.deepseek.com/guides/anthropic_api).

---

## What this is (plain)

**Claude Code** is the terminal coding agent: tools, repo edits, subagents, skills, hooks — the whole loop.

**This setup does not change that product.** It only changes **where each model request is sent** and **which provider bills you**:

| Piece | Default | With DeepSeek env |
| --- | --- | --- |
| App you run | `claude` (Claude Code) | Same |
| HTTP API shape | Anthropic’s | Same shape, but **host** is DeepSeek |
| Model weights answering | Anthropic (Claude) | **DeepSeek** models (IDs you set) |
| API key | Anthropic | **DeepSeek** |

So: **same driver (Claude Code), different engine and invoice (DeepSeek).** You are not getting Anthropic-hosted Claude weights through DeepSeek’s key.

Dollar math and “100×” in video titles depend on plan, model mix, and tokens — treat that as marketing until you measure on your own usage.

---

## What this is *not*

- **Not** a magic pipe where “DeepSeek plans and Claude writes code” automatically with one session. There is no hidden handoff between providers unless **you** build one (e.g. copy-paste, two terminals — below).
- **Not** the same model as flagship Claude; quality and quirks differ. DeepSeek’s compatibility doc lists what their Anthropic bridge supports or maps.

---

## Optional workflow: cheap exploration → real Claude Code

Independent of the API swap, a practical split:

1. **Terminal A** — Claude Code pointed at DeepSeek (`ANTHROPIC_BASE_URL` → DeepSeek). Use it for long, repo-wide exploration and **drafting** the final user message (goal, constraints, paths, decisions).
2. **Terminal B** — Claude Code with **normal** Anthropic env (no DeepSeek base URL, Anthropic key). Paste **that drafted message** in and let the stronger stack do the heavy final pass.

**You** copy the message from A to B. Nothing syncs automatically between sessions.

Use two shells (or profiles) so you never mix `ANTHROPIC_BASE_URL` / keys by accident.

---

## What you are doing (single-terminal DeepSeek backend)

- **Claude Code** = agent UX (tools, repo context, hooks, skills).
- **DeepSeek V4** = the LLM answering inside that UX when `ANTHROPIC_BASE_URL` is DeepSeek’s Anthropic-compatible URL and model env vars are DeepSeek model IDs.

If a Claude Code feature breaks on the bridge, check DeepSeek’s table for “Not Supported” (e.g. parts of MCP / server tools).

---

## Environment pattern (from DeepSeek docs)

Linux / macOS / Git Bash — after [installing Claude Code](https://code.claude.com/docs/en/quickstart), set (replace the key). Use **one export per line** (some doc pages concatenate them in HTML):

```bash
export ANTHROPIC_BASE_URL="https://api.deepseek.com/anthropic"
export ANTHROPIC_AUTH_TOKEN="<your DeepSeek API key>"
export ANTHROPIC_MODEL="deepseek-v4-pro[1m]"
export ANTHROPIC_DEFAULT_OPUS_MODEL="deepseek-v4-pro[1m]"
export ANTHROPIC_DEFAULT_SONNET_MODEL="deepseek-v4-pro[1m]"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="deepseek-v4-flash"
export CLAUDE_CODE_SUBAGENT_MODEL="deepseek-v4-flash"
export CLAUDE_CODE_EFFORT_LEVEL="max"
```

Then `cd` your repo and run `claude`. **Windows PowerShell** equivalents are on the same DeepSeek page.

- **`[1m]`** — suffix for the **1M context** V4-Pro variant; omit if you want the smaller window.
- **Pro vs Flash** — Pro for main work; Flash for cheaper Haiku / subagent-style calls.

API keys: [DeepSeek platform](https://platform.deepseek.com/api_keys).

---

## Why people pair them

- **Price** — per-token list prices can be lower than default Anthropic routing *if* the workload fits the bridge.
- **Same habits** — `/plan`, worktrees, skills, etc.; backend and bill change.

---

## Caveats

1. **Re-read DeepSeek’s doc** before relying on it — env names and model strings change.
2. **Compatibility** — not every Anthropic / Claude Code feature maps 1:1; validate MCP, images, and server tools.
3. **Privacy / compliance** — prompts and code hit DeepSeek’s API and terms when using their URL + key.
4. **Quality** — keep Anthropic-backed Claude Code for steps where you still want that stack.

---

## Related in this repo

- [improve-claude-usage.md](./improve-claude-usage.md) — token / session economics.
- [claude-code-nate-herk-32-tricks.md](./claude-code-nate-herk-32-tricks.md) — CC habits; swap “which API” in your head when applying tricks.
