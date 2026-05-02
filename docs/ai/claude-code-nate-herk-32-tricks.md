# Claude Code — 32 tricks (Nate Herk)

Source: [32 tricks to level up Claude Code in 16 mins](https://youtu.be/jqoFP9QapXI?si=tHLk2YexS8Jfh35p) — Nate Herk | AI Automation (Apr 2026). Chapters: beginner ~00:14, intermediate ~04:53, pro ~10:29.

## How this differs from `improve-claude-usage.md`

| File | Focus |
|------|--------|
| [improve-claude-usage.md](./improve-claude-usage.md) | General Claude usage: tokens, chat length, limits, habits that apply in the browser or anywhere. |
| **This file** | **Claude Code** (CLI / IDE agent): slash commands, permissions, worktrees, MCP, hooks, parallel agents — concrete product features. |

Names are on purpose: one file is about **usage economics**; this one is about **the Code workflow**.

---

## Beginner (1–10)

1. **`/init` on every project** — Scans the repo and seeds a project memory file (Anthropic: `CLAUDE.md`) so you stop re-explaining structure each session. New repo: describe goals and stack and have it draft that file.
2. **`/statusline`** — Terminal footer with model, context %, cost, etc., so you see drift before context rot.
3. **Voice** — Native `/voice` where available; otherwise a dictation app for long prompts.
4. **Small context** — Ship only what the current task needs; big dumps add noise and worse behavior.
5. **`/context`** — See what eats tokens (system prompt slices, files, MCP, …) as percentages; trim or restructure.
6. **`/compact` ~60%** — Compress history; you can ask to *keep* specific decisions (e.g. schema). **`/clear`** when switching tasks so history does not pollute the next thread (files + `CLAUDE.md` still ground the agent).
7. **Plan mode first** — Shift+Tab to cycle modes; in plan mode it reads and plans without writing. Approve plan, then execute — fewer bad edits.
8. **Problem framing** — Treat it like a junior dev: “How should we handle X?” often beats “Write function Y” for alignment and reasoning.
9. **Force questions** — E.g. ask it to use ask-user until ~95% confident it understands the task.
10. **Self-checking todos** — After “build X”, next todo: screenshot / DevTools / tests; optionally “don’t advance until ~95% confident this todo is done.”

---

## Intermediate (11–22)

11. **Sub-agents for parallel work** — Isolated contexts; can use cheaper models on branches while main stays premium.
12. **Custom skills** — Reusable prompt/workflows under `.claude/skills/` (or team-shared); invoke in natural language or via slash.
13. **Haiku on sub-agents** — Heavy read / scrape / summarize → cheap model; hand a short brief to the main model.
14. **Refresh `CLAUDE.md`** — Log new patterns and gotchas after discoveries; **avoid bloat** (he aims ~150–200 lines max) because it loads every session.
15. **`CLAUDE.md` routes outward** — Link to style guides, deep docs, or status files instead of inlining everything in the always-on prompt.
16. **Exit early** — Escape and correct when it veers wrong; wrong-direction tokens are pure waste.
17. **Challenge outputs** — Push for a second pass (“more elegant”, “different approach”); then persist the lesson into a skill or `CLAUDE.md`.
18. **`/rewind`** — Roll conversation back without nuking the whole session.
19. **`/hooks` + notifications** — Ping when a session needs you (useful with many parallel sessions).
20. **Screenshots** — Errors, references, UI review loops (“screenshot and say what’s wrong”).
21. **Chrome DevTools / browser control** — Functional checks, forms, flows (complements visual screenshot passes).
22. **Clone inspiration carefully** — Screenshots or snippets from sites you like to escape generic UI; still make it yours legally and ethically.

---

## Pro (23–32)

23. **Parallel sessions + Git worktrees** — e.g. `claude --worktree <name>` (or `-w`): isolated working trees / branches so parallel sessions do not stomp the same checkout; merge when done. See Anthropic’s [common workflows / worktrees](https://code.claude.com/docs/en/common-workflows) for current behavior.
24. **API vs MCP when token-tight** — MCP loads full tool schemas into context; if you only need one Notion read, a narrow HTTP wrapper can be cheaper than a fat MCP surface.
25. **`/loop`** — Recurring in-session checks (e.g. every N minutes on deploy); **~3 day cap** in product — use OS schedulers for longer cron-style jobs (new session = cold context).
26. **VPS / always-on host** — Long jobs without babysitting a laptop; interact over SSH (or bots like Telegram in his setup).
27. **Remote control** — Steer a local session from phone/browser; code stays local; mind session URL / QR security.
28. **Data / “no SQL” workflows** — Wire CLI tools (e.g. `bq`) so plain-English questions become queries + answers.
29. **Ultra think** — For hard architecture, big refactors, or stuck debugging — allocates a large thinking budget before answering; skip for trivial fixes.
30. **Permissions over “dangerously skip”** — Allow-list safe commands, deny-list destructive ones; deny wins over allow; same speed with less risk.
31. **Agent teams** — Agents that share a task list and can message each other (vs one-way sub-agent reports); slower/costlier but more cohesive on large projects.
32. **Context7 MCP** — Pull version-specific live docs into the session so suggestions match current APIs (React, Next, Mongo, etc.). (Same idea as the Context7 MCP you can enable in Cursor.)

---

## Transcript vs product names

The auto transcript sometimes says “cloud.md” — in Anthropic’s flow that file is **`CLAUDE.md`** at the repo root (this project uses the same name).

---

## Optional extras (from the video description)

Community / PDF checklist links are in the YouTube description (Skool, sponsor links, etc.) — grab them from the video page if you use those resources.
