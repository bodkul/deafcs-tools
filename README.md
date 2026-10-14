# DeafCS Tools

[English](#english) · [Русский](#русский)

---

## English

A Chrome extension (Manifest V3) for [DeafCS](https://deafcs.net) players. Plain JS, no build step, no dependencies.

### Features

Each feature is toggled independently in the popup. Changes apply immediately, without reloading the page. The interface language (English / Russian) is switched with the EN / RU toggle in the popup; by default it follows the browser language.

- **Auto-Ready**: when the "Match Found" dialog appears, the extension clicks Ready for you, once per dialog. The delay before the click is set in the popup: 0 to 30 seconds, 5 by default (plus a small random offset). On by default.
- **Copy Server IP**: after the match starts, the extension copies the console command `connect IP:PORT` to the clipboard and shows an "IP copied" notification. If the browser blocks clipboard access (the tab isn't focused), it retries on your next click or key press on the page. On by default.
- **Auto Join Server**: after the match starts, the extension opens the "Join Server" link (`steam://…+connect IP:PORT`), once per match (a page reload or a second tab won't launch it again), so CS2 connects by itself. Chrome may ask to allow opening Steam the first time; tick "Always allow". Off by default.

### Installation (development)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (toggle in the top right corner).
3. Click **"Load unpacked"** and select the repository folder (the one containing `manifest.json`).

### Updating after code changes

1. On the extension card in `chrome://extensions`, click the reload button (circular arrow).
2. Open deafcs.net tabs pick up the new version by themselves. If the console says a tab "runs an old version", reload it once (F5).

### Releasing a new version

Bump `version` in `manifest.json` (for example `0.1.0` → `0.2.0`) and push to `main`. Installed copies compare their version with `manifest.json` on GitHub when the browser starts and, at most once a day, when the popup opens; if GitHub has a newer one, the popup shows "Update available" with a download link. Without the bump nobody sees the update.

### Debugging

All extension log messages start with the `[deafcs-tools]` prefix, so you can filter by it.

- **Content scripts** (Auto-Ready, Copy IP, Auto Join): DevTools on the deafcs.net tab (F12) → Console.
- **Service worker** (update check): `chrome://extensions` → the extension card → "service worker" link.
- **Popup**: right-click the popup → "Inspect".

### Changing the domain

The domain is set in `manifest.json`, in two fields with the same value: `content_scripts[0].matches` and `host_permissions`:

```json
"matches": ["https://*.deafcs.net/*"]
```

`*.` covers both `deafcs.net` itself and its subdomains. After changing it, reload the extension in `chrome://extensions`.

### For other players: how to install

1. Open [Releases](https://github.com/bodkul/deafcs-tools/releases/latest), download `deafcs-tools-vX.Y.Z.zip` under **Assets**, and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **"Load unpacked"** and select the unzipped `deafcs-tools` folder (the one containing `manifest.json`).
4. Pin the DeafCS Tools icon to the toolbar (puzzle icon → pin) and reload the deafcs.net tab.

Don't delete the folder after installing: Chrome loads the extension directly from it. To update, download the new release and unzip it over the old folder, then click the reload button on the extension card. When a new version is out, the popup says so and links to the ZIP.

### License

[MIT](LICENSE)

---

## Русский

Chrome-расширение (Manifest V3) для игроков [DeafCS](https://deafcs.net). Чистый JS, без сборки и зависимостей.

### Возможности

Каждая фича включается и выключается в popup независимо, изменения применяются сразу, без перезагрузки страницы. Язык интерфейса (английский / русский) переключается кнопками EN / RU в popup; по умолчанию берётся язык браузера.

- **Auto-Ready** — когда появляется диалог «Match Found», расширение само нажимает Ready, один раз на диалог. Задержка перед кликом настраивается в popup: от 0 до 30 секунд, по умолчанию 5 (плюс небольшой случайный разброс). Включено по умолчанию.
- **Copy Server IP** — после старта матча копирует в буфер обмена консольную команду `connect IP:PORT` и показывает уведомление «IP скопирован». Если браузер не даёт писать в буфер (вкладка не в фокусе), копирование повторится при следующем клике или нажатии клавиши на странице. Включено по умолчанию.
- **Auto Join Server** — после старта матча открывает ссылку «Join Server» (`steam://…+connect IP:PORT`), один раз на матч (перезагрузка страницы или вторая вкладка не запустят его повторно), и CS2 подключается сам. В первый раз Chrome может спросить разрешение открыть Steam — отметьте «Всегда разрешать». Выключено по умолчанию.

### Установка (для разработки)

1. Откройте `chrome://extensions`.
2. Включите **Режим разработчика** (переключатель в правом верхнем углу).
3. Нажмите **«Загрузить распакованное расширение»** и выберите папку репозитория (ту, где лежит `manifest.json`).

### Обновление после правок кода

1. На карточке расширения в `chrome://extensions` нажмите кнопку обновления (круглая стрелка).
2. Открытые вкладки deafcs.net подхватят новую версию сами. Если в консоли написано, что вкладка «runs an old version», обновите её один раз (F5).

### Выпуск новой версии

Поднимите `version` в `manifest.json` (например, `0.1.0` → `0.2.0`) и запушьте в `main`. Установленные копии сравнивают свою версию с `manifest.json` на GitHub при запуске браузера и, не чаще раза в сутки, при открытии popup; если на GitHub версия новее, в popup появляется «Доступно обновление» со ссылкой на скачивание. Без поднятия версии обновление никто не увидит.

### Отладка

Все сообщения расширения начинаются с префикса `[deafcs-tools]`, по нему удобно фильтровать.

- **Content scripts** (Auto-Ready, Copy IP, Auto Join): DevTools на вкладке deafcs.net (F12) → Console.
- **Service worker** (проверка обновлений): `chrome://extensions` → карточка расширения → ссылка «service worker».
- **Popup**: правый клик по popup → «Просмотреть код».

### Смена домена

Домен указан в `manifest.json`, в двух полях с одинаковым значением: `content_scripts[0].matches` и `host_permissions`:

```json
"matches": ["https://*.deafcs.net/*"]
```

`*.` покрывает и сам `deafcs.net`, и его поддомены. После изменения обновите расширение на `chrome://extensions`.

### Для других игроков: как установить

1. Откройте [Releases](https://github.com/bodkul/deafcs-tools/releases/latest), скачайте `deafcs-tools-vX.Y.Z.zip` в разделе **Assets** и распакуйте архив.
2. Откройте `chrome://extensions` и включите **Режим разработчика**.
3. Нажмите **«Загрузить распакованное расширение»** и выберите распакованную папку `deafcs-tools` (ту, где лежит `manifest.json`).
4. Закрепите иконку DeafCS Tools на панели (значок пазла → булавка) и обновите вкладку deafcs.net.

Папку после установки не удаляйте: Chrome загружает расширение прямо из неё. Чтобы обновиться, скачайте новый релиз и распакуйте его поверх старой папки, затем нажмите кнопку обновления на карточке расширения. Когда выходит новая версия, popup сообщает об этом и даёт ссылку на ZIP.

### Лицензия

[MIT](LICENSE)
