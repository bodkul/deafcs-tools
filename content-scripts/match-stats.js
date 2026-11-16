(() => {
  const { feature, t, isMatchPage } = window.DeafCS;

  // Recent form of the match players, from csdeaf.com (which reads the deafcs.net API): K/D, ADR,
  // win and headshot rate next to every free player on the captain pick, and each team's win rate
  // per map on the map veto. Counted over the newest 30 matches in the queue of this match
  // (Competitive, Pro, Wingman and Duel apart).
  const STATS_URL = "https://api.csdeaf.com/api/deafcs/stats";
  const MAX_IDS = 10; // per request, the server's limit
  const FRESH_MS = 5 * 60_000; // the server caches 5 minutes too
  const RETRY_MS = 60_000; // after a failed request

  const HEADER_FACTS = '[data-testid="match-header-facts"]'; // "Competitive · Best of 1 · FRANKFURT #2"
  const PRO_BADGE = '[data-queue-variant="Pro"]'; // next to the header facts
  const TEAM_SELECTORS = ['[data-testid="overview-team-1"]', '[data-testid="overview-team-2"]'];
  const MIDDLE = '[data-testid="overview-middle"]'; // free players while captains pick
  const PICK_CARD = '[data-testid^="captain-pick-player-"]';
  const VETO_MAP = '[data-testid^="veto-map-"]';
  const PLAYER_LINK = 'a[href^="/players/"]';

  const MARK = "data-deafcs-stats";
  const STYLE_ID = "deafcs-match-stats";

  // The pick card is a fixed-height row (avatar, name, ELO) with no room to spare: the stats go
  // on a line of their own under it, inside the card's border. No max-width on the line: it caps
  // the 100% basis, and then the line fits next to the name (which shrinks to nothing) and never wraps.
  const CSS = `
    .draft-player-card:has(> [${MARK}="player"]) {
      height: auto !important;
      min-height: 3.5rem;
      flex-wrap: wrap;
      row-gap: 0;
      padding-bottom: 6px;
    }
    [${MARK}="player"] {
      flex: 0 0 100%;
      display: flex;
      justify-content: space-between;
      gap: 6px;
      padding: 0 2px;
      font: 500 11px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif;
      font-variant-numeric: tabular-nums;
      color: hsl(var(--muted-foreground));
      white-space: nowrap;
    }
    [${MARK}="player"] b { color: hsl(var(--foreground)); font-weight: 600; }
    /* One row per team: "PT  80%  из 5" (team tag in the team's color, win rate, matches). */
    [${MARK}="map"] {
      position: absolute;
      top: 6px;
      right: 6px;
      z-index: 2;
      display: grid;
      grid-template-columns: auto auto auto;
      align-items: baseline;
      column-gap: 5px;
      row-gap: 2px;
      padding: 4px 6px;
      border-radius: 6px;
      background: rgb(0 0 0 / 0.75);
      color: #fff;
      font: 600 11px/1.15 system-ui, -apple-system, "Segoe UI", sans-serif;
      font-variant-numeric: tabular-nums;
      pointer-events: auto;
    }
    [${MARK}="map"] .tag { font-weight: 700; color: var(--team, #fff); }
    [${MARK}="map"] .rate { text-align: right; }
    [${MARK}="map"] .rate.best { color: hsl(142 70% 60%); }
    [${MARK}="map"] .n { font-size: 10px; font-weight: 500; opacity: 0.65; }
  `;

  // "queue:steamId" -> { form, at }; failed lookups -> { form: null, at }.
  const forms = new Map();
  const pending = new Set();

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  // Queue of the match on this page, or null when the header is not there (yet) or unknown.
  function matchQueue() {
    const facts = document.querySelector(HEADER_FACTS);
    if (!facts) return null;
    const type = facts.textContent.split("·")[0].trim().toLowerCase();
    if (type === "competitive") return document.querySelector(PRO_BADGE) ? "pro" : "competitive";
    if (type === "wingman" || type === "duel") return type;
    return null;
  }

  const QUEUE_NAMES = { competitive: "Competitive", pro: "Pro", wingman: "Wingman", duel: "Duel" };

  const steamIdOf = (link) => link.getAttribute("href").match(/^\/players\/(\d{17})/)?.[1];

  const idsIn = (root) =>
    root ? [...new Set([...root.querySelectorAll(PLAYER_LINK)].map(steamIdOf).filter(Boolean))] : [];

  function cached(queue, id) {
    const entry = forms.get(`${queue}:${id}`);
    if (!entry) return undefined;
    const ttl = entry.form ? FRESH_MS : RETRY_MS;
    return Date.now() - entry.at < ttl ? entry : undefined;
  }

  // Loads forms that are missing or stale, in batches; check() runs again when they arrive.
  function load(queue, ids, rerun) {
    const missing = ids.filter((id) => !cached(queue, id) && !pending.has(`${queue}:${id}`));
    for (let i = 0; i < missing.length; i += MAX_IDS) {
      const batch = missing.slice(i, i + MAX_IDS);
      for (const id of batch) pending.add(`${queue}:${id}`);
      fetch(`${STATS_URL}?ids=${batch.join(",")}&queue=${queue}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          for (const form of data.players) forms.set(`${queue}:${form.steamId}`, { form, at: Date.now() });
        })
        .catch((e) => {
          deafcsWarn("match stats: request failed", e.message);
          for (const id of batch) forms.set(`${queue}:${id}`, { form: null, at: Date.now() });
        })
        .finally(() => {
          for (const id of batch) pending.delete(`${queue}:${id}`);
          rerun();
        });
    }
  }

  const pct = (part, whole) => Math.round((part * 100) / whole);

  // Writes only when something changed, so our own mutations don't loop the observer.
  function put(host, kind, key, html, title) {
    let el = host.querySelector(`:scope > [${MARK}="${kind}"]`);
    if (!el) {
      el = document.createElement("div");
      el.setAttribute(MARK, kind);
      host.appendChild(el);
    }
    if (el.dataset.key === key) return;
    el.dataset.key = key;
    el.innerHTML = html;
    el.title = title;
  }

  function playerBlock(form, queue) {
    const name = QUEUE_NAMES[queue];
    if (!form.matches) return { html: "—", title: t("statsNoMatches", { queue: name }) };
    const hs = form.headshotRate == null ? "—" : `${form.headshotRate}%`;
    return {
      html:
        `<span><b>${form.kd.toFixed(2)}</b> K/D</span><span><b>${Math.round(form.adr)}</b> ADR</span>` +
        `<span><b>${pct(form.wins, form.matches)}%</b> WR</span><span><b>${hs}</b> HS</span>`,
      title: t("statsPlayerTitle", {
        matches: form.matches,
        queue: name,
        wins: form.wins,
        losses: form.matches - form.wins
      })
    };
  }

  function renderPick(queue) {
    for (const card of document.querySelectorAll(PICK_CARD)) {
      const id = card.dataset.testid.slice("captain-pick-player-".length);
      const host = card.querySelector(".draft-player-card") || card.firstElementChild;
      const form = cached(queue, id)?.form;
      if (!host || !form) continue;
      const { html, title } = playerBlock(form, queue);
      put(host, "player", `${queue}:${id}:${form.matches}:${form.kd}:${form.adr}:${form.wins}:${form.headshotRate}`, html, title);
    }
  }

  // Map record of a team: wins and matches of its players on the map, added up.
  function teamRecord(queue, ids, map) {
    let matches = 0;
    let wins = 0;
    let known = 0;
    for (const id of ids) {
      const form = cached(queue, id)?.form;
      if (!form) continue;
      known++;
      const record = form.maps.find((m) => m.map === map);
      if (record) {
        matches += record.matches;
        wins += record.wins;
      }
    }
    return { matches, wins, known };
  }

  // "de_mirage" from the tile's poster, /img/maps/screenshots/de_mirage.webp.
  const mapOf = (tile) => tile.querySelector("img")?.getAttribute("src")?.match(/\/([\w-]+)\.\w+(?:\?|$)/)?.[1];

  // Tag ("PT"), name and color of each team, as the site shows them: the tag on the pick ledger,
  // the color in the team panel's --accent (an "h s% l%" triple). Falls back to 1/2 and white.
  function teamLabels() {
    return TEAM_SELECTORS.map((sel, i) => {
      const ledger = document.querySelector(`[data-testid="captain-pick-ledger-tag"][data-lineup="${i + 1}"]`);
      const panel = document.querySelector(sel);
      const accent = panel ? getComputedStyle(panel).getPropertyValue("--accent").trim() : "";
      const name = panel?.querySelector("h3")?.textContent.trim() || ledger?.title || `${i + 1}`;
      return {
        tag: escapeHtml(ledger?.textContent.trim() || `${i + 1}`),
        name,
        color: /^[\d.]+(deg)?\s+[\d.]+%\s+[\d.]+%$/.test(accent) ? `hsl(${accent})` : "#fff"
      };
    });
  }

  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  function renderVeto(queue, teams) {
    const labels = teamLabels();
    for (const tile of document.querySelectorAll(VETO_MAP)) {
      const map = mapOf(tile);
      if (!map || tile.dataset.state === "banned") {
        tile.querySelector(`:scope > [${MARK}]`)?.remove();
        continue;
      }
      const records = teams.map((ids) => teamRecord(queue, ids, map));
      if (records.some((r) => !r.known)) continue;
      const rates = records.map((r) => (r.matches ? pct(r.wins, r.matches) : null));
      const best = rates[0] != null && rates[1] != null && rates[0] !== rates[1] ? (rates[0] > rates[1] ? 0 : 1) : -1;
      const html = records
        .map((r, i) => {
          const { tag, color } = labels[i];
          return (
            `<span class="tag" style="--team:${color}">${tag}</span>` +
            `<span class="rate${i === best ? " best" : ""}">${rates[i] == null ? "—" : `${rates[i]}%`}</span>` +
            `<span class="n">${t("statsOfMatches", { n: r.matches })}</span>`
          );
        })
        .join("");
      const line = (i) =>
        `${labels[i].name}: ${rates[i] == null ? t("statsNoMapMatches") : t("statsMapLine", { rate: rates[i], wins: records[i].wins, matches: records[i].matches })}`;
      const title = t("statsMapTitle", { queue: QUEUE_NAMES[queue] }) + `\n${line(0)}\n${line(1)}`;
      if (getComputedStyle(tile).position === "static") tile.style.position = "relative";
      put(tile, "map", `${queue}:${map}:${rates}:${records.map((r) => r.matches)}:${labels.map((l) => l.tag)}`, html, title);
    }
  }

  function check() {
    if (!isMatchPage()) return restore();
    const queue = matchQueue();
    const picking = document.querySelector(PICK_CARD);
    const veto = document.querySelector(VETO_MAP);
    if (!queue || (!picking && !veto)) return;

    const teams = TEAM_SELECTORS.map((sel) => idsIn(document.querySelector(sel)));
    const all = [...new Set([...teams.flat(), ...idsIn(document.querySelector(MIDDLE))])];
    load(queue, all, check);

    ensureStyle();
    if (picking) renderPick(queue);
    if (veto && teams.every((ids) => ids.length)) renderVeto(queue, teams);
  }

  function restore() {
    document.getElementById(STYLE_ID)?.remove();
    for (const el of document.querySelectorAll(`[${MARK}]`)) el.remove();
  }

  feature("matchStats", "match-stats", {
    check,
    observe: { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state"] },
    onDisable: restore
  });

  deafcsLog("match-stats.js loaded");
})();
