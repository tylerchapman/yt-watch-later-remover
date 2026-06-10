# youtube-watch-later-cleaner

A console script that bulk-removes videos from your YouTube Watch Later playlist, starting with the oldest ones.

I made this because I hit the 5,000 video cap on Watch Later (yes, really) and every script I found on GitHub or random blog posts had stopped working. YouTube keeps changing their DOM, so anything that targets `button[aria-label="Action menu"]` or a hardcoded menu index is dead now. This one matches the menu option by text and verifies each video actually got removed before moving on, so it should survive minor UI changes.

**Last verified working: June 2026.** If it's broken for you, YouTube probably changed something again. Open an issue.

## How to use

1. Go to your Watch Later playlist: https://www.youtube.com/playlist?list=WL
2. Click **Sort by** and pick **Date added (oldest)**. The script always removes the video at the top of the list, so this sort means oldest videos get removed first. Pick a different sort if you want a different order.
3. Open the dev console (`F12` or `Ctrl+Shift+J` in Chrome).
4. Paste the entire contents of `watch-later-cleaner.js` and hit Enter.

To stop it early, type `WL_STOP = true` in the console, or just refresh the page.

## Settings

There's a config block at the top of the script:

```js
const MAX_TO_REMOVE = 500;       // videos to remove this session
const DELAY_MENU = 600;          // ms to wait for the menu to render
const DELAY_AFTER_REMOVE = 900;  // ms pause between removals
```

500 per session is intentional. YouTube rate-limits rapid playlist edits. Push too hard and removals start silently failing, you'll see the row stick around or the video comes back later even though it said removed. When that happens the script pauses 10 seconds and retries, and gives up after 5 failures in a row instead of spinning forever. Bump `DELAY_AFTER_REMOVE` to 1500-2000 if you keep hitting it, or run another session later.

## Caveats

- Only tested with the YouTube UI set to English. The script finds the menu option by looking for "remove" + "watch later" in the text, so other languages won't match. Easy fix if anyone needs it.
- Desktop browser only.
- This clicks through YouTube's actual UI, so it's slow by design. Roughly one video every 1.5-2 seconds, so a 500 video session takes around 15 minutes. Leave the tab open and go do something else.
- Removals are permanent. There's no undo on Watch Later, so double check the sort order before you run it.

## Why not the YouTube API?

The Data API doesn't let you touch the Watch Later playlist. The `WL` playlist ID returns empty/forbidden for everyone, Google locked it down years ago. Scripting the UI from the console is the only way to do this in bulk.

Not affiliated with YouTube/Google. Use at your own risk.
