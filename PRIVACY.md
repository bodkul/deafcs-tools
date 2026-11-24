# DeafCS Tools Privacy Policy

Effective: November 20, 2026 · [Русская версия ниже](#политика-конфиденциальности-deafcs-tools)

DeafCS Tools is a browser extension for players of [deafcs.net](https://deafcs.net). This policy explains what data
it handles and where that data goes.

## Summary

- Almost everything stays in your browser.
- One feature, Player & Map Stats, sends the Steam IDs of the players in your match to our server,
  api.csdeaf.com, to show their recent stats. You can turn it off in the extension's popup.
- No analytics, no ads, no tracking. We don't sell or share data with anyone.

## Data that stays in your browser

The extension stores the following in your browser's local extension storage. It isn't synced to other devices
and isn't sent anywhere:

- your settings (language, which features are on, Auto-Ready delay);
- the ID of the last match Auto Join Server joined, so a reload doesn't join it twice (kept for 3 hours);
- for manual installs only, the latest version number found on GitHub and when it was checked.

Copy Server IP puts the match server's `connect` command on your clipboard. The extension reads only that command
when the deafcs.net page copies it, and doesn't send it anywhere.

The extension works only on deafcs.net pages. It doesn't read other sites, your browsing history, your deafcs.net
account, cookies or passwords.

## Data sent to our server

**Player & Map Stats** (on by default). On a deafcs.net match page, during the captain pick, the map veto and the
warmup, the extension sends to `https://api.csdeaf.com`:

- the Steam IDs of the players in the match, as shown on that page (public 17-digit IDs, at most 10 per request);
- the queue type of the match (Competitive, Pro, Wingman or Duel).

The server uses them to load those players' recent public matches from deafcs.net, works out K/D, ADR, win rate and
headshot rate, and sends the result back to be shown on the page. It keeps each player's result in a cache for
5 minutes, in memory only, so the same match doesn't ask twice; nothing is written to a database. The stats aren't
linked to you or to your browser.

As with any request on the internet, the server sees your IP address. The server doesn't record your IP address or
the Steam IDs it receives in its logs or database.

To stop sending this data, turn off Player & Map Stats in the popup.

## Update check (manual installs only)

If you installed the extension by hand from GitHub (not from the Chrome Web Store or Firefox Add-ons), it checks
once a day whether a newer version exists by downloading a version file from `raw.githubusercontent.com`. No data
about you is sent, but GitHub sees the request like any other download. Installs from the Chrome Web Store or
Firefox Add-ons never make this request; the store updates them.

## Links

The DeafCS and Guide buttons in the popup open deafcs.net and csdeaf.com in a new tab. Those sites have their own
privacy policies.

## Changes and contact

If this policy changes, the new version will be published here with a new date. Questions:
[GitHub issues](https://github.com/bodkul/deafcs-tools/issues).

---

# Политика конфиденциальности DeafCS Tools

Действует с: 20 ноября 2026 г.

DeafCS Tools — расширение браузера для игроков [deafcs.net](https://deafcs.net). Здесь описано, какие данные оно
обрабатывает и куда они попадают.

## Коротко

- Почти всё остаётся в вашем браузере.
- Только функция «Статистика игроков и карт» отправляет Steam ID игроков вашего матча на наш сервер
  api.csdeaf.com, чтобы показать их недавнюю статистику. Её можно выключить в попапе расширения.
- Никакой аналитики, рекламы и слежки. Мы не продаём данные и никому их не передаём.

## Что остаётся в браузере

Расширение хранит в локальном хранилище браузера (не синхронизируется с другими устройствами и никуда не
отправляется):

- ваши настройки: язык, какие функции включены, задержку авто-принятия;
- ID последнего матча, к которому подключило «Автоподключение», чтобы после перезагрузки страницы не подключиться
  повторно (хранится 3 часа);
- только при ручной установке: последнюю версию, найденную на GitHub, и время проверки.

«Копировать IP сервера» кладёт в буфер обмена команду `connect` сервера матча. Расширение читает только эту команду,
когда её копирует страница deafcs.net, и никуда её не отправляет.

Расширение работает только на страницах deafcs.net. Оно не читает другие сайты, историю браузера, ваш аккаунт
deafcs.net, cookies и пароли.

## Что отправляется на наш сервер

**«Статистика игроков и карт»** (включена по умолчанию). На странице матча deafcs.net, во время пика капитанов,
вето карт и разминки, расширение отправляет на `https://api.csdeaf.com`:

- Steam ID игроков матча, которые показаны на этой странице (публичные 17-значные ID, не больше 10 за запрос);
- тип очереди матча (Competitive, Pro, Wingman или Duel).

Сервер по ним загружает недавние публичные матчи этих игроков с deafcs.net, считает K/D, ADR, винрейт и процент
хедшотов и возвращает результат, который показывается на странице. Результат по каждому игроку хранится в кэше
5 минут, только в памяти, чтобы не запрашивать один и тот же матч дважды; в базу данных ничего не записывается.
Статистика не связывается с вами или вашим браузером.

Как и при любом запросе в интернете, сервер видит ваш IP-адрес. Сервер не записывает ваш IP-адрес и полученные
Steam ID ни в логи, ни в базу данных.

Чтобы эти данные не отправлялись, выключите «Статистику игроков и карт» в попапе.

## Проверка обновлений (только ручная установка)

Если расширение установлено вручную с GitHub (а не из Chrome Web Store или Firefox Add-ons), раз в сутки оно
проверяет, вышла ли новая версия, скачивая файл с версией с `raw.githubusercontent.com`. Данные о вас не
передаются, но GitHub видит запрос, как и любое скачивание. Установки из Chrome Web Store и Firefox Add-ons этот
запрос не делают: их обновляет магазин.

## Ссылки

Кнопки «Открыть DeafCS» и «Инструкция» в попапе открывают deafcs.net и csdeaf.com в новой вкладке. У этих сайтов
свои политики конфиденциальности.

## Изменения и связь

Если политика изменится, новая версия появится здесь с новой датой. Вопросы:
[GitHub issues](https://github.com/bodkul/deafcs-tools/issues).
