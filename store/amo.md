# Firefox Add-ons (AMO) listing

Texts to paste into the AMO developer hub. Default locale: English (en-US); add Russian (ru) as a translation.
Upload: `.output/deafcs-tools-<version>-firefox.zip`; when asked for sources: `.output/deafcs-tools-<version>-sources.zip`
(both from `pnpm zip:firefox`).

## Basic fields

| Field | Value |
|---|---|
| Name | DeafCS Tools |
| URL slug | `deafcs-tools` |
| Categories | Games & Entertainment |
| Tags | `games`, `counter-strike`, `cs2` |
| Homepage | https://csdeaf.com/tools |
| Support site | https://github.com/bodkul/deafcs-tools/issues |
| License | MIT |
| Privacy policy | English part of [PRIVACY.md](../PRIVACY.md) (Russian part in the ru translation) |
| Requires payment, account or other software | No (a deafcs.net account and CS2 are needed to play, not for the add-on) |
| Experimental | No |

## Summary (250 characters max)

**en-US** (189):

> Helper for DeafCS players: accepts matches for you, shows player and map stats on the captain pick and map veto,
> copies the server IP, joins the server and shows the queue on the Play page.

**ru** (182):

> Помощник для игроков DeafCS: сам принимает матч, показывает статистику игроков и карт на пике и вето, копирует IP
> сервера, подключает к серверу и показывает очередь на странице Play.

## Description

**en-US:**

```
DeafCS Tools makes playing on deafcs.net easier. Every feature can be turned on or off in the toolbar popup.

**Match**
• Auto-Ready: presses READY when a match is found, after a delay you choose (1–10 seconds).
• Player & Map Stats: on the captain pick, shows K/D, ADR, win rate and headshot rate of each player over their last 30 matches in the queue; on the map veto, shows each team's win rate on every map.
• Copy Server IP: when the match server is ready, copies the connect command to your clipboard.
• Auto Join Server: presses the site's Join Server button for you once the server is ready (off by default).

**Site**
• Queue Dots: on the Play page, the seat dots of each game mode light up for the players in queue.
• Hide Cancelled Matches: removes cancelled matches from the match history on player pages.

Available in English and Russian.

The add-on works only on deafcs.net. Player & Map Stats sends the Steam IDs of the players in your match to api.csdeaf.com to calculate their stats; you can turn it off. Nothing else leaves your browser. See the privacy policy for details.

Source code: https://github.com/bodkul/deafcs-tools
```

**ru:**

```
DeafCS Tools упрощает игру на deafcs.net. Каждую функцию можно включить или выключить в попапе на панели инструментов.

**Матч**
• Авто-принятие матча: сам нажимает READY, когда матч найден, через выбранную задержку (1–10 секунд).
• Статистика игроков и карт: на пике капитанов показывает K/D, ADR, винрейт и процент хедшотов каждого игрока за его последние 30 матчей в очереди; в вето карт — винрейт каждой команды на каждой карте.
• Копировать IP сервера: когда сервер матча готов, копирует команду connect в буфер обмена.
• Автоподключение: сам нажимает кнопку сайта Join Server, когда сервер готов (по умолчанию выключено).

**Сайт**
• Точки очереди: на странице Play точки мест у каждого режима загораются по числу игроков в поиске.
• Скрыть отменённые матчи: убирает отменённые матчи из истории на странице игрока.

Доступно на русском и английском.

Расширение работает только на deafcs.net. «Статистика игроков и карт» отправляет Steam ID игроков вашего матча на api.csdeaf.com, чтобы посчитать их статистику; её можно выключить. Больше ничего из браузера не уходит. Подробности — в политике конфиденциальности.

Исходный код: https://github.com/bodkul/deafcs-tools
```

## Screenshots

1280x800 PNGs in [screenshots/](screenshots/), made from the real popup build. Upload in this order, with these captions:

| File | Caption (en-US) | Caption (ru) |
|---|---|---|
| `1-popup-en.png` | Every feature in one popup: turn each on or off | Все функции в одном попапе |
| `2-popup-ru.png` | Available in English and Russian | Доступно на русском и английском |
| `3-toasts-en.png` | Notifications on deafcs.net when the IP is copied and the server is joining | Уведомления на deafcs.net: IP скопирован, подключение к серверу |

Stats on the captain pick and map veto can only be captured during a live match.

## Release notes

One entry per version, newest first; paste the current one into "Version notes" on upload.

**1.3.0** (first release on AMO):

```
First release on Firefox Add-ons.
• New popup: features grouped into Match and Site, with descriptions; Auto-Ready delay slider (1–10 s).
• Player & Map Stats on the captain pick and map veto.
• Queue Dots work on the Russian matchmaking screen too.
• Toasts on deafcs.net match the new dark theme.
```

## Notes to reviewer

```
Build from the attached sources zip (also in README.md, "Build from source"):
- Any OS that runs Node.js: Windows, macOS or Linux (built on Windows 11 x64)
- Node.js 26 (built with 26.7.0), pnpm 12.21.0 (npm install -g pnpm@12.21.0)
- pnpm install
- pnpm zip:firefox
Output: .output/deafcs-tools-<version>-firefox.zip (unpacked in .output/firefox-mv2/). Built with WXT, React and Tailwind CSS; no environment variables or .env files.

Network requests:
- https://api.csdeaf.com/api/deafcs/stats (my own server): Player & Map Stats sends the Steam IDs shown on a deafcs.net match page (max 10 per request) and the queue type, and gets back each player's recent stats. Declared as websiteContent in data_collection_permissions. The server doesn't log or store them; results are cached in memory for 5 minutes.
- https://raw.githubusercontent.com/bodkul/deafcs-tools/main/package.json: update check for manual installs only. Skipped when management.getSelf().installType isn't "development", so AMO installs never make it.

copy-hook.js (entrypoints/copy-hook.ts) is injected into the deafcs.net page's main world. deafcs.net hides the match server address; Copy Server IP clicks the site's own "Copy connect command" button and needs the copied text. The hook wraps Clipboard.prototype.writeText and document.execCommand("copy") on deafcs.net only, and only between the extension's capture-start and capture-end events, so it captures that one copy; all other copies pass through unchanged.

The two "Unsafe assignment to innerHTML" lint warnings are in the popup bundle and come from React (react-dom): its handling of dangerouslySetInnerHTML, which the add-on never uses. The content script builds its DOM without innerHTML.

Testing: most features act only during a live deafcs.net match (Match Found dialog, captain pick, map veto, server bar), which needs a deafcs.net account and other players, so no test account can show them. Queue Dots works on https://deafcs.net/play. The popup works anywhere.
```
