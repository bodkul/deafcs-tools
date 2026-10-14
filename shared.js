// Loaded by the service worker (importScripts), the popup and the content scripts.
// Top-level "var", not "const": after an extension update the service worker re-injects
// this file into open tabs, into the same isolated world, and "const" can't be redeclared.
var DEAFCS_REINJECTABLE = true;

// Every log line carries this prefix so the console can be filtered by it.
var DEAFCS_LOG_PREFIX = "[deafcs-tools]";
// bind (not a wrapper function) keeps the real caller's file:line in DevTools.
var deafcsLog = console.log.bind(console, DEAFCS_LOG_PREFIX);
var deafcsWarn = console.warn.bind(console, DEAFCS_LOG_PREFIX);
var deafcsError = console.error.bind(console, DEAFCS_LOG_PREFIX);

var DEAFCS_DEFAULTS = {
  lang: "auto",
  autoReady: true,
  autoReadyDelaySec: 5,
  copyServerIp: true,
  autoJoinServer: false,
  updateLatest: "",
  updateCheckedAt: 0
};

// Unpacked installs don't auto-update, so the extension compares itself with the manifest on GitHub.
var DEAFCS_REPO_URL = "https://github.com/bodkul/deafcs-tools";
var DEAFCS_MANIFEST_URL = "https://raw.githubusercontent.com/bodkul/deafcs-tools/main/manifest.json";
var DEAFCS_UPDATE_CHECK_MS = 24 * 60 * 60_000;

async function deafcsCheckUpdate() {
  try {
    const res = await fetch(DEAFCS_MANIFEST_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { version } = await res.json();
    deafcsLog("latest version on GitHub:", version);
    await chrome.storage.local.set({ updateLatest: version, updateCheckedAt: Date.now() });
  } catch (e) {
    deafcsWarn("update check failed", e.message);
  }
}

// True when dotted version a is newer than b ("0.10.0" > "0.9.1"); false for malformed input.
function deafcsIsNewer(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff) return diff > 0;
  }
  return false;
}

// Allowed [min, max] for numeric settings; the popup and content scripts clamp to these.
var DEAFCS_LIMITS = {
  autoReadyDelaySec: [0, 30]
};

// Rounds and clamps a numeric setting; falls back to the default for non-numbers.
function deafcsClamp(key, value) {
  const [min, max] = DEAFCS_LIMITS[key];
  const n = Math.round(Number(value));
  if (value === "" || value == null || !Number.isFinite(n)) return DEAFCS_DEFAULTS[key];
  return Math.min(Math.max(n, min), max);
}

var DEAFCS_STRINGS = {
  en: {
    subtitle: "Helper for deafcs.net",
    autoReady: "Auto-Ready",
    delay: "Delay, sec",
    copyServerIp: "Copy Server IP",
    autoJoinServer: "Auto Join Server",
    ipCopied: "IP copied",
    autoJoinFired: "Joining server…",
    updateAvailable: "Update available: v{version}",
    updateDownload: "Download"
  },
  ru: {
    subtitle: "Помощник для deafcs.net",
    autoReady: "Auto-Ready",
    delay: "Задержка, сек",
    copyServerIp: "Copy Server IP",
    autoJoinServer: "Auto Join Server",
    ipCopied: "IP скопирован",
    autoJoinFired: "Подключаемся к серверу…",
    updateAvailable: "Доступно обновление: v{version}",
    updateDownload: "Скачать"
  }
};

// "auto" follows the browser UI language.
function deafcsLang(lang) {
  if (lang in DEAFCS_STRINGS) return lang;
  return (navigator.language || "").toLowerCase().startsWith("ru") ? "ru" : "en";
}

function deafcsT(lang, key, vars = {}) {
  const text = DEAFCS_STRINGS[deafcsLang(lang)][key] ?? DEAFCS_STRINGS.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
}
