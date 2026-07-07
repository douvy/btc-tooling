---
name: update-tweets
description: Update the X Insights featured tweets from pasted tweet data. Rewrites tweetData.ts, verifies images exist, commits, and pushes.
---

# Update X Insights Tweets

Rewrite `featuredTweets` in `src/data/tweetData.ts` from pasted tweet data (usually 4 tweets).

## Input

For each tweet, the user pastes some combination of: display name, handle, tweet text, timestamp, engagement counts (comments/retweets/likes/views), the x.com status URL, and optionally an attached image. Ask for anything missing — especially **URLs and view counts**, which are often forgotten on the first paste.

Avatar and post images: the user drops them into `public/images/` themselves (e.g. `ansem.jpg`, `ansem-post.jpg`). Confirm each referenced file exists before committing (`ls public/images/`).

## Field rules (Tweet type in src/types/index.ts)

- `id`: "1"–"4" in display order (order as pasted)
- `username`: display name as shown on X (may be empty string or include `@` — copy exactly what the user pastes)
- `handle`: without `@`
- `profileImage` / `image`: bare filename only (e.g. `"ansem.jpg"`), files live in `public/images/`. `image` is optional — omit if the tweet has no attached image.
- `text`: preserve the tweet's line breaks as `\n\n` (or `\n` for single breaks). Escape inner double quotes as `\"`. Keep the text verbatim — no editing, no censoring.
- `time`: format `"H:MM PM · MMM D, YYYY"` with UPPERCASE month, e.g. `"7:03 PM · JUL 5, 2026"`
- `link`: the full x.com status URL as given
- Counts are plain numbers. Parse shorthand: `2.9k` → `2900`, `1.4m` → `1400000`, `37.3k` → `37300`, `151.4k` → `151400`.

## Verify and ship

1. Confirm all referenced image files exist in `public/images/`.
2. `pnpm lint && pnpm exec tsc --noEmit && pnpm build`
3. Commit `tweetData.ts` plus any new images in `public/images/` with message `content: update BTC X Insights` (mitchellh style, NO Co-Authored-By trailer) and push.
