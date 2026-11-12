(() => {
  const { feature } = window.DeafCS;

  // Match history on a player page: https://deafcs.net/players/<id>. Each match is a
  // "group/row" card; a cancelled one has a "Cancelled" status badge instead of a score.
  const PLAYER_PAGE_PATH = /^\/players\//;
  const ROW_SELECTOR = ".group\\/row";
  const STATUS_SELECTOR = ".result-cell .result-status";
  const CANCELLED_TEXT = /cancel|отмен/i;
  const HIDDEN_ATTR = "data-deafcs-hidden";
  const STYLE_ID = "deafcs-hide-cancelled";

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `[${HIDDEN_ATTR}] { display: none !important; }`;
    (document.head || document.documentElement).appendChild(style);
  }

  const isCancelled = (row) =>
    [...row.querySelectorAll(STATUS_SELECTOR)].some((s) => CANCELLED_TEXT.test(s.textContent));

  function setHidden(row, hidden) {
    if (hidden) {
      if (!row.hasAttribute(HIDDEN_ATTR)) row.setAttribute(HIDDEN_ATTR, "");
    } else if (row.hasAttribute(HIDDEN_ATTR)) {
      row.removeAttribute(HIDDEN_ATTR);
    }
  }

  function check() {
    // The site navigates without reloading, so rows hidden on a player page must come back elsewhere.
    if (!PLAYER_PAGE_PATH.test(location.pathname)) return restore();
    const rows = document.querySelectorAll(ROW_SELECTOR);
    if (!rows.length) return;
    ensureStyle();
    // Vue reuses row elements when paging, so every row is rechecked, not only new ones.
    for (const row of rows) setHidden(row, isCancelled(row));
  }

  function restore() {
    document.getElementById(STYLE_ID)?.remove();
    for (const row of document.querySelectorAll(`[${HIDDEN_ATTR}]`)) row.removeAttribute(HIDDEN_ATTR);
  }

  feature("hideCancelled", "hide-cancelled", {
    check,
    // characterData: Vue may patch the status text in place when the page of matches changes.
    observe: { childList: true, subtree: true, characterData: true },
    onDisable: restore
  });

  deafcsLog("hide-cancelled.js loaded");
})();
