(() => {
  const { onSettings, observeDom, runCheck } = window.DeafCS;

  // Game mode tiles on the play page; each has a seat diagram (role="img", one <i> per seat)
  // and a "<b>N</b> in queue" / "Nobody queued" line. The site lights up only "your" seat;
  // here the dots show how many players are queued instead.
  const TILE_SELECTOR = "button[data-mode-key]";
  const DOTS_SELECTOR = '[role="img"] i';
  const DOT_ATTR = "data-deafcs-dot";
  const STYLE_ID = "deafcs-queue-dots";

  // Inline !important beats the site's "!bg-..." utility; i[attr] also outranks it by specificity.
  const CSS = `
    i[${DOT_ATTR}="on"] {
      background-color: rgb(var(--mode-rgb, 245 158 11)) !important;
      box-shadow: none !important;
    }
    i[${DOT_ATTR}="off"] {
      background-color: hsl(var(--foreground) / 0.13) !important;
      box-shadow: inset 0 0 0 1px hsl(var(--foreground) / 0.08) !important;
    }
  `;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  // Number from "<b>N</b> in queue"; "Nobody queued" has no <b>. Text-free, so it works in any site language.
  function queuedCount(tile) {
    for (const b of tile.querySelectorAll("b")) {
      const text = b.textContent.trim();
      if (/^\d+$/.test(text)) return Number(text);
    }
    return 0;
  }

  function check() {
    const tiles = document.querySelectorAll(TILE_SELECTOR);
    if (!tiles.length) return;
    ensureStyle();
    for (const tile of tiles) {
      const count = queuedCount(tile);
      tile.querySelectorAll(DOTS_SELECTOR).forEach((dot, i) => {
        const state = i < count ? "on" : "off";
        if (dot.getAttribute(DOT_ATTR) !== state) dot.setAttribute(DOT_ATTR, state);
      });
    }
  }

  // Back to the site's own look.
  function restore() {
    document.getElementById(STYLE_ID)?.remove();
    for (const dot of document.querySelectorAll(`i[${DOT_ATTR}]`)) dot.removeAttribute(DOT_ATTR);
  }

  let observer = null;

  onSettings((settings) => {
    if (settings.queueDots && !observer) {
      // characterData: the queue number changes as text inside an existing <b>.
      observer = observeDom(check, { childList: true, subtree: true, characterData: true });
      runCheck(check);
      deafcsLog("queue-dots: enabled");
    } else if (!settings.queueDots && observer) {
      observer.disconnect();
      observer = null;
      restore();
      deafcsLog("queue-dots: disabled");
    }
  });

  deafcsLog("queue-dots.js loaded");
})();
