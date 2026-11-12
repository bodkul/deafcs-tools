(() => {
  const { t, isAlive, toast, feature, isMatchPage, joinLink } = window.DeafCS;

  // Copy-IP button on the match-started screen; the site copies this attribute itself.
  const CLIPBOARD_SELECTOR = '[data-clipboard-text^="connect "]';
  // Host is an IPv4 address, a bracketed IPv6 one ("[2a01:4f8::1]") or a domain name; port optional.
  const CONNECT_PATTERN = /connect\s+((?:\[[\da-f:.]+\]|[a-z\d-]+(?:\.[a-z\d-]+)+)(?::\d{1,5})?)/i;

  // Interactions after which the clipboard is usually writable again.
  const RETRY_EVENTS = ["pointerdown", "keydown", "focus"];

  // Command currently shown on the page; reset when the screen goes away,
  // so the next match on the same server is copied again.
  let lastCopied = null;
  let retrying = false;

  function safeDecode(text) {
    try {
      return decodeURIComponent(text);
    } catch {
      return text;
    }
  }

  // Returns the console command "connect IP:PORT", or null if the screen isn't shown.
  function findConnect() {
    if (!isMatchPage()) return null;
    const source =
      document.querySelector(CLIPBOARD_SELECTOR)?.getAttribute("data-clipboard-text") ??
      // "Join Server" link as a backup source.
      safeDecode(joinLink()?.getAttribute("href") ?? "");
    const match = source.match(CONNECT_PATTERN);
    return match ? `connect ${match[1]}` : null;
  }

  async function writeClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for pages without focus / user activation.
      // select() steals focus, so give it back (e.g. to a chat input the user is typing in).
      const prevFocus = document.activeElement;
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (prevFocus instanceof HTMLElement && prevFocus !== document.body) prevFocus.focus({ preventScroll: true });
      return ok;
    }
  }

  async function copy(text) {
    if (!(await writeClipboard(text))) return false;
    toast(t("ipCopied"));
    deafcsLog("copy-server-ip: copied", text);
    return true;
  }

  // Clipboard needs focus/user activation; retry on interactions until a copy succeeds
  // (a single failed retry used to drop the copy for good).
  function retryOnInteraction() {
    if (retrying) return;
    retrying = true;
    let busy = false;

    const done = () => {
      retrying = false;
      for (const type of RETRY_EVENTS) window.removeEventListener(type, retry, true);
    };
    async function retry() {
      if (busy) return;
      const command = findConnect();
      if (!isOn() || !isAlive() || !command) return done();
      if (command !== lastCopied) return; // check() handles a new command itself
      busy = true;
      try {
        if (await copy(command)) done();
      } finally {
        busy = false;
      }
    }

    for (const type of RETRY_EVENTS) window.addEventListener(type, retry, true);
  }

  async function check() {
    const command = findConnect();
    if (!command) {
      lastCopied = null;
      return;
    }
    if (command === lastCopied) return;
    lastCopied = command;
    if (!(await copy(command))) {
      deafcsLog("copy-server-ip: clipboard blocked, will retry on interaction");
      retryOnInteraction();
    }
  }

  const isOn = feature("copyServerIp", "copy-server-ip", {
    check,
    observe: { childList: true, subtree: true, characterData: true }
  });

  deafcsLog("copy-server-ip.js loaded");
})();
