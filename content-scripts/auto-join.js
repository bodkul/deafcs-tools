(() => {
  const { t, isAlive, toast, randomDelay, isVisible, feature, matchFoundDialogs, isMatchPage, joinLink } = window.DeafCS;

  const CLICK_DELAY_MS = [300, 800];
  // Remembers the last joined server ({ href, at }) so a page reload or a second tab doesn't
  // launch it again. Servers are reused between matches, so the entry expires and is
  // dropped on "Match Found"; otherwise the next match on the same server is never joined.
  const LAST_KEY = "autoJoinLast";
  const LAST_TTL_MS = 3 * 60 * 60 * 1000;
  const LOCK_NAME = "deafcs-tools:auto-join";

  let joining = false;
  // Link already handled (joined or skipped) on this page, so DOM churn doesn't re-run storage reads.
  let handledHref = null;
  let seenDialog = null;

  // A new "Match Found" dialog means the next join is a new match, even on the same server.
  function newMatchFound() {
    const [dialog] = matchFoundDialogs();
    if (!dialog || dialog === seenDialog) return false;
    seenDialog = dialog;
    return true;
  }

  // Records href as joined unless it already is. The read and the write run under a Web Lock
  // shared by all deafcs.net tabs, so two tabs can't both see "not joined" and both launch it.
  async function claim(href) {
    const testAndSet = async () => {
      const { [LAST_KEY]: last } = await chrome.storage.local.get(LAST_KEY);
      if (last?.href === href && Date.now() - last.at < LAST_TTL_MS) return false;
      await chrome.storage.local.set({ [LAST_KEY]: { href, at: Date.now() } });
      return true;
    };
    return navigator.locks ? navigator.locks.request(LOCK_NAME, testAndSet) : testAndSet();
  }

  async function check() {
    if (newMatchFound()) {
      handledHref = null;
      chrome.storage.local.remove(LAST_KEY);
      deafcsLog("auto-join: Match Found, forgetting the last joined server");
    }
    if (joining) return;
    const link = joinLink();
    if (!link || !isVisible(link)) return;
    const href = link.getAttribute("href");
    if (href === handledHref) return;

    joining = true;
    try {
      await randomDelay(...CLICK_DELAY_MS);
      if (!isOn() || !isAlive() || !isMatchPage() || !isVisible(link)) return;

      handledHref = href;
      if (!(await claim(href))) {
        deafcsLog("auto-join: already joined this server, skipping", href);
        return;
      }

      link.click();
      deafcsLog("auto-join: opened", href);
      toast(t("autoJoinFired"));
    } finally {
      joining = false;
    }
  }

  const isOn = feature("autoJoinServer", "auto-join", { check });

  deafcsLog("auto-join.js loaded");
})();
