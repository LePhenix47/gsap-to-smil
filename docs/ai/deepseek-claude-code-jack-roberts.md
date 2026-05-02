# DeepSeek V4 + Claude Code (Jack Roberts)

Source: [DeepSeekV4 + Claude Code = 100X Cheaper](https://youtu.be/tn7zXRv3Xmo?si=Nsh8JpTNz1pU4zB3) — Jack Roberts ([@Itssssss_Jack](https://www.youtube.com/@Itssssss_Jack)).

This file is a **short repo note**: same idea as the video title — run **Claude Code** in the terminal while the **model + billing** go through **DeepSeek’s Anthropic-compatible API**, so heavy coding can cost far less than default Anthropic routing for comparable workloads. Dollar math and “100×” depend on your plan, model mix, and token use — treat the title as marketing, then measure.

**Primary setup (always re-check upstream):** DeepSeek’s own guide — [Integrate with AI Tools → Claude Code](https://api-docs.deepseek.com/guides/coding_agents) and [Anthropic API compatibility](https://api-docs.deepseek.com/guides/anthropic_api).

---

## What you are doing

- **Claude Code** = the agent UX (tools, repo context, hooks, skills).
- **DeepSeek V4** = the LLM behind that UX when you point `ANTHROPIC_BASE_URL` at DeepSeek’s Anthropic-shaped endpoint and use a DeepSeek model id.

Unsupported Anthropic features are ignored or mapped (see DeepSeek’s compatibility tables). Some message/tool shapes **are not supported** on their Anthropic bridge — if a CC feature breaks, check whether it relies on something DeepSeek marks “Not Supported” (e.g. parts of MCP / server tools in their table).

---

## Environment pattern (from DeepSeek docs)

Linux / macOS / Git Bash — after [installing Claude Code](https://code.claude.com/docs/en/quickstart), set (replace the key):

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

Then `cd` your repo and run `claude`. **Windows PowerShell** equivalents are in the same DeepSeek page.

- **`[1m]`** — suffix DeepSeek documents for the **1M context** variant of V4-Pro; drop it if you intentionally want the smaller window.
- **Pro vs Flash** — Pro for main work; Flash for cheaper Haiku / subagent-style calls (see DeepSeek’s variable names above).

API keys: [DeepSeek platform](https://platform.deepseek.com/api_keys).

---

## Why people pair them

- **Price** — API list prices for V4-Pro / V4-Flash undercut flagship closed models on a **per-token** basis; third-party writeups (e.g. cost comparisons in blogs) line up with “big savings” *if* your workload fits the bridge.
- **Same habits** — you keep `/plan`, worktrees, skills, etc.; only the backend and bill change.

---

## Caveats

1. **Re-read DeepSeek’s doc** before production — env names and model strings change.
2. **Compatibility** — not every Anthropic / Claude Code feature maps 1:1; validate MCP, images, and anything “server tool” related.
3. **Privacy / compliance** — code and prompts go to DeepSeek’s API under their terms, not Anthropic’s.
4. **Quality** — benchmark gaps vs top Anthropic models shrink over time but are never zero; keep Anthropic access for the steps where you still want their stack.

---

## Related in this repo

- [improve-claude-usage.md](./improve-claude-usage.md) — token / session economics (still applies: long threads cost).
- [claude-code-nate-herk-32-tricks.md](./claude-code-nate-herk-32-tricks.md) — CC habits (model mix, Haiku on subagents, etc.) — ideas transfer; swap “which API” in your head.
