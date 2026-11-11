# DeafCS Tools

Chrome extension for [DeafCS](https://deafcs.net) players: Auto-Ready, Copy Server IP, Auto Join Server.

## Install

- Download: **https://github.com/bodkul/deafcs-tools/releases/latest**
- Guide and features: **https://csdeaf.com/tools**

## Development

Plain JS, no build step. Load the repository folder via `chrome://extensions` → Developer mode → "Load unpacked".

To release: bump `version` in `manifest.json`, push to `main`, then push the tag `v<version>`. The Release workflow publishes `deafcs-tools-<version>.zip` and fails if the tag doesn't match the manifest version.

Logs in DevTools are prefixed with `[deafcs-tools]`. Saved deafcs.net HTML for fixing the content scripts goes into `fixtures/` (gitignored).

## License

[MIT](LICENSE)
