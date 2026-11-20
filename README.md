# DeafCS Tools

Browser extension (Chrome and Firefox) for [DeafCS](https://deafcs.net) players: Auto-Ready, Copy Server IP, Auto Join Server.

## Install

- Download: **https://github.com/bodkul/deafcs-tools/releases/latest**
- Guide and features: **https://csdeaf.com/tools**

## Development

Built with [WXT](https://wxt.dev). Requires Node.js 26 and pnpm 12 (the exact version is pinned in `packageManager` in `package.json`).

```sh
pnpm install
pnpm dev               # Chrome with hot reload
pnpm dev:firefox       # Firefox with hot reload
pnpm build             # .output/chrome-mv3/
pnpm build:firefox     # .output/firefox-mv2/
pnpm zip               # .output/deafcs-tools-<version>-chrome.zip
pnpm zip:firefox       # .output/deafcs-tools-<version>-firefox.zip + -sources.zip
pnpm compile           # type check
```

To load a build by hand: `chrome://extensions` → Developer mode → "Load unpacked" → `.output/chrome-mv3`;
in Firefox, `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on…" → `.output/firefox-mv2/manifest.json`.

Layout:

- `entrypoints/deafcs.content/`: the deafcs.net content script (plain TypeScript), one module per feature.
- `entrypoints/copy-hook.ts`: patches the site's clipboard calls in the page's main world; injected by the content script.
- `entrypoints/popup/`: settings popup (React, Tailwind CSS v4, theme in `style.css`).
- `components/ui/`: [shadcn/ui](https://ui.shadcn.com) components on [Base UI](https://base-ui.com) (style `base-nova`); add more with `pnpm shadcn add <name>`. They import `cn()` straight from the [`cn`](https://github.com/shadcn-ui/cn) package.
- `entrypoints/background.ts`: update check; in Chrome, injects the content script into tabs open at install time.
- `utils/shared.ts`: settings, defaults, translations, logging.

To release: bump `version` in `package.json`, push to `main`, then push the tag `v<version>`. The Release workflow
attaches the Chrome zip, the Firefox zip and the sources zip to a GitHub release, and fails if the tag doesn't match the
`package.json` version.

Logs in DevTools are prefixed with `[deafcs-tools]`. Saved deafcs.net pages for testing selectors go into `fixtures/`
(gitignored: they may contain real player data, never commit them).

## Build from source

For Firefox Add-ons (AMO) reviewers. The sources zip rebuilds the submitted Firefox package; no environment
variables or `.env` files are used.

Requirements:

- Node.js 26 (built with 26.7.0)
- pnpm 12.21.0 (`npm install -g pnpm@12.21.0`)

Build:

```sh
pnpm install
pnpm zip:firefox
```

Output: `.output/deafcs-tools-<version>-firefox.zip`; the unpacked extension is in `.output/firefox-mv2/`
(`pnpm build:firefox` produces only the folder).

## License

[MIT](LICENSE)
