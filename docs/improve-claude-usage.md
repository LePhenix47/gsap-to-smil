# Improve Claude usage (notes)

From [Never hit Claude's usage limit again](https://youtu.be/2f7ZkImNHFo?si=lynChNPxvUpyB4qP) (Dubibubii). Add more from the video at the bottom when you have it.

## Cost

When you send a message, the model reads the whole chat history. Later turns cost more than the first (the video uses a rough “about 11×” for the 10th round vs the first — story only, not a billing rule).

WARNING: Claude counts tokens, not how many messages you sent. Most tokens go to re-reading the full chat context, even when your new line is short.

## Tokens

3/4 words ≈ 1 token
↔
1 word ≈ 4/3 token

About 100 words ≈ 130 tokens.

Real counts depend on language and tokenizer.

You pay for two things:

1. Your text (input)
2. The model’s reply (output)

Rough total thumb from the video (not an official bill line):

`S × (n × (n − 1) / 2)`

`S` = average tokens per exchange

`n` = number of messages in the thread

Ex: `n = 5` → `n × (n − 1) / 2` = 10. `n = 10` → 45. That is the triangle factor, not total tokens until you multiply by `S`.

## Caveman

Use [`caveman`](https://github.com/JuliusBrussee/caveman)

## Rules

### Rule 1 — Don’t follow up

Wrong reply? Don’t stack a “please fix” message. Edit your last prompt when the app allows it (Claude site, Cursor).

Claude Code often cannot do that. On CC: new chat with one fixed prompt, or keep threads short.

### Rule 2 — Fresh chat

Around every 15–20 messages, start a new chat so history stops growing.

Ask the agent for a short summary (goal, decisions, open tasks, file paths). Paste that into the first message of the new chat.

### Rule 3 — Batch your ask

3 small sends = 3 full context reads

1 batched = 1 full context read

Same work, fewer passes through the thread.

Bonus: one batched prompt = full picture for the model, often better results.

### Rule 4 — Track usage

Spend is high but you cannot see what burned it? Measure first.

CC writes local logs. [phuryn/claude-usage](https://github.com/phuryn/claude-usage) reads them.

### Rule 5 — Recurring uploads (web only)

Not CC.

Same PDFs in every chat = waste. One project, files live there, update in place.

### Rule 6 — Saved context

No saved context = repeat goals and stack = extra tokens and messages.

Site: memory + preferences. CC: [CLAUDE.md](../CLAUDE.md) + repo docs.

### Rule 7 — Unused features

Web app: turn off what you do not use (web search, effort mode, etc.).

### Rule 8 — Spread the day

CC limits often use a rolling ~5h window (check your plan).

Peak times: CC tends to cost more from 5am–7am and 1pm–7pm (confirm on your plan).

Split work: morning + afternoon + evening, not one long spike.

Trick: web app cron → tiny message ~4–5am. Idea: let the rolling window move while you sleep so the next block fits better after a hard burst. Check current CC rules before you rely on it.

## Still to add

More rules if the video adds more. Until then: short threads, paste only needed code, new chat when the task changes.
