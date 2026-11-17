import { log, warn } from '@/utils/shared';
import type { Common } from './common';

// "Copy connect command" button on the server bar of the match page. The address next to it
// is redacted until revealed, so the command is taken from what this button copies
// (see entrypoints/copy-hook.ts) instead of from the page.
const COPY_BUTTON_SELECTOR = '[data-server-bar-copy]';
const CONNECT_PATTERN = /\bconnect\s+\S/i;
const CAPTURE_TIMEOUT_MS = 3000;

// Interactions after which the clipboard is usually writable again.
const RETRY_EVENTS = ['pointerdown', 'keydown', 'focus'] as const;

export function copyServerIp({ t, isAlive, toast, feature, isMatchPage }: Common) {
  // Match whose server bar was already handled; reset when the bar goes away,
  // so a server bar shown again is copied again.
  let handledMatch: string | null = null;
  // Command copied from the current server bar.
  let command: string | null = null;
  let retrying = false;

  function copyButton() {
    if (!isMatchPage()) return null;
    const button = document.querySelector<HTMLButtonElement>(COPY_BUTTON_SELECTOR);
    return button && !button.disabled ? button : null;
  }

  // Clicks the site's copy button and returns the text it tried to copy, or null.
  function captureCommand(button: HTMLElement) {
    return new Promise<string | null>((resolve) => {
      const finish = (text: string | null) => {
        clearTimeout(timer);
        document.removeEventListener('deafcs:copied', onCopied);
        document.dispatchEvent(new CustomEvent('deafcs:capture-end'));
        resolve(text);
      };
      const onCopied = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        finish(typeof detail === 'string' ? detail.trim() : null);
      };
      const timer = setTimeout(() => finish(null), CAPTURE_TIMEOUT_MS);

      document.addEventListener('deafcs:copied', onCopied);
      document.dispatchEvent(new CustomEvent('deafcs:capture-start'));
      button.click();
    });
  }

  async function writeClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for pages without focus / user activation.
      // select() steals focus, so give it back (e.g. to a chat input the user is typing in).
      const prevFocus = document.activeElement;
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      if (prevFocus instanceof HTMLElement && prevFocus !== document.body) prevFocus.focus({ preventScroll: true });
      return ok;
    }
  }

  async function copy(text: string) {
    if (!(await writeClipboard(text))) return false;
    toast(t('ipCopied'));
    log('copy-server-ip: copied', text);
    return true;
  }

  // Clipboard needs focus/user activation; retry on interactions until a copy succeeds
  // (a single failed retry used to drop the copy for good).
  function retryOnInteraction(text: string) {
    if (retrying) return;
    retrying = true;
    let busy = false;

    const done = () => {
      retrying = false;
      for (const type of RETRY_EVENTS) window.removeEventListener(type, retry, true);
    };
    async function retry() {
      if (busy) return;
      if (!isOn() || !isAlive() || !copyButton() || command !== text) return done();
      busy = true;
      try {
        if (await copy(text)) done();
      } finally {
        busy = false;
      }
    }

    for (const type of RETRY_EVENTS) window.addEventListener(type, retry, true);
  }

  async function check() {
    const button = copyButton();
    if (!button) {
      handledMatch = null;
      command = null;
      return;
    }
    const match = location.pathname;
    if (handledMatch === match) return;
    handledMatch = match;
    command = null;

    const text = await captureCommand(button);
    if (handledMatch !== match || !isOn() || !isAlive()) return;
    if (!text || !CONNECT_PATTERN.test(text)) {
      warn('copy-server-ip: no connect command from the copy button', text);
      return;
    }
    command = text;
    if (!(await copy(text))) {
      log('copy-server-ip: clipboard blocked, will retry on interaction');
      retryOnInteraction(text);
    }
  }

  const isOn = feature('copyServerIp', 'copy-server-ip', {
    check,
    observe: { childList: true, subtree: true },
  });

  log('copy-server-ip loaded');
}
