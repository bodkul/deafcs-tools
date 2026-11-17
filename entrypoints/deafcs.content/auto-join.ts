import { log } from '@/utils/shared';
import type { Common } from './common';

const CLICK_DELAY_MS = [300, 800] as const;
// Remembers the last joined match ({ match, at }) so a page reload or a second tab doesn't
// launch it again. The entry only has to outlive the match.
const LAST_KEY = 'autoJoinLast';
const LAST_TTL_MS = 3 * 60 * 60 * 1000;
const LOCK_NAME = 'deafcs-tools:auto-join';

interface LastJoin {
  match: string;
  at: number;
}

export function autoJoin({ t, isAlive, toast, randomDelay, isVisible, feature, joinButton }: Common) {
  let joining = false;
  // Match already handled (joined or skipped) on this page, so DOM churn doesn't re-run storage reads.
  let handledMatch: string | null = null;

  // Records match as joined unless it already is. The read and the write run under a Web Lock
  // shared by all deafcs.net tabs, so two tabs can't both see "not joined" and both launch it.
  async function claim(match: string) {
    const testAndSet = async () => {
      const { [LAST_KEY]: last } = (await browser.storage.local.get(LAST_KEY)) as { [LAST_KEY]?: LastJoin };
      if (last?.match === match && Date.now() - last.at < LAST_TTL_MS) return false;
      await browser.storage.local.set({ [LAST_KEY]: { match, at: Date.now() } });
      return true;
    };
    return navigator.locks ? navigator.locks.request(LOCK_NAME, testAndSet) : testAndSet();
  }

  async function check() {
    if (joining) return;
    const button = joinButton();
    if (!button || button.disabled || !isVisible(button)) return;
    const match = location.pathname;
    if (match === handledMatch) return;

    joining = true;
    try {
      await randomDelay(...CLICK_DELAY_MS);
      if (!isOn() || !isAlive() || location.pathname !== match || button.disabled || !isVisible(button)) return;

      handledMatch = match;
      if (!(await claim(match))) {
        log('auto-join: already joined this match, skipping', match);
        return;
      }

      button.click();
      log('auto-join: clicked Join Server', match);
      toast(t('autoJoinFired'));
    } finally {
      joining = false;
    }
  }

  const isOn = feature('autoJoinServer', 'auto-join', { check });

  log('auto-join loaded');
}
