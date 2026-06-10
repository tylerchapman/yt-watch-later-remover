/**
 * YouTube Watch Later Bulk Remover (works as of mid-2026 YouTube layout)
 * ----------------------------------------------------------------------
 * HOW TO USE:
 *   1. Go to https://www.youtube.com/playlist?list=WL
 *   2. Click "Sort by" and choose "Date added (oldest)" so the oldest
 *      videos are at the TOP of the list. The script always removes the
 *      topmost video, so this gives you oldest-first removal.
 *   3. Open DevTools Console (F12 or Ctrl+Shift+J), paste this entire
 *      script, press Enter.
 *   4. Watch the log. To stop early, refresh the page or run:  WL_STOP = true
 *
 * Notes:
 *   - No scrolling needed: YouTube backfills the top of the list as rows
 *     are removed, and the script always re-queries the first row.
 *   - Delays are deliberately conservative. Removing thousands of items
 *     too fast can trip YouTube's rate limiting (removals silently fail
 *     or the toast says "Saved to Watch later" weirdness). If you see
 *     repeated failures, raise DELAY_AFTER_REMOVE.
 */
(async () => {
  // ============ CONFIG ============
  const MAX_TO_REMOVE = 500;       // videos to remove this session
  const DELAY_MENU = 600;          // ms to wait for the ⋮ menu to render
  const DELAY_AFTER_REMOVE = 900;  // ms pause between removals
  const REMOVE_TIMEOUT = 5000;     // ms to wait for a row to disappear
  const MAX_CONSECUTIVE_FAILS = 5; // abort if stuck
  // ================================

  window.WL_STOP = false;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (m) => console.log(`%c[WL Cleaner] ${m}`, 'color:#3ea6ff;font-weight:bold');
  const warn = (m) => console.warn(`[WL Cleaner] ${m}`);

  if (!location.pathname.startsWith('/playlist') || !location.search.includes('list=WL')) {
    warn('This is not the Watch Later page. Go to youtube.com/playlist?list=WL and re-run.');
    return;
  }

  const getFirstRow = () => document.querySelector('ytd-playlist-video-renderer');

  const getRowTitle = (row) =>
    row.querySelector('#video-title')?.textContent?.trim() || '(unknown title)';

  const openRowMenu = (row) => {
    // The ⋮ button. YouTube has shipped both the old yt-icon-button and the
    // newer yt-button-shape markup; try both.
    const btn =
      row.querySelector('ytd-menu-renderer yt-icon-button button') ||
      row.querySelector('ytd-menu-renderer button') ||
      row.querySelector('button[aria-label*="menu" i]');
    if (btn) btn.click();
    return !!btn;
  };

  const findRemoveMenuItem = () => {
    // Menu items render inside the global popup container, in either
    // ytd-menu-service-item-renderer or the newer yt-list-item markup.
    const candidates = document.querySelectorAll(
      'ytd-popup-container ytd-menu-service-item-renderer,' +
      'ytd-popup-container tp-yt-paper-item,' +
      'tp-yt-iron-dropdown ytd-menu-service-item-renderer,' +
      'tp-yt-iron-dropdown yt-list-item-view-model'
    );
    for (const el of candidates) {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      // English UI: "Remove from Watch later"
      if (t.includes('remove') && t.includes('watch later')) return el;
    }
    return null;
  };

  const closeAnyOpenMenu = () => {
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true })
    );
  };

  const waitForRowGone = async (row) => {
    const start = Date.now();
    while (Date.now() - start < REMOVE_TIMEOUT) {
      if (!row.isConnected) return true;
      await sleep(200);
    }
    return false;
  };

  let removed = 0;
  let consecutiveFails = 0;
  log(`Starting. Target: ${MAX_TO_REMOVE} videos. Set WL_STOP = true to stop.`);

  while (removed < MAX_TO_REMOVE) {
    if (window.WL_STOP) { log('Stopped by user.'); break; }

    const row = getFirstRow();
    if (!row) { log('No videos left in view — list is empty or fully processed.'); break; }

    const title = getRowTitle(row);

    if (!openRowMenu(row)) {
      warn(`Could not find the ⋮ menu button on: "${title}"`);
      if (++consecutiveFails >= MAX_CONSECUTIVE_FAILS) { warn('Too many failures in a row. Aborting.'); break; }
      await sleep(1500);
      continue;
    }

    await sleep(DELAY_MENU);

    const removeItem = findRemoveMenuItem();
    if (!removeItem) {
      warn(`"Remove from Watch later" not found in menu for: "${title}". Closing menu and retrying.`);
      closeAnyOpenMenu();
      if (++consecutiveFails >= MAX_CONSECUTIVE_FAILS) {
        warn('Too many failures in a row. YouTube may have changed its menu markup, or you may be rate-limited. Aborting.');
        break;
      }
      await sleep(2000);
      continue;
    }

    removeItem.click();

    const gone = await waitForRowGone(row);
    if (gone) {
      removed++;
      consecutiveFails = 0;
      log(`Removed ${removed}/${MAX_TO_REMOVE}: "${title}"`);
    } else {
      warn(`Row did not disappear after clicking remove: "${title}". Possible rate limit — pausing 10s.`);
      closeAnyOpenMenu();
      if (++consecutiveFails >= MAX_CONSECUTIVE_FAILS) { warn('Too many failures in a row. Aborting.'); break; }
      await sleep(10000);
      continue;
    }

    await sleep(DELAY_AFTER_REMOVE);
  }

  log(`Done. Removed ${removed} video(s) this session.`);
})();
