# Claude Code — six skills Nate Herk keeps (May 2026)

Source: [I Tried 100+ Claude Code Skills. These 6 Are The Best](https://youtu.be/eRS3CmvrOvA?si=nEZqx5Z1p8b58vPZ) — Nate Herk | AI Automation (~13:39, published 2026-05-03).

**What this video is:** after a lot of Claude Code hours, Nate narrows to **six installs** (he loosely calls them “skills”; some are **plugins**) that match what businesses pay for: boring, reliable wins—time, money, fewer mistakes—plus a **bonus** official skill and a short “how to sell outcomes” closer.

**Related in this repo:** [claude-code-nate-herk-32-tricks.md](./claude-code-nate-herk-32-tricks.md) (broader CC checklist), [improve-claude-usage.md](./improve-claude-usage.md) (token / session habits).

---

## Copy-paste installs (from the video description)

Commands as listed on YouTube—**re-verify** names and marketplaces before you run; plugins move fast.

```text
/plugin install skill-creator@claude-plugins-official
/plugin install superpowers@claude-plugins-official
npx get-shit-done-cc --claude --global
/plugin marketplace add mksglu/context-mode
/plugin install context-mode@context-mode
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
/plugin install frontend-design@claude-plugins-official
```

**Note from the video:** do **not** rely on a stray `npm install` for Claude Mem that only pulls the SDK without registering hooks—use the **marketplace + plugin install** flow above.

---

## The six (+ bonus)

### 1. Skill Creator (official)

- **What:** describe a workflow in plain language; it drafts, tests, and packages a reusable **skill** so you are not hand-writing `SKILL.md` structure from scratch.
- **Why it “sells”:** not billed as a client line item by itself—the **factory** that produces the other repeatable skills (SOP → skill, etc.).
- **Install:** `skill-creator@claude-plugins-official` (Nate installs globally on user scope in the video).

### 2. Superpowers

- **What:** pushes a more senior-dev loop: plan first, isolated work, tests before code, staged self-review (spec match + quality).
- **Why:** reduces the default failure mode—rushed code that looks fine until you run it or the client does.
- **Install:** `superpowers@claude-plugins-official`. Nate references a **separate** deep-dive video on Superpowers and token use.

### 3. GSD (“get shit done”)

- **What:** context engineering—fresh sub-agents per task, quality gates (e.g. scope dropped vs spec, security checks), optional more autonomous runs; `/gsd-help` for commands.
- **Why:** fights **context rot** mid-session; trades extra sub-agent tokens for fewer “Claude forgot the requirement” redos (not framed as a token *saver* overall).
- **Install:** `npx get-shit-done-cc --claude --global`.

### 4. `/review` and `/ultra review` (built-in)

- **What:** `/review` = structured local review; **`/ultra review`** = cloud sandbox + parallel reviewer agents, bugs only after independent repro (per Nate). Not a separate plugin on recent Claude Code.
- **Caveats from the video:** Claude Code **≥ 2.1.86**; **Claude account sign-in**—**API key alone is not enough** for Ultra Review; runs can take ~10–20 minutes in background; **cost** after free trials (order-of-magnitude **$5–$20** per run depending on size—pricing may change).
- **When:** `/review` for fast feedback; `/ultra review` before high-stakes merges (auth, payments, big refactors).

### 5. Context Mode

- **What:** routes tool output through a sandbox, **summarizes** what comes back into context (Nate cites large deltas shrinking dramatically in their benchmarks); **`/contextmode:ctx-stats`** for your numbers. Also tracks session events in **local SQL** and can **re-inject** a snapshot after compaction so work is not “lost” to summarization.
- **Why:** sessions that used to degrade around ~30 minutes can run much longer without the same slowdown.
- **Install:** marketplace `mksglu/context-mode`, then `context-mode@context-mode`; restart Claude Code after install (per video).

### 6. Claude Mem

- **What:** cross-session memory—captures edits, decisions, fixes, etc., compresses to semantic store (**local SQLite + vector search**); retrieval is layered so you do not dump everything each session; can auto-maintain folder-level `CLAUDE.md`-style docs (per Nate).
- **Why:** less **startup tax** every new session; pick up a cold project after weeks with less re-explaining.
- **Install:** marketplace `thedotmack/claude-mem`, then `claude-mem` plugin—**not** the “SDK-only npm” path warned in the video.

### Bonus 7. Frontend Design (official)

- **What:** Anthropic’s **frontend-design** skill—less generic “AI slop” UI when building in Claude Code; Nate mentions overlap with **Claude Design** for labs workflows brought back into Code.
- **Install:** `frontend-design@claude-plugins-official` (he recommends **global** install in the video).

---

## Chapters (from YouTube)

| Time   | Topic              |
| ------ | ------------------ |
| 00:00  | Intro              |
| 00:42  | Skill #1           |
| 02:57  | Skill #2           |
| 04:37  | Skill #3           |
| 06:17  | Skill #4           |
| 08:06  | Skill #5           |
| 09:44  | Skill #6           |
| 11:52  | Bonus              |
| 12:25  | How to sell these  |

---

## Selling (video closer, compressed)

Sell **outcomes** (hours saved, fewer mistakes, more leads), not the word “AI workflow.” Start with **one** skill, build a few demos, show a business owner value—then stack skills as you learn how they compose.

---

## Disclaimer

Plugin names, marketplaces, Claude Code version gates, and **Ultra Review** pricing were accurate **as stated in the video**; they can change. Prefer upstream READMEs and `/help` over this note when they disagree.
