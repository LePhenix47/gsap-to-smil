# Prompt for another Cursor agent (copy below the line)

Open this file, copy **everything from the horizontal rule down**, paste into a new Cursor chat in the workspace you want the agent to use (e.g. the cloned `free-claude-code` folder), and let the agent run.

---

You are helping me finish setup so I can use **Claude Code** with **DeepSeek** through the **[free-claude-code](https://github.com/Alishahryar1/free-claude-code)** proxy (Anthropic-compatible local gateway), similar to what people do in setup walkthrough videos: clone repo → configure `.env` → run the proxy → point `claude` at `localhost`.

## My environment

- **OS:** Windows 10.
- **Repo:** I already cloned `free-claude-code`. Default path to use (adjust if my tree differs):
  `C:\Users\lolle\Desktop\Web dev\Projets externes (des autres)\free-claude-code`
- I have a **DeepSeek API key** from [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys). Do not print my key in chat or commit it; use `.env` only (gitignored).

## What I want you to do

1. **Open that repo** as the workspace root (or clearly tell me to open it in Cursor if you cannot access it).
2. **Read** the project `README.md` and `.env.example` — treat them as source of truth if they disagree with this prompt.
3. **Install toolchain** per README (typically `uv`, Python version they require e.g. 3.14, and ensure **Claude Code** is installed globally e.g. `npm install -g @anthropic-ai/claude-code`). Run the actual install commands and fix errors until prerequisites work.
4. **Configure:** `Copy-Item .env.example .env` (or equivalent). Set **`DEEPSEEK_API_KEY`** in `.env` and set **`MODEL`** to a DeepSeek model string their README documents for the DeepSeek provider (e.g. `deepseek/deepseek-chat` — verify against `.env.example` / README).
5. **Set `ANTHROPIC_AUTH_TOKEN`** in `.env` to a **local shared secret** (e.g. `freecc`) exactly as their README describes for Claude Code → proxy auth. I will use the **same** value when starting `claude`.
6. **Start the proxy** with the exact command from README (e.g. `uv run uvicorn server:app --host 0.0.0.0 --port 8082`). Confirm it listens without crash.
7. **Document for me** in your final message:
   - The **exact** PowerShell commands to start the proxy in one terminal.
   - The **exact** PowerShell commands for a **second** terminal to run Claude Code against the proxy: `ANTHROPIC_BASE_URL` must be `http://localhost:8082` with **no** `/v1` suffix, and `ANTHROPIC_AUTH_TOKEN` must match `.env`.
   - Remind me: if something fails, check README **Troubleshooting** (wrong base URL, SSE, etc.).

## Constraints

- Do **not** commit `.env` or paste API keys into the transcript.
- Prefer **minimal** changes: only what README requires.
- If the clone path does not exist on disk, stop and tell me the correct path to open in Cursor.

## Done when

Proxy runs, and I have a copy-paste **PowerShell** snippet to run `claude` in my project folder with env vars pointing at the live proxy.
