# Nate Herk — six Claude Code picks (May 2026)

Video: [I Tried 100+ Claude Code Skills. These 6 Are The Best](https://youtu.be/eRS3CmvrOvA?si=nEZqx5Z1p8b58vPZ) (Nate Herk, ~13 min). He calls most of these “skills”; some are plugins. Same channel’s [32 tricks](./claude-code-nate-herk-32-tricks.md) is a wider list; [usage / tokens](./improve-claude-usage.md) is separate.

Check plugin names and marketplaces before you run anything below—they change.

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

For Claude Mem, use the marketplace + plugin flow above. Nate warns against an npm install that only pulls the SDK and never registers hooks.

1. Skill Creator (official) — You describe a job in plain language; it builds and packages a reusable skill so you are not writing SKILL layout by hand. More like the base tool that feeds the rest than a thing you invoice alone.

2. Superpowers — Plan first, isolate work, tests before code, self-review. Cuts the usual “looks fine until you run it” rush. He has another video on Superpowers and tokens.

3. GSD — Fresh sub-agents per task, gates so dropped scope and security do not get ignored quietly, optional hands-off runs. `/gsd-help` for commands. Costs more tokens on sub-agents; the win is fewer full redos when the main session rots. Not sold as a net token saver.

4. `/review` and `/ultra review` — Built into Claude Code, not a separate install. `/review` is a quick local pass. `/ultra review` sends the branch to a cloud sandbox with parallel reviewers; Nate says bugs only count after repro. Needs Claude Code 2.1.86+, a normal Claude sign-in (not API-key-only for ultra), often 10–20 minutes, and paid runs after a small free allowance (he ballparks roughly $5–20 per run by size; treat that as “check current pricing”). Use `/review` often; use ultra before scary merges (auth, money, big refactors).

5. Context Mode — Tool output goes through a sandbox; only a small summary lands in context (he quotes their before/after sizes; use `/contextmode:ctx-stats` for yours). Also keeps a local event log so after compaction you can inject a snapshot and not lose the thread. Install: add marketplace `mksglu/context-mode`, install `context-mode@context-mode`, restart Claude Code.

6. Claude Mem — Remembers across sessions in a local DB with search, pulls in only what matters for the next chat, can refresh folder-level docs. Less repeating yourself when you open a new session.

Bonus: Frontend Design (official) — UI that looks less generic. Install `frontend-design@claude-plugins-official`; he suggests global. He mentions Claude Design in labs if you round-trip projects into Code.

Chapters on YouTube: intro 0:00, #1 0:42, #2 2:57, #3 4:37, #4 6:17, #5 8:06, #6 9:44, bonus 11:52, selling bit 12:25.

Closing idea from the video: sell time saved, fewer errors, more leads—not the phrase “AI workflow.” Learn one tool, ship a few demos, then add more.

If this file disagrees with the product docs or `/help`, trust those.
