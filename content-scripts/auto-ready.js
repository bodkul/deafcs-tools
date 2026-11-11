(() => {
  const { isAlive, onSettings, isVisible, matchFoundDialogs } = window.DeafCS;

  const READY_BUTTON_SELECTOR = "button.tac-amber-cta";
  const READY_BUTTON_TEXT = /^\s*ready\s*$/i;
  const JITTER_MS = 700;

  let enabled = false;
  let observer = null;
  let delaySec = DEAFCS_DEFAULTS.autoReadyDelaySec;
  // State of the current Match Found, reset once the dialog is gone. Kept by time, not by
  // element: the site re-renders the dialog while the "N / 10 Confirmed" counter changes.
  let clickAt = 0;
  let clicked = false;

  function findReadyButton() {
    for (const dialog of matchFoundDialogs()) {
      const button =
        dialog.querySelector(READY_BUTTON_SELECTOR) ||
        [...dialog.querySelectorAll("button")].find((b) => READY_BUTTON_TEXT.test(b.textContent));
      if (button && !button.disabled && isVisible(button)) return button;
    }
    return null;
  }

  function check() {
    if (!enabled || !isAlive()) return;
    const button = findReadyButton();
    if (!button) {
      clickAt = 0;
      clicked = false;
      return;
    }
    if (clicked) return;

    if (!clickAt) {
      const ms = delaySec * 1000 + Math.random() * JITTER_MS;
      clickAt = Date.now() + ms;
      deafcsLog(`auto-ready: Match Found, clicking Ready in ~${delaySec}s`);
      setTimeout(check, ms);
    }
    if (Date.now() < clickAt) return;

    clicked = true;
    button.click();
    deafcsLog("auto-ready: clicked Ready");
  }

  onSettings((settings) => {
    delaySec = deafcsClamp("autoReadyDelaySec", settings.autoReadyDelaySec);
    enabled = !!settings.autoReady;

    if (enabled && !observer) {
      // Called on every mutation, not coalesced through a timer: in a background tab Chrome
      // throttles timers hard, while the site's countdown ticks (characterData) keep coming.
      observer = new MutationObserver(() => (isAlive() ? check() : observer?.disconnect()));
      observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
      check();
      deafcsLog("auto-ready: enabled");
    } else if (!enabled && observer) {
      observer.disconnect();
      observer = null;
      clickAt = 0;
      clicked = false;
      deafcsLog("auto-ready: disabled");
    }
  });

  deafcsLog("auto-ready.js loaded");
})();
