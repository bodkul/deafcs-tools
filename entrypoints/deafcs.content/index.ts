// deafcs.net content script: plain TypeScript, no React. Each feature module turns itself on and
// off with its setting (see common.ts → feature()).
import { error, log } from '@/utils/shared';
import { autoJoin } from './auto-join';
import { autoReady } from './auto-ready';
import { createCommon } from './common';
import { copyServerIp } from './copy-server-ip';
import { hideCancelled } from './hide-cancelled';
import { matchStats } from './match-stats';
import { queueDots } from './queue-dots';

export default defineContentScript({
  matches: ['https://*.deafcs.net/*'],
  runAt: 'document_idle',
  async main(ctx) {
    // Patches the site's clipboard calls in the page's MAIN world, for Copy Server IP.
    // Awaited so the hook is in place before the first check runs.
    try {
      await injectScript('/copy-hook.js');
    } catch (e) {
      error('failed to inject copy-hook', e);
    }

    const common = createCommon(ctx);
    log('common loaded');

    autoReady(common);
    copyServerIp(common);
    autoJoin(common);
    queueDots(common);
    hideCancelled(common);
    matchStats(common);
  },
});
