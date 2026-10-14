// Shared helpers. Content scripts of one extension share an isolated world,
// so everything here is visible to the feature scripts loaded after it.
(() => {
  const DEFAULTS = DEAFCS_DEFAULTS;

  const settings = { ...DEFAULTS };
  const listeners = new Set();
  let loaded = false;
  // Filled in at the end and published as window.DeafCS.
  const api = {};

  // False once the extension is reloaded/updated: this script keeps running in the open tab,
  // but chrome.* calls throw "Extension context invalidated" and settings no longer arrive.
  // Also false once the service worker re-injects a newer copy into this tab (same isolated
  // world, so the new common.js replaces window.DeafCS): the old copy must stand down.
  const isAlive = () => !!chrome.runtime?.id && window.DeafCS === api;

  function notify(changedKeys) {
    for (const fn of listeners) {
      try {
        fn(settings, changedKeys);
      } catch (e) {
        deafcsError(e);
      }
    }
  }

  chrome.storage.local
    .get(DEFAULTS)
    .then((stored) => {
      Object.assign(settings, stored);
      loaded = true;
      notify(Object.keys(settings));
    })
    .catch((e) => deafcsError("failed to load settings", e));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !isAlive()) return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      settings[key] = newValue === undefined ? DEFAULTS[key] : newValue;
    }
    if (loaded) notify(Object.keys(changes));
  });

  // Called once settings are loaded and again on every change.
  function onSettings(fn) {
    listeners.add(fn);
    if (!loaded) return;
    try {
      fn(settings, Object.keys(settings));
    } catch (e) {
      deafcsError(e);
    }
  }

  const t = (key, vars) => deafcsT(settings.lang, key, vars);

  function setSettings(patch) {
    return chrome.storage.local.set(patch);
  }

  // shadcn/ui (Sonner) look, zinc theme. Shadow DOM isolates it from site CSS.
  const TOAST_CSS = `
    :host { all: initial; }
    .list { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 220px;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid hsl(240 5.9% 90%);
      background: hsl(0 0% 100%);
      color: hsl(240 10% 3.9%);
      font: 500 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
      box-shadow: 0 10px 30px rgb(0 0 0 / 0.35);
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.2s, transform 0.2s;
    }
    .toast.show { opacity: 1; transform: none; }
    .icon {
      flex: none;
      display: grid;
      place-items: center;
      width: 20px;
      height: 20px;
      border-radius: 9999px;
      background: hsl(38 92% 50%);
      color: hsl(240 10% 3.9%);
      font-size: 12px;
      font-weight: 700;
    }
    /* Lighter than shadcn's dark card so it stands out on the site's dark background. */
    @media (prefers-color-scheme: dark) {
      .toast {
        border-color: hsl(240 5% 30%);
        background: hsl(240 5.9% 16%);
        color: hsl(0 0% 98%);
      }
    }
  `;

  // One container for all toasts, so toasts fired together stack instead of overlapping.
  let toastHost = null;

  function toastList() {
    if (toastHost?.isConnected) return toastHost.shadowRoot.querySelector(".list");
    toastHost = document.createElement("div");
    toastHost.style.cssText =
      "position:fixed;inset:auto 24px 24px auto;margin:0;padding:0;border:0;" +
      "background:transparent;overflow:visible;z-index:2147483647;pointer-events:none";

    const root = toastHost.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${TOAST_CSS}</style><div class="list"></div>`;

    document.documentElement.appendChild(toastHost);
    // Top layer renders above everything regardless of the site's z-index/transform/overflow.
    if (toastHost.showPopover) {
      toastHost.popover = "manual";
      toastHost.showPopover();
    }
    return root.querySelector(".list");
  }

  function toast(text, ms = 2500) {
    const list = toastList();
    const host = toastHost;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = '<span class="icon">✓</span><span class="text"></span>';
    el.querySelector(".text").textContent = text;
    list.appendChild(el);

    el.getBoundingClientRect(); // force layout so the fade-in transition runs
    el.classList.add("show");

    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => {
        el.remove();
        if (!list.childElementCount) {
          host.remove();
          if (toastHost === host) toastHost = null;
        }
      }, 200);
    }, ms);
  }

  const randomDelay = (min, max) =>
    new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

  function isVisible(el) {
    return !!(el && el.isConnected && el.getClientRects().length);
  }

  let orphanLogged = false;

  // Runs a feature check, logging failures instead of leaving unhandled rejections.
  function runCheck(callback) {
    Promise.resolve()
      .then(callback)
      .catch((e) => deafcsError(e));
  }

  // Coalesces bursts of DOM mutations into a single callback. setTimeout, not
  // requestAnimationFrame: rAF never fires in a hidden tab (another tab active, or the
  // window covered by the game), which is exactly when Match Found tends to show up.
  function observeDom(callback, options = { childList: true, subtree: true }) {
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (!isAlive()) {
        observer.disconnect();
        if (!orphanLogged) deafcsLog("extension was reloaded, stopping. Reload the page to pick up the new version");
        orphanLogged = true;
        return;
      }
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        runCheck(callback);
      }, 50);
    });
    observer.observe(document.documentElement, options);
    return observer;
  }

  // "Match Found" dialogs currently in the DOM (used by Auto-Ready and Auto Join).
  const MATCH_FOUND_TEXT = /match found/i;
  function matchFoundDialogs() {
    return [...document.querySelectorAll('[role="alertdialog"]')].filter((d) => MATCH_FOUND_TEXT.test(d.textContent));
  }

  window.DeafCS = Object.assign(api, {
    t,
    isAlive,
    onSettings,
    setSettings,
    toast,
    randomDelay,
    isVisible,
    observeDom,
    runCheck,
    matchFoundDialogs
  });

  deafcsLog("common.js loaded");
})();
