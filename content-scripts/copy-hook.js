// Runs in the page's MAIN world (the isolated content scripts can't patch the site's calls).
// The match page hides the server address, so Copy Server IP clicks the site's own
// "Copy connect command" button and needs the text the site copies. Between the
// "deafcs:capture-start" and "deafcs:capture-end" events, the site's next copy is not written
// to the clipboard but reported as "deafcs:copied" (detail: the text).
(() => {
  if (window.__deafcsCopyHook) return; // already installed (the service worker re-injects scripts)
  window.__deafcsCopyHook = true;

  let capturing = false;

  document.addEventListener("deafcs:capture-start", () => (capturing = true));
  document.addEventListener("deafcs:capture-end", () => (capturing = false));

  function report(text) {
    capturing = false;
    document.dispatchEvent(new CustomEvent("deafcs:copied", { detail: String(text) }));
  }

  const writeText = Clipboard.prototype.writeText;
  Clipboard.prototype.writeText = function (text) {
    if (!capturing) return writeText.call(this, text);
    report(text);
    return Promise.resolve();
  };

  // Older copy helpers select a hidden textarea and call execCommand("copy").
  function selectedText() {
    const el = document.activeElement;
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      return el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? el.value.length);
    }
    return String(document.getSelection() ?? "");
  }

  const execCommand = Document.prototype.execCommand;
  Document.prototype.execCommand = function (command, ...args) {
    if (capturing && String(command).toLowerCase() === "copy") {
      const text = selectedText();
      if (text) {
        report(text);
        return true;
      }
    }
    return execCommand.call(this, command, ...args);
  };
})();
