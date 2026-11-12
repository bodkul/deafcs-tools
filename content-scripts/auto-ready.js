(() => {
  const { isAlive, onSettings, isVisible, feature, matchFoundDialogs } = window.DeafCS;

  const READY_BUTTON_SELECTOR = "button.tac-amber-cta";
  const READY_BUTTON_TEXT = /^\s*ready\s*$/i;
  const JITTER_MS = 700;

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
    if (!isOn() || !isAlive()) return;
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

  // Registered before feature(), so the delay is up to date when the first check runs.
  onSettings((settings) => {
    delaySec = deafcsClamp("autoReadyDelaySec", settings.autoReadyDelaySec);
  });

  const isOn = feature("autoReady", "auto-ready", {
    check,
    observe: { childList: true, subtree: true, characterData: true },
    // On every mutation, not coalesced through a timer: in a background tab Chrome throttles
    // timers hard, while the site's countdown ticks (characterData) keep coming.
    immediate: true,
    onDisable: () => {
      clickAt = 0;
      clicked = false;
    }
  });

  deafcsLog("auto-ready.js loaded");
})();
