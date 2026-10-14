const DEFAULTS = DEAFCS_DEFAULTS;

const $ = (id) => document.getElementById(id);
let state = { ...DEFAULTS };

const t = (key, vars) => deafcsT(state.lang, key, vars);

function render() {
  const lang = deafcsLang(state.lang);
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const btn of document.querySelectorAll("[data-lang]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
  }

  $("autoReady").checked = state.autoReady;
  $("copyServerIp").checked = state.copyServerIp;
  $("autoJoinServer").checked = state.autoJoinServer;
  $("autoReadyDelay").disabled = !state.autoReady;
  if (document.activeElement !== $("autoReadyDelay")) $("autoReadyDelay").value = state.autoReadyDelaySec;

  // Compared with the running version, so the banner disappears by itself once the user updates.
  $("update").hidden = !deafcsIsNewer(state.updateLatest, chrome.runtime.getManifest().version);
  $("updateText").textContent = t("updateAvailable", { version: state.updateLatest });
}

$("updateLink").href = `${DEAFCS_REPO_URL}/archive/refs/heads/main.zip`;

[$("autoReadyDelay").min, $("autoReadyDelay").max] = DEAFCS_LIMITS.autoReadyDelaySec;

for (const key of ["autoReady", "copyServerIp", "autoJoinServer"]) {
  $(key).addEventListener("change", (e) => chrome.storage.local.set({ [key]: e.target.checked }));
}

$("autoReadyDelay").addEventListener("change", () => {
  const sec = deafcsClamp("autoReadyDelaySec", $("autoReadyDelay").value);
  $("autoReadyDelay").value = sec;
  chrome.storage.local.set({ autoReadyDelaySec: sec });
});

for (const btn of document.querySelectorAll("[data-lang]")) {
  btn.addEventListener("click", () => chrome.storage.local.set({ lang: btn.dataset.lang }));
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  for (const [key, { newValue }] of Object.entries(changes)) state[key] = newValue ?? DEFAULTS[key];
  render();
});

chrome.storage.local.get(DEFAULTS).then((stored) => {
  state = stored;
  render();
  // Browsers that stay open for days never fire onStartup, so the popup catches up.
  if (Date.now() - stored.updateCheckedAt > DEAFCS_UPDATE_CHECK_MS) deafcsCheckUpdate();
});
