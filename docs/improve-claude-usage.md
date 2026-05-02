# Improve Claude usage (notes)

From [Never hit Claude's usage limit again](https://youtu.be/2f7ZkImNHFo?si=lynChNPxvUpyB4qP) (Dubibubii). Add the rest of the video later at the bottom.

## Cost

When you send a message, the model reads the whole chat history. Later turns cost more than the first (the video uses a rough “about 11×” for the 10th round vs the first — story only, not a billing rule).

WARNING: Claude counts tokens, not how many messages you sent. Most tokens go to re-reading the full chat context, even when your new line is short.

## Tokens

3/4 words ≈ 1 token
↔
1 word ≈ 4/3 token

About 100 words ≈ 130 tokens.

Real counts depend on language and tokenizer.

You pay for 2 things:

1. Your text (input token)
2. Model's response (output token)

Rough total thumb from the video (not an official bill line):

`S × (n × (n − 1) / 2)`

`S` = Average tokens per exchange

`n` = number of messages in the thread

Ex: 5 messages `n = 5` → 10 tokens
10 messages `n = 10` → 45 tokens

## Caveman

Video: a “Caveman” plugin shortens prompts to save tokens. Add when/how to use it when you have notes.

## Rules

### Rule 1 — Don’t follow up

Wrong reply? Don’t stack a “please fix” message. Edit your last prompt when the app allows it (Claude site, Cursor). Same thread, one less turn to re-read.

Claude Code often cannot do that. There: new chat with one fixed prompt, or keep CC threads short.

## Still to add

More rules from the video as we add them. Until then: short threads, paste only needed code, new chat when the task changes.
