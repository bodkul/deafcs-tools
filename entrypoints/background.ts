import type { ScriptPublicPath } from 'wxt/utils/inject-script';
import { checkUpdate, log, warn } from '@/utils/shared';

// Manifest content_scripts paths are plain strings; executeScript is typed with WXT's public paths.
type ScriptFiles = ScriptPublicPath[];

// Chrome doesn't inject manifest content scripts into tabs that were already open when the
// extension was installed or updated; without this those tabs need F5. Firefox does inject them
// by itself, so there this is skipped (a second copy would just replace the first one).
async function injectIntoOpenTabs() {
  for (const { matches, js } of browser.runtime.getManifest().content_scripts ?? []) {
    if (!matches || !js) continue;
    for (const tab of await browser.tabs.query({ url: matches })) {
      if (tab.id == null) continue;
      try {
        // A newer copy makes the old one in the tab stand down (ContentScriptContext).
        await browser.scripting.executeScript({ target: { tabId: tab.id }, files: js as ScriptFiles });
        log('injected content scripts into tab', tab.id);
      } catch (e) {
        // Discarded or still-loading tabs reject; they get the scripts when they load.
        warn('could not inject into tab', tab.id, (e as Error).message);
      }
    }
  }
}

export default defineBackground(() => {
  log('service worker loaded');

  browser.runtime.onInstalled.addListener(async () => {
    if (!import.meta.env.FIREFOX) await injectIntoOpenTabs();
    await checkUpdate();
  });

  browser.runtime.onStartup.addListener(checkUpdate);
});
