# Improve Claude usage (notes)

From the video [Never hit Claude's usage limit again](https://youtu.be/2f7ZkImNHFo?si=lynChNPxvUpyB4qP) by Dubibubii. More rules from the rest of the video can go at the end when you have them.

## Cost is about context, not “how many messages”

Each turn the model sees the whole thread again. So later turns cost more than early ones (the video uses a rough 11× idea for the 10th round vs the 1st; treat it as illustration, not a promise from Anthropic).

What you pay for is tokens. A long chat means most tokens go to re-reading old messages, even if your new line is short.

## Tokens in plain terms

Rough guesses people use: a few words for one token, and on the order of a hundred words for a bit more than a hundred tokens. Language and tokenizer change the numbers.

You pay for what you type (input) and what the model types (output). Big prompt or long answer means more tokens on that side.

Because the full history is usually sent again each time, total cost grows faster than “average message size times number of messages.” A simple thumb from the video is: average tokens per exchange, times n times (n minus 1) over 2, where n is how many messages—that triangle shape is “keep rereading the past.” It is a rule of thumb from the video, not how billing really works line by line.

## Caveman

The video mentions a Caveman plugin that shortens how you phrase prompts so you burn fewer tokens. When you have notes on when to use it, add them here.

## Still to add

Paste Dubibubii’s explicit rules here after you watch that part. Until then: short threads, paste only the code you need, new chat when the task changes.
