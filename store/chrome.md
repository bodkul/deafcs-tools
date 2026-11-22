# Chrome Web Store listing

Texts and answers for the Chrome Web Store developer dashboard. Upload `.output/deafcs-tools-<version>-chrome.zip`
(from `pnpm zip`). The store doesn't take source code.

**Before submitting:** the privacy policy needs a public URL, so submit after `main` with PRIVACY.md is pushed (the
GitHub release of the same version). A developer account costs a one-time $5 registration fee.

## Store listing tab

| Field | Value |
|---|---|
| Summary | Comes from the manifest `description` (132 characters max), nothing to type |
| Category | Lifestyle → Games (or Entertainment if Games isn't offered) |
| Language | English (the listing has one language: the extension has no `_locales`) |
| Store icon | `public/icon/128.png` |
| Screenshots | `screenshots/1-popup-en.png`, `2-popup-ru.png`, `3-toasts-en.png` (1280x800) |
| Small promo tile | `screenshots/promo-small-440x280.png` |
| Marquee promo tile | none (optional) |
| Official URL | none |
| Homepage URL | https://csdeaf.com/tools |
| Support URL | https://github.com/bodkul/deafcs-tools/issues |
| Mature content | No |

### Description

Plain text, no Markdown. English first, then Russian, since the listing has a single language.

```
DeafCS Tools makes playing on deafcs.net easier. Every feature can be turned on or off in the toolbar popup.

MATCH
• Auto-Ready: presses READY when a match is found, after a delay you choose (1–10 seconds).
• Player & Map Stats: on the captain pick, shows K/D, ADR, win rate and headshot rate of each player over their last 30 matches in the queue; on the map veto, shows each team's win rate on every map.
• Copy Server IP: when the match server is ready, copies the connect command to your clipboard.
• Auto Join Server: presses the site's Join Server button for you once the server is ready (off by default).

SITE
• Queue Dots: on the Play page, the seat dots of each game mode light up for the players in queue.
• Hide Cancelled Matches: removes cancelled matches from the match history on player pages.

Available in English and Russian.

The extension works only on deafcs.net. Player & Map Stats sends the Steam IDs of the players in your match to api.csdeaf.com to calculate their stats; you can turn it off. Nothing else leaves your browser. No analytics, no ads.

Source code: https://github.com/bodkul/deafcs-tools

—

DeafCS Tools упрощает игру на deafcs.net. Каждую функцию можно включить или выключить в попапе на панели инструментов.

МАТЧ
• Авто-принятие матча: сам нажимает READY, когда матч найден, через выбранную задержку (1–10 секунд).
• Статистика игроков и карт: на пике капитанов — K/D, ADR, винрейт и процент хедшотов каждого игрока за последние 30 матчей в очереди; в вето карт — винрейт каждой команды на каждой карте.
• Копировать IP сервера: когда сервер матча готов, копирует команду connect в буфер обмена.
• Автоподключение: сам нажимает кнопку сайта Join Server, когда сервер готов (по умолчанию выключено).

САЙТ
• Точки очереди: на странице Play точки мест у каждого режима загораются по числу игроков в поиске.
• Скрыть отменённые матчи: убирает отменённые матчи из истории на странице игрока.

Расширение работает только на deafcs.net. «Статистика игроков и карт» отправляет Steam ID игроков вашего матча на api.csdeaf.com, чтобы посчитать их статистику; её можно выключить. Больше ничего из браузера не уходит.
```

## Privacy practices tab

### Single purpose

```
Helps players of deafcs.net, a Counter-Strike 2 matchmaking site: automates the steps of a match (accepting it, copying the server address, joining the server) and shows player and map stats on the site's pages.
```

### Permission justifications

**storage**
```
Saves the user's settings (language, which features are on, Auto-Ready delay) and the ID of the last match Auto Join Server joined, so a page reload doesn't join it twice. Local storage only, not synced.
```

**clipboardWrite**
```
Copy Server IP puts the match server's connect command on the clipboard by itself when the server becomes ready, without a click from the user, so the player can paste it into the CS2 console.
```

**scripting**
```
After the extension is installed or updated, the background script injects the content script into deafcs.net tabs that were already open, so they work without a reload. It only targets tabs matching the deafcs.net host permission.
```

**Host permission (https://*.deafcs.net/*)**
```
The content script runs only on deafcs.net: it reads the match page (Match Found dialog, captain pick, map veto, server bar) and presses the site's own buttons. No other sites are accessed.
```

**Remote code:** No, I am not using remote code. (The extension fetches only JSON data from api.csdeaf.com; all code is in the package.)

### Data usage

What the extension collects (tick only this):

- [x] **Website content** — Player & Map Stats sends the Steam IDs shown on a deafcs.net match page to api.csdeaf.com.

Everything else stays unticked: personally identifiable information, health, financial and payment, authentication,
personal communications, location, web history, user activity.

Certify all three:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** https://github.com/bodkul/deafcs-tools/blob/main/PRIVACY.md (works once `main` is pushed)

## Distribution tab

| Field | Value |
|---|---|
| Visibility | Public |
| Regions | All regions |
| Payments | Free |

## Test instructions tab

```
Most features act only during a live deafcs.net match (Match Found dialog, captain pick, map veto, server bar), which needs a deafcs.net account and other players, so no test account can show them. Queue Dots works on https://deafcs.net/play. The popup works anywhere.
```

## Release notes

The Chrome Web Store has no release notes field; the GitHub release and [amo.md](amo.md) keep them.
