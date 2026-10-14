importScripts("shared.js");

const DEFAULTS = DEAFCS_DEFAULTS;

deafcsLog("service worker loaded");

async function ensureDefaults() {
  const current = await chrome.storage.local.get(null);
  const missing = {};
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (!(key in current)) missing[key] = value;
  }
  if (Object.keys(missing).length) await chrome.storage.local.set(missing);
}

// Chrome doesn't inject manifest content scripts into tabs that were already open when the
// extension was installed or updated; without this those tabs need F5.
async function injectIntoOpenTabs() {
  for (const { matches, js } of chrome.runtime.getManifest().content_scripts) {
    for (const tab of await chrome.tabs.query({ url: matches })) {
      try {
        const target = { tabId: tab.id };
        // Copies from before shared.js switched to "var" hold "const" globals in the same
        // isolated world, which a re-injected shared.js can't redeclare: leave those to F5.
        const [{ result: stale }] = await chrome.scripting.executeScript({
          target,
          func: () => typeof DEAFCS_LOG_PREFIX !== "undefined" && typeof DEAFCS_REINJECTABLE === "undefined"
        });
        if (stale) {
          deafcsLog("tab", tab.id, "runs an old version, reload it to update");
          continue;
        }
        await chrome.scripting.executeScript({ target, files: js });
        deafcsLog("injected content scripts into tab", tab.id);
      } catch (e) {
        // Discarded or still-loading tabs reject; they get the scripts when they load.
        deafcsWarn("could not inject into tab", tab.id, e.message);
      }
    }
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  await injectIntoOpenTabs();
  await deafcsCheckUpdate();
});

chrome.runtime.onStartup.addListener(deafcsCheckUpdate);

