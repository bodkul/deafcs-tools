import { log, warn, type StringKey } from '@/utils/shared';
import type { Common } from './common';

// Recent form of the match players, from csdeaf.com (which reads the deafcs.net API): K/D, ADR,
// win and headshot rate on every player card from the captain pick through the veto (free players
// and team panels) and under every player on the scoreboard while the server bar is up (warmup
// and live), and each team's win rate, K/D and ADR on every map of the map veto (team 1 on
// the left of the tile, team 2 on the right). Counted over the newest 30 matches in the queue of
// this match (Competitive, Pro, Wingman and Duel apart). Also: each player's roles (sniper, entry,
// clutcher, support, anchor, worked out by the server) under their stats, the team's averages
// under its panel header, and on the veto the map each team should ban or keep.
const STATS_URL = 'https://api.csdeaf.com/api/deafcs/stats';
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
// The pick and veto panels are gone once the server is up; the scoreboard tab (one tbody per
// team, the player in the first, sticky cell) is all that lists the players then. Only while the
// server bar is shown, so finished matches keep their scoreboard as it is.
const SERVER_BAR = '[data-server-bar]';
const BOARD_ROW = '[id$="-content-scoreboard"] tbody > tr';

const MARK = 'data-deafcs-stats';
const STYLE_ID = 'deafcs-match-stats';

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
    font: 500 12px/1.25 system-ui, -apple-system, "Segoe UI", sans-serif;
    font-variant-numeric: tabular-nums;
    color: hsl(var(--muted-foreground));
    white-space: nowrap;
  }
  [${MARK}="player"] b { color: hsl(var(--foreground)); font-weight: 600; }
  /* Roles, one chip each in the role's color: a line of their own on the cards, at the end of
     the scoreboard row. */
  [${MARK}="roles"] {
    flex: 0 0 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 3px 2px 0;
  }
  [${MARK}] .role {
    padding: 1px 5px;
    border-radius: 4px;
    font: 700 10px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    color: var(--role);
    background: color-mix(in srgb, var(--role) 18%, transparent);
  }
  /* Team averages under the panel header (name, average ELO), above the slot pips. */
  [${MARK}="team"] {
    display: flex;
    flex-wrap: wrap;
    column-gap: 8px;
    margin: -6px 0 10px;
    font: 500 12px/1.25 system-ui, -apple-system, "Segoe UI", sans-serif;
    font-variant-numeric: tabular-nums;
    color: hsl(var(--muted-foreground));
  }
  [${MARK}="team"] b { color: hsl(var(--foreground)); font-weight: 600; }
  /* Under the player in the scoreboard's name cell (220px, 110px on phones: wraps there).
     The margin clears the career level badge, which hangs 6px below the avatar. */
  [${MARK}="row"] {
    display: flex;
    flex-wrap: wrap;
    column-gap: 7px;
    margin-top: 6px;
    font: 500 12px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif;
    font-variant-numeric: tabular-nums;
    color: hsl(var(--foreground) / 0.6);
  }
  [${MARK}="row"] > span { white-space: nowrap; }
  [${MARK}="row"] b { color: hsl(var(--foreground)); font-weight: 600; }
  /* One block per team, team 1 in the tile's top left corner and team 2 in the top right: the
     team tag in the team's color, then value and label rows (win rate with its matches, K/D,
     ADR). The better of the two teams' values is green. */
  [${MARK}^="map-"] {
    position: absolute;
    top: 6px;
    z-index: 2;
    display: grid;
    grid-template-columns: auto auto;
    align-items: baseline;
    column-gap: 4px;
    row-gap: 1px;
    padding: 4px 6px;
    border-radius: 6px;
    background: rgb(0 0 0 / 0.75);
    color: #fff;
    font: 600 11px/1.15 system-ui, -apple-system, "Segoe UI", sans-serif;
    font-variant-numeric: tabular-nums;
    pointer-events: auto;
  }
  [${MARK}="map-1"] { left: 6px; }
  [${MARK}="map-2"] { right: 6px; }
  [${MARK}^="map-"] .tag { grid-column: 1 / -1; font-weight: 700; color: var(--team, #fff); }
  [${MARK}^="map-"] .v { text-align: right; }
  [${MARK}^="map-"] .v.best { color: hsl(142 70% 60%); }
  [${MARK}^="map-"] .l { font-size: 10px; font-weight: 500; opacity: 0.65; }
  [${MARK}^="map-"] .hint {
    margin-left: 5px;
    padding: 0 4px;
    border-radius: 3px;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #fff;
  }
  [${MARK}^="map-"] .hint.ban { background: hsl(0 70% 48%); }
  [${MARK}^="map-"] .hint.pick { background: hsl(142 60% 34%); }
`;

type Queue = 'competitive' | 'pro' | 'wingman' | 'duel';

const QUEUE_NAMES: Record<Queue, string> = { competitive: 'Competitive', pro: 'Pro', wingman: 'Wingman', duel: 'Duel' };

// The sums came with the K/D and ADR on the veto; an older API sends only matches and wins.
interface MapRecord {
  map: string;
  matches: number;
  wins: number;
  kills?: number;
  deaths?: number;
  damage?: number;
  rounds?: number;
}

interface PlayerForm {
  steamId: string;
  matches: number;
  wins: number;
  kd: number;
  adr: number;
  headshotRate: number | null;
  maps: MapRecord[];
  roles?: string[] | null; // an older API (or its cached answer) has none
}

// Roles the server gives out, with their chip color and the hint that explains them.
const ROLES: Record<string, { color: string; hint: StringKey }> = {
  sniper: { color: 'hsl(0 80% 66%)', hint: 'roleSniper' },
  entry: { color: 'hsl(28 95% 60%)', hint: 'roleEntry' },
  clutcher: { color: 'hsl(275 75% 72%)', hint: 'roleClutcher' },
  support: { color: 'hsl(170 65% 50%)', hint: 'roleSupport' },
  anchor: { color: 'hsl(210 90% 66%)', hint: 'roleAnchor' },
};

// Matches both teams need on a map before the veto suggests banning or keeping it.
const HINT_MIN_MATCHES = 3;

interface CacheEntry {
  form: PlayerForm | null;
  at: number;
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);
}

// Queue of the match on this page, or null when the header is not there (yet) or unknown.
function matchQueue(): Queue | null {
  const facts = document.querySelector(HEADER_FACTS);
  if (!facts) return null;
  const type = (facts.textContent ?? '').split('·')[0]!.trim().toLowerCase();
  if (type === 'competitive') return document.querySelector(PRO_BADGE) ? 'pro' : 'competitive';
  if (type === 'wingman' || type === 'duel') return type;
  return null;
}

const steamIdOf = (link: Element) => link.getAttribute('href')!.match(/^\/players\/(\d{17})/)?.[1];

const idsIn = (root: Element | null): string[] =>
  root
    ? [...new Set([...root.querySelectorAll(PLAYER_LINK)].map(steamIdOf).filter((id): id is string => !!id))]
    : [];

// Name cells of the scoreboard with their player's Steam ID, while the server bar is shown.
function boardCells() {
  if (!document.querySelector(SERVER_BAR)) return [];
  return [...document.querySelectorAll<HTMLTableRowElement>(BOARD_ROW)].flatMap((row) => {
    const cell = row.cells[0];
    const link = cell?.querySelector(PLAYER_LINK);
    const id = link && steamIdOf(link);
    return cell && id ? [{ cell, id }] : [];
  });
}

const pct = (part: number, whole: number) => Math.round((part * 100) / whole);

// Builds an element. Strings go in as text, never as HTML: API values can't inject markup.
function h(tag: string, attrs: Record<string, string>, ...children: (Node | string)[]) {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  el.append(...children);
  return el;
}

// Writes only when something changed, so our own mutations don't loop the observer. The element
// is a child of host, at the end unless place puts it elsewhere in host.
function put(
  host: Element,
  kind: string,
  key: string,
  content: (Node | string)[],
  title: string,
  place: (el: HTMLElement) => void = (el) => host.appendChild(el),
) {
  let el = host.querySelector<HTMLElement>(`:scope > [${MARK}="${kind}"]`);
  if (!el) {
    el = document.createElement('div');
    el.setAttribute(MARK, kind);
    place(el);
  }
  if (el.dataset.key === key) return;
  el.dataset.key = key;
  el.replaceChildren(...content);
  el.title = title;
}

// "de_mirage" from the tile's poster, /img/maps/screenshots/de_mirage.webp.
const mapOf = (tile: Element) =>
  tile
    .querySelector('img')
    ?.getAttribute('src')
    ?.match(/\/([\w-]+)\.\w+(?:\?|$)/)?.[1];

// Tag ("PT"), name and color of each team, as the site shows them: the tag on the pick ledger,
// the color in the team panel's --accent (an "h s% l%" triple). Falls back to 1/2 and white.
function teamLabels() {
  return TEAM_SELECTORS.map((sel, i) => {
    const ledger = document.querySelector<HTMLElement>(
      `[data-testid="captain-pick-ledger-tag"][data-lineup="${i + 1}"]`,
    );
    const panel = document.querySelector(sel);
    const accent = panel ? getComputedStyle(panel).getPropertyValue('--accent').trim() : '';
    const name = panel?.querySelector('h3')?.textContent?.trim() || ledger?.title || `${i + 1}`;
    return {
      tag: ledger?.textContent?.trim() || `${i + 1}`,
      name,
      color: /^[\d.]+(deg)?\s+[\d.]+%\s+[\d.]+%$/.test(accent) ? `hsl(${accent})` : '#fff',
    };
  });
}

function restore() {
  document.getElementById(STYLE_ID)?.remove();
  for (const el of document.querySelectorAll(`[${MARK}]`)) el.remove();
}

export function matchStats({ feature, t, isMatchPage }: Common) {
  // "queue:steamId" -> { form, at }; failed lookups -> { form: null, at }.
  const forms = new Map<string, CacheEntry>();
  const pending = new Set<string>();

  function cached(queue: Queue, id: string) {
    const entry = forms.get(`${queue}:${id}`);
    if (!entry) return undefined;
    const ttl = entry.form ? FRESH_MS : RETRY_MS;
    return Date.now() - entry.at < ttl ? entry : undefined;
  }

  // Loads forms that are missing or stale, in batches; check() runs again when they arrive.
  function load(queue: Queue, ids: string[], rerun: () => void) {
    const missing = ids.filter((id) => !cached(queue, id) && !pending.has(`${queue}:${id}`));
    for (let i = 0; i < missing.length; i += MAX_IDS) {
      const batch = missing.slice(i, i + MAX_IDS);
      for (const id of batch) pending.add(`${queue}:${id}`);
      fetch(`${STATS_URL}?ids=${batch.join(',')}&queue=${queue}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<{ players: PlayerForm[] }>;
        })
        .then((data) => {
          for (const form of data.players) forms.set(`${queue}:${form.steamId}`, { form, at: Date.now() });
        })
        .catch((e) => {
          warn('match stats: request failed', e.message);
          for (const id of batch) forms.set(`${queue}:${id}`, { form: null, at: Date.now() });
        })
        .finally(() => {
          for (const id of batch) pending.delete(`${queue}:${id}`);
          rerun();
        });
    }
  }

  function playerBlock(form: PlayerForm, queue: Queue) {
    const name = QUEUE_NAMES[queue];
    if (!form.matches) return { content: ['—'], title: t('statsNoMatches', { queue: name }) };
    const hs = form.headshotRate == null ? '—' : `${form.headshotRate}%`;
    const stat = (value: string, label: string) => h('span', {}, h('b', {}, value), ` ${label}`);
    return {
      content: [
        stat(Number(form.kd).toFixed(2), 'K/D'),
        stat(String(Math.round(form.adr)), 'ADR'),
        stat(`${pct(form.wins, form.matches)}%`, 'WR'),
        stat(hs, 'HS'),
      ],
      title: t('statsPlayerTitle', {
        matches: form.matches,
        queue: name,
        wins: form.wins,
        losses: form.matches - form.wins,
      }),
    };
  }

  function roleChips(form: PlayerForm) {
    return (form.roles ?? []).flatMap((role) => {
      const known = ROLES[role];
      return known ? [h('span', { class: 'role', style: `--role:${known.color}`, title: t(known.hint) }, role)] : [];
    });
  }

  // The stats; on the cards the roles go on a line of their own, on the scoreboard row at its end.
  function renderForm(host: Element, kind: 'player' | 'row', queue: Queue, id: string) {
    const form = cached(queue, id)?.form;
    if (!form) return;
    const { content, title } = playerBlock(form, queue);
    const chips = roleChips(form);
    const key = `${queue}:${id}:${form.matches}:${form.kd}:${form.adr}:${form.wins}:${form.headshotRate}:${form.roles}`;
    if (kind === 'row') return put(host, kind, key, [...content, ...chips], title);
    put(host, kind, key, content, title);
    if (chips.length) put(host, 'roles', key, chips, '');
    else host.querySelector(`:scope > [${MARK}="roles"]`)?.remove();
  }

  // Averages of a team's players with matches in the queue, under the panel header.
  function renderTeamSummary(queue: Queue, panel: Element, ids: string[]) {
    const header = panel.querySelector('h3')?.parentElement?.parentElement;
    if (!header || header.parentElement !== panel) return;
    const forms = ids.map((id) => cached(queue, id)?.form).filter((f): f is PlayerForm => !!f?.matches);
    if (!forms.length) {
      panel.querySelector(`:scope > [${MARK}="team"]`)?.remove();
      return;
    }
    const avg = (pick: (f: PlayerForm) => number) => forms.reduce((sum, f) => sum + pick(f), 0) / forms.length;
    const matches = forms.reduce((sum, f) => sum + f.matches, 0);
    const wins = forms.reduce((sum, f) => sum + f.wins, 0);
    const stat = (value: string, label: string) => h('span', {}, h('b', {}, value), ` ${label}`);
    const kd = avg((f) => Number(f.kd)).toFixed(2);
    const adr = String(Math.round(avg((f) => f.adr)));
    const wr = `${pct(wins, matches)}%`;
    put(
      panel,
      'team',
      `${queue}:${forms.length}:${kd}:${adr}:${wr}`,
      [stat(kd, 'K/D'), stat(adr, 'ADR'), stat(wr, 'WR')],
      t('statsTeamTitle', { n: forms.length, queue: QUEUE_NAMES[queue] }),
      (el) => header.after(el),
    );
  }

  function renderPick(queue: Queue) {
    for (const card of document.querySelectorAll<HTMLElement>(PICK_CARD)) {
      const id = card.dataset.testid!.slice('captain-pick-player-'.length);
      const host = card.querySelector('.draft-player-card') || card.firstElementChild;
      if (host) renderForm(host, 'player', queue, id);
    }
  }

  // Picked players, in their team's panel: the same cards as on the pick, from the first pick
  // through the veto.
  function renderTeams(queue: Queue, teams: string[][]) {
    TEAM_SELECTORS.forEach((sel, i) => {
      for (const card of document.querySelectorAll(`${sel} .draft-player-card`)) {
        const link = card.querySelector(PLAYER_LINK);
        const id = link && steamIdOf(link);
        if (id) renderForm(card, 'player', queue, id);
      }
      const panel = document.querySelector(sel);
      if (panel) renderTeamSummary(queue, panel, teams[i]!);
    });
  }

  function renderBoard(queue: Queue, cells: { cell: Element; id: string }[]) {
    for (const { cell, id } of cells) renderForm(cell, 'row', queue, id);
  }

  // Map record of a team: its players' matches on the map, added up.
  function teamRecord(queue: Queue, ids: string[], map: string) {
    const sum = { matches: 0, wins: 0, kills: 0, deaths: 0, damage: 0, rounds: 0 };
    let known = 0;
    let detailed = true;
    for (const id of ids) {
      const form = cached(queue, id)?.form;
      if (!form) continue;
      known++;
      const record = form.maps.find((m) => m.map === map);
      if (!record) continue;
      if (record.kills == null) detailed = false;
      for (const key of Object.keys(sum) as (keyof typeof sum)[]) sum[key] += record[key] ?? 0;
    }
    return { ...sum, known, detailed };
  }

  // Win rate, K/D and ADR of a team on a map, as numbers (null when there is nothing to count)
  // and as text.
  function teamStats(r: ReturnType<typeof teamRecord>) {
    const played = r.matches > 0;
    const full = played && r.detailed;
    const wr = played ? pct(r.wins, r.matches) : null;
    const kd = full ? (r.deaths ? r.kills / r.deaths : r.kills) : null;
    const adr = full && r.rounds ? r.damage / r.rounds : null;
    return [
      { value: wr, text: wr == null ? '—' : `${wr}%`, label: t('statsOfMatches', { n: r.matches }) },
      ...(r.detailed
        ? [
            { value: kd, text: kd == null ? '—' : kd.toFixed(2), label: 'K/D' },
            { value: adr, text: adr == null ? '—' : String(Math.round(adr)), label: 'ADR' },
          ]
        : []),
    ];
  }

  // For each team, the map to ban (where the other team's win rate is furthest above its own) and
  // the one to keep (the reverse), among the maps both teams played enough. Nothing when fewer than
  // two maps qualify, so the decider gets no hint.
  function vetoHints(tiles: { map: string; records: ReturnType<typeof teamRecord>[] }[]) {
    const rate = (r: ReturnType<typeof teamRecord>) => r.wins / r.matches;
    const fair = tiles.filter((tile) => tile.records.every((r) => r.matches >= HINT_MIN_MATCHES));
    return [0, 1].map((i) => {
      const hints = new Map<string, 'ban' | 'pick'>();
      if (fair.length < 2) return hints;
      const edges = fair
        .map((tile) => ({ map: tile.map, edge: rate(tile.records[i]!) - rate(tile.records[1 - i]!) }))
        .sort((a, b) => a.edge - b.edge);
      const worst = edges[0]!;
      const best = edges[edges.length - 1]!;
      if (worst.edge < 0) hints.set(worst.map, 'ban');
      if (best.edge > 0) hints.set(best.map, 'pick');
      return hints;
    });
  }

  function renderVeto(queue: Queue, teams: string[][]) {
    const labels = teamLabels();
    const tiles: { tile: HTMLElement; map: string; records: ReturnType<typeof teamRecord>[] }[] = [];
    for (const tile of document.querySelectorAll<HTMLElement>(VETO_MAP)) {
      const map = mapOf(tile);
      if (!map || tile.dataset.state === 'banned') {
        for (const el of tile.querySelectorAll(`:scope > [${MARK}]`)) el.remove();
        continue;
      }
      const records = teams.map((ids) => teamRecord(queue, ids, map));
      if (records.some((r) => !r.known)) continue;
      tiles.push({ tile, map, records });
    }
    const hints = vetoHints(tiles);
    const hintText = (hint: 'ban' | 'pick') => t(hint === 'ban' ? 'statsBan' : 'statsPick');
    const hintTitle = (hint: 'ban' | 'pick') => t(hint === 'ban' ? 'statsBanHint' : 'statsPickHint');

    for (const { tile, map, records } of tiles) {
      // Older API on one side only (a cached answer): show the win rate alone on both.
      const detailed = records.every((r) => r.detailed);
      const stats = records.map((r) => teamStats({ ...r, detailed }));
      const title =
        t('statsMapTitle', { queue: QUEUE_NAMES[queue] }) +
        records
          .map((r, i) => {
            const rows = stats[i]!;
            const line =
              rows[0]!.value == null
                ? t('statsNoMapMatches')
                : [t('statsMapLine', { rate: rows[0]!.value, wins: r.wins, matches: r.matches })]
                    .concat(rows.slice(1).map((row) => `${row.label} ${row.text}`))
                    .join(', ');
            const hint = hints[i]!.get(map);
            return `\n${labels[i]!.name}: ${line}${hint ? ` (${hintTitle(hint)})` : ''}`;
          })
          .join('');
      if (getComputedStyle(tile).position === 'static') tile.style.position = 'relative';
      stats.forEach((rows, i) => {
        const other = stats[1 - i]!;
        const { tag, color } = labels[i]!;
        const hint = hints[i]!.get(map);
        const content = [
          h(
            'span',
            { class: 'tag', style: `--team:${color}` },
            tag,
            ...(hint ? [h('span', { class: `hint ${hint}` }, hintText(hint))] : []),
          ),
          ...rows.flatMap((row, k) => {
            const vs = other[k]?.value;
            const best = row.value != null && vs != null && row.value > vs;
            return [h('span', { class: best ? 'v best' : 'v' }, row.text), h('span', { class: 'l' }, row.label)];
          }),
        ];
        const key = `${queue}:${map}:${tag}:${color}:${hint}:${rows.map((row) => row.text + row.label)}:${other.map((row) => row.text)}`;
        put(tile, `map-${i + 1}`, key, content, title);
      });
    }
  }

  function check() {
    if (!isMatchPage()) return restore();
    const queue = matchQueue();
    const picking = document.querySelector(PICK_CARD);
    const veto = document.querySelector(VETO_MAP);
    const board = boardCells();
    // The server bar went away (match over): the scoreboard has real numbers now.
    if (!board.length) for (const el of document.querySelectorAll(`[${MARK}="row"]`)) el.remove();
    const teams = TEAM_SELECTORS.map((sel) => idsIn(document.querySelector(sel)));
    if (!queue || (!picking && !veto && !board.length && !teams.flat().length)) return;

    const all = [
      ...new Set([...teams.flat(), ...idsIn(document.querySelector(MIDDLE)), ...board.map((b) => b.id)]),
    ];
    load(queue, all, check);

    ensureStyle();
    if (picking) renderPick(queue);
    renderTeams(queue, teams);
    if (veto && teams.every((ids) => ids.length)) renderVeto(queue, teams);
    if (board.length) renderBoard(queue, board);
  }

  feature('matchStats', 'match-stats', {
    check,
    observe: { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state'] },
    onDisable: restore,
  });

  log('match-stats loaded');
}
