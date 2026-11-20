// Shared helpers for the feature modules, created once per content script run.
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { DEFAULTS, error, isSettingKey, log, translate, type Settings, type StringKey } from '@/utils/shared';

type SettingsListener = (settings: Settings, changedKeys: string[]) => void;

export interface FeatureOptions {
  check: () => unknown;
  observe?: MutationObserverInit;
  immediate?: boolean;
  onDisable?: () => void;
}

// Same dark theme and amber accent as the popup (entrypoints/popup/style.css). Always dark: the
// site is dark too. Shadow DOM isolates it from site CSS.
const TOAST_CSS = `
  :host { all: initial; }
  .list { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 220px;
    padding: 11px 16px 11px 12px;
    border-radius: 12px;
    border: 1px solid rgb(245 165 36 / 0.35);
    background: #12151c;
    color: #eef1f6;
    font: 600 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
    box-shadow: 0 10px 30px rgb(0 0 0 / 0.5), 0 0 18px rgb(245 165 36 / 0.15);
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.2s, transform 0.2s;
  }
  .toast.show { opacity: 1; transform: none; }
  .icon {
    flex: none;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 9999px;
    background: #f5a524;
    color: #1a1204;
    font-size: 12px;
    font-weight: 800;
  }
`;

// "Match Found" dialogs (used by Auto-Ready and Auto Join).
const MATCH_FOUND_TEXT = /match found/i;

// Match page: https://deafcs.net/matches/<id>. Other pages (server lists etc.) may have their own
// copy-IP and Join buttons, so match features only run here. Checked on every call:
// the site navigates without reloading, so the URL changes under a running content script.
const MATCH_PAGE_PATH = /^\/matches\/[^/]+\/?$/;

// "Join Server" button on the server bar of the match page (used by Auto Join).
const JOIN_BUTTON_SELECTOR = 'button[data-server-bar-join]';

