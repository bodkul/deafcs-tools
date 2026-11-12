(() => {
  const { feature } = window.DeafCS;

  // Game mode tiles on the play page; each has a seat diagram (role="img", one <i> per seat)
  // and a "<b>N</b> in queue" / "Nobody queued" line. The site lights up only "your" seat;
  // here the dots show how many players are queued instead.
  const TILE_SELECTOR = "button[data-mode-key]";
  // Seat diagrams anywhere: in the tiles and in the panel shown after "Find match".
  const DIAGRAM_SELECTOR = '[role="img"]:has(> span > i.rounded-full)';
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

  // Matchmaking screen after "Find match": the tiles are gone, and the count is in a line next to
  // the diagram, "FRANKFURT #2 · 7 in queue".
  const IN_QUEUE = /(?:^|[^\d#])(\d+)\s+in queue/i;

  // Climbs from the diagram while the ancestor holds no other diagram, and takes the number from
  // the innermost element whose text has "N in queue". undefined when none is found.
  function searchingCount(diagram) {
    for (let el = diagram.parentElement; el && el !== document.body; el = el.parentElement) {
      if (el.querySelectorAll(DIAGRAM_SELECTOR).length > 1) return undefined;
      if (!IN_QUEUE.test(el.textContent)) continue;
      let line = el;
      for (let inner = line; inner; ) {
        line = inner;
        inner = [...line.children].find((c) => IN_QUEUE.test(c.textContent));
      }
      return Number(line.textContent.match(IN_QUEUE)[1]);
    }
    return undefined;
  }

  function setDot(dot, state) {
    if (state === null) dot.removeAttribute(DOT_ATTR);
    else if (dot.getAttribute(DOT_ATTR) !== state) dot.setAttribute(DOT_ATTR, state);
  }

  function check() {
    const diagrams = document.querySelectorAll(DIAGRAM_SELECTOR);
    if (!diagrams.length) return;
    ensureStyle();
    for (const diagram of diagrams) {
      const tile = diagram.closest(TILE_SELECTOR);
      const count = tile ? queuedCount(tile) : searchingCount(diagram);
      diagram.querySelectorAll("i").forEach((dot, i) => {
        // Unknown count (no matching tile on the page): leave the site's own look.
        setDot(dot, count === undefined ? null : i < count ? "on" : "off");
      });
    }
  }

  // Back to the site's own look.
  function restore() {
    document.getElementById(STYLE_ID)?.remove();
    for (const dot of document.querySelectorAll(`i[${DOT_ATTR}]`)) dot.removeAttribute(DOT_ATTR);
  }

  feature("queueDots", "queue-dots", {
    check,
    // characterData: the queue number changes as text inside an existing <b>.
    observe: { childList: true, subtree: true, characterData: true },
    onDisable: restore
  });

  deafcsLog("queue-dots.js loaded");
})();
