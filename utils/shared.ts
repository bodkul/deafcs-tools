// Used by the background, the popup and the content script.

// Every log line carries this prefix so the console can be filtered by it.
export const LOG_PREFIX = '[deafcs-tools]';
// bind (not a wrapper function) keeps the real caller's file:line in DevTools.
export const log = console.log.bind(console, LOG_PREFIX);
export const warn = console.warn.bind(console, LOG_PREFIX);
export const error = console.error.bind(console, LOG_PREFIX);

export const DEFAULTS = {
  lang: 'auto' as string,
  autoReady: true,
  autoReadyDelaySec: 5,
  copyServerIp: true,
  autoJoinServer: false,
  queueDots: true,
  hideCancelled: true,
  matchStats: true,
  updateLatest: '',
  updateCheckedAt: 0,
};

export type Settings = typeof DEFAULTS;
export type SettingKey = keyof Settings;

export const isSettingKey = (key: string): key is SettingKey => key in DEFAULTS;

// Unpacked installs don't auto-update, so the extension compares itself with the version on GitHub.
// package.json is where the version lives since the WXT migration.
const LATEST_URL = 'https://raw.githubusercontent.com/bodkul/deafcs-tools/main/package.json';
export const UPDATE_CHECK_MS = 24 * 60 * 60_000;

export async function checkUpdate() {
  try {
    const res = await fetch(LATEST_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { version } = await res.json();
    log('latest version on GitHub:', version);
    await browser.storage.local.set({ updateLatest: version, updateCheckedAt: Date.now() });
  } catch (e) {
    warn('update check failed', (e as Error).message);
  }
}

// True when dotted version a is newer than b ("0.10.0" > "0.9.1"); false for malformed input.
export function isNewer(a: unknown, b: unknown) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff) return diff > 0;
  }
  return false;
}

// Allowed [min, max] for numeric settings; the popup and content script clamp to these.
export const LIMITS = {
  autoReadyDelaySec: [0, 30],
} satisfies Partial<Record<SettingKey, [number, number]>>;

// Rounds and clamps a numeric setting; falls back to the default for non-numbers.
export function clamp(key: keyof typeof LIMITS, value: unknown): number {
  const [min, max] = LIMITS[key] as [number, number];
  const n = Math.round(Number(value));
  if (value === '' || value == null || !Number.isFinite(n)) return DEFAULTS[key];
  return Math.min(Math.max(n, min), max);
}

const STRINGS = {
  en: {
    subtitle: 'Helper for deafcs.net',
    autoReady: 'Auto-Ready',
    delay: 'Delay, sec',
    copyServerIp: 'Copy Server IP',
    autoJoinServer: 'Auto Join Server',
    queueDots: 'Queue Dots',
    hideCancelled: 'Hide Cancelled Matches',
    matchStats: 'Player & Map Stats',
    statsPlayerTitle: 'Last {matches} {queue} matches: {wins} W / {losses} L',
    statsNoMatches: 'No {queue} matches yet',
    statsMapTitle:
      "Team win rate on this map: matches of its players here, out of each player's last 30 {queue} matches",
    statsMapLine: '{rate}% ({wins} won of {matches})',
    statsNoMapMatches: 'no matches on this map',
    statsOfMatches: 'of {n}',
    ipCopied: 'IP copied',
    autoJoinFired: 'Joining server…',
    updateAvailable: 'Update available: v{version}',
    updateDownload: 'Download',
  },
  ru: {
    subtitle: 'Помощник для deafcs.net',
    autoReady: 'Auto-Ready',
    delay: 'Задержка, сек',
    copyServerIp: 'Copy Server IP',
    autoJoinServer: 'Auto Join Server',
    queueDots: 'Queue Dots',
    hideCancelled: 'Скрыть отменённые матчи',
    matchStats: 'Статистика игроков и карт',
    statsPlayerTitle: 'Последние {matches} матчей {queue}: {wins} побед / {losses} поражений',
    statsNoMatches: 'Нет матчей {queue}',
    statsMapTitle: 'Винрейт команды на этой карте: матчи её игроков здесь из последних 30 матчей {queue} каждого',
    statsMapLine: '{rate}% (выиграно {wins} из {matches})',
    statsNoMapMatches: 'нет матчей на этой карте',
    statsOfMatches: 'из {n}',
    ipCopied: 'IP скопирован',
    autoJoinFired: 'Подключаемся к серверу…',
    updateAvailable: 'Доступно обновление: v{version}',
    updateDownload: 'Скачать',
  },
} as const;

export type Lang = keyof typeof STRINGS;
export type StringKey = keyof (typeof STRINGS)['en'];

// "auto" follows the browser UI language.
export function resolveLang(lang: string): Lang {
  if (lang in STRINGS) return lang as Lang;
  return (navigator.language || '').toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function translate(lang: string, key: StringKey, vars: Record<string, string | number> = {}) {
  const text: string = STRINGS[resolveLang(lang)][key] ?? STRINGS.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
}