export function createCommon(ctx: ContentScriptContext) {
  const settings: Settings = { ...DEFAULTS };
  const listeners = new Set<SettingsListener>();
  let loaded = false;

  // False once the extension is reloaded/updated: this script keeps running in the open tab,
  // but browser.* calls throw "Extension context invalidated" and settings no longer arrive.
  // Also false once the background re-injects a newer copy into this tab: the old copy must
  // stand down. ContentScriptContext tracks both.
  const isAlive = () => ctx.isValid;

  function notify(changedKeys: string[]) {
    for (const fn of listeners) {
      try {
        fn(settings, changedKeys);
      } catch (e) {
        error(e);
      }
    }
  }

  browser.storage.local
    .get(DEFAULTS)
    .then((stored) => {
      Object.assign(settings, stored);
      loaded = true;
      notify(Object.keys(settings));
    })
    .catch((e) => error('failed to load settings', e));

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !isAlive()) return;
    // Only settings: other keys (e.g. Auto Join's "autoJoinLast") are internal state.
    const keys = Object.keys(changes).filter(isSettingKey);
    if (!keys.length) return;
    for (const key of keys) (settings as Record<string, unknown>)[key] = changes[key]!.newValue ?? DEFAULTS[key];
    if (loaded) notify(keys);
  });

  // Called once settings are loaded and again on every change.
  function onSettings(fn: SettingsListener) {
    listeners.add(fn);
    if (!loaded) return;
    try {
      fn(settings, Object.keys(settings));
    } catch (e) {
      error(e);
    }
  }

  const t = (key: StringKey, vars?: Record<string, string | number>) => translate(settings.lang, key, vars);

  // One container for all toasts, so toasts fired together stack instead of overlapping.
  let toastHost: HTMLDivElement | null = null;

  function toastList(): Element {
    if (toastHost?.isConnected) return toastHost.shadowRoot!.querySelector('.list')!;
    toastHost = document.createElement('div');
    toastHost.style.cssText =
      'position:fixed;inset:auto 24px 24px auto;margin:0;padding:0;border:0;' +
      'background:transparent;overflow:visible;z-index:2147483647;pointer-events:none';

    const root = toastHost.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = TOAST_CSS;
    const list = document.createElement('div');
    list.className = 'list';
    root.append(style, list);

    document.documentElement.appendChild(toastHost);
    // Top layer renders above everything regardless of the site's z-index/transform/overflow.
    if (toastHost.showPopover) {
      toastHost.popover = 'manual';
      toastHost.showPopover();
    }
    return root.querySelector('.list')!;
  }

  function toast(text: string, ms = 2500) {
    const list = toastList();
    const host = toastHost!;
    const el = document.createElement('div');
    el.className = 'toast';
    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.textContent = '✓';
    const label = document.createElement('span');
    label.className = 'text';
    label.textContent = text;
    el.append(icon, label);
    list.appendChild(el);

    el.getBoundingClientRect(); // force layout so the fade-in transition runs
    el.classList.add('show');

    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => {
        el.remove();
        if (!list.childElementCount) {
          host.remove();
          if (toastHost === host) toastHost = null;
        }
      }, 200);
    }, ms);
  }

  const randomDelay = (min: number, max: number) =>
    new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

  function isVisible(el: Element | null | undefined): boolean {
    return !!(el && el.isConnected && el.getClientRects().length);
  }

  let orphanLogged = false;

  // Runs a feature check, logging failures instead of leaving unhandled rejections.
  function runCheck(callback: () => unknown) {
    Promise.resolve()
      .then(callback)
      .catch((e) => error(e));
  }

  // Coalesces bursts of DOM mutations into a single callback. setTimeout, not
  // requestAnimationFrame: rAF never fires in a hidden tab (another tab active, or the
  // window covered by the game), which is exactly when Match Found tends to show up.
  // immediate: run on every mutation instead, for checks that can't wait for a throttled timer.
  function observeDom(
    callback: () => unknown,
    options: MutationObserverInit = { childList: true, subtree: true },
    { immediate = false } = {},
  ) {
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (!isAlive()) {
        observer.disconnect();
        if (!orphanLogged) log('extension was reloaded, stopping. Reload the page to pick up the new version');
        orphanLogged = true;
        return;
      }
      if (immediate) return runCheck(callback);
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

  // Turns a feature on and off with its boolean setting `key`: while on, check() runs right away
  // and then on DOM changes (observe/immediate are passed to observeDom). onDisable undoes what
  // the feature left on the page. Returns isOn(), for async work that must stop if the feature
  // was turned off in the meantime.
  function feature(key: SettingKeyOf<boolean>, name: string, { check, observe, immediate = false, onDisable }: FeatureOptions) {
    let observer: MutationObserver | null = null;
    onSettings((settings) => {
      if (settings[key] && !observer) {
        observer = observeDom(check, observe, { immediate });
        runCheck(check);
        log(`${name}: enabled`);
      } else if (!settings[key] && observer) {
        observer.disconnect();
        observer = null;
        onDisable?.();
        log(`${name}: disabled`);
      }
    });
    return () => observer !== null;
  }

  // "Match Found" dialogs currently in the DOM.
  function matchFoundDialogs() {
    return [...document.querySelectorAll('[role="alertdialog"]')].filter((d) =>
      MATCH_FOUND_TEXT.test(d.textContent ?? ''),
    );
  }

  const isMatchPage = () => MATCH_PAGE_PATH.test(location.pathname);

  // null outside match pages.
  const joinButton = () =>
    isMatchPage() ? document.querySelector<HTMLButtonElement>(JOIN_BUTTON_SELECTOR) : null;

  return {
    t,
    isAlive,
    onSettings,
    toast,
    randomDelay,
    isVisible,
    feature,
    matchFoundDialogs,
    isMatchPage,
    joinButton,
  };
}

type SettingKeyOf<T> = { [K in keyof Settings]: Settings[K] extends T ? K : never }[keyof Settings];

export type Common = ReturnType<typeof createCommon>;
