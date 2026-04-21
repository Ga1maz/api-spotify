# spotify-playing

Небольшой Express‑сервер, который опрашивает Last.fm и отдаёт JSON с текущим треком (или последним треком за последние ~10 минут) для использования в оверлеях/виджетах.

## Требования

- Node.js 18+
- Доступ в интернет (запросы к `ws.audioscrobbler.com`)
- Last.fm API key и имя пользователя

## Установка

```bash
npm i
```

## Настройка `.env`

Скопируйте `.env.example` в `.env` и заполните значения:

```env
LASTFM_API_KEY=*************
LASTFM_USERNAME=your_username
PORT=8888
DEVICE_NAME=My Device
LASTFM_USER_AGENT=spotify-playing/0.1.0 (+https://github.com/Ga1maz/api-spotify)
LASTFM_ACTIVE_WINDOW_SECONDS=600
```

Где:
- `LASTFM_API_KEY` — ключ Last.fm (получить: https://www.last.fm/api/account/create)
- `LASTFM_USERNAME` — ваш логин на Last.fm
- `PORT` — порт сервера (по умолчанию `8888`)
- `DEVICE_NAME` — как будет называться устройство в ответе API
- `LASTFM_USER_AGENT` — User-Agent для запросов к Last.fm (иногда помогает избежать блокировок/403)
- `LASTFM_ACTIVE_WINDOW_SECONDS` — окно (в секундах), в течение которого последний скроббл считается “активностью” (по умолчанию `600`)

## Запуск

```bash
npm start
```

Сервер поднимется и начнёт опрос раз в ~2 секунды:

- `http://localhost:8888/api/spotify`

### Разработка (автоперезапуск)

```bash
npm run dev
```

## API

### `GET /api/spotify`

Возвращает данные по последнему треку из Last.fm и флаг активности.

- `isActive=true`, если `nowPlaying=true` или последний скроббл был в пределах `LASTFM_ACTIVE_WINDOW_SECONDS`.

```json
{
  "isActive": false,
  "nowPlaying": false,
  "cover": "",
  "title": "",
  "artist": "",
  "album": "",
  "spotifyUrl": "",
  "device": "My Device",
  "playedAt": null
}
```

Если трек есть, поля (`title`, `artist`, …) будут заполнены даже когда `isActive=false`.

```json
{
  "isActive": true,
  "nowPlaying": true,
  "cover": "https://...",
  "title": "Song",
  "artist": "Artist",
  "album": "Album",
  "spotifyUrl": "https://open.spotify.com/search/Artist%20Song",
  "device": "My Device",
  "playedAt": 1712345678
}
```

Поля:
- `isActive` — есть “активность” (now playing или скроббл в пределах окна)
- `nowPlaying` — `true`, если Last.fm пометил трек как “сейчас играет”
- `cover` — ссылка на обложку (если есть в данных Last.fm)
- `spotifyUrl` — ссылка на поиск по Spotify (генерируется из `artist` + `title`)
- `device` — значение из `DEVICE_NAME`
- `playedAt` — unix-время последнего скроббла (или `null`)

## Примеры

### Проверка через `curl`

```bash
curl -s http://localhost:8888/api/spotify | jq
```

> Если `jq` не установлен, уберите `| jq`.

## Возможные проблемы

- `getaddrinfo ENOTFOUND ws.audioscrobbler.com` — нет доступа в интернет или DNS.
- `LASTFM_API_KEY` / `LASTFM_USERNAME` не заданы — сервер будет отвечать `isActive=false` и/или логировать ошибки запроса.
- `Request failed with status code 403` — Last.fm отклонил запрос (проверьте ключ/юзера и попробуйте задать `LASTFM_USER_AGENT`).
- Если на Vercel приходят пустые поля (`title=""`, `artist=""`) — часто это значит, что Last.fm вернул не JSON (например HTML/страницу блокировки). Проверь `Functions Logs` и попробуй открыть `GET /api/spotify?debug=1` (в ответе появятся `errorMessage/errorDetails`).

## PM2 (автозапуск + ежедневный рестарт)

Ниже пример для сервера, где проект лежит в `/var/www/api-spotify` и рядом есть `.env`.

### 1) Установить PM2

```bash
npm i -g pm2
```

### 2) Запустить приложение через ecosystem

В репозитории уже есть `ecosystem.config.cjs`:
- подтягивает переменные из `.env` (`env_file: ".env"`)
- по умолчанию делает рестарт каждый день в 04:00 (`cron_restart: "0 4 * * *"`)

```bash
cd /var/www/api-spotify
pm2 start ecosystem.config.cjs
pm2 status
```

Изменить время ежедневного рестарта можно в `ecosystem.config.cjs` через `cron_restart`.

### 3) Включить автозапуск после перезагрузки сервера

```bash
pm2 startup
```

Команда выведет строку, которую нужно выполнить (обычно это `sudo ...` для systemd). После этого:

```bash
pm2 save
```

### Полезные команды

```bash
pm2 logs spotify-playing
pm2 restart spotify-playing
pm2 stop spotify-playing
pm2 delete spotify-playing
```

## Vercel

Важный момент: Vercel — это serverless. Там нельзя держать “вечный” Express‑сервер с `setTimeout`/polling как в `main.js`.
Для Vercel в репозитории есть serverless‑эндпоинт `api/spotify.js`, который ходит в Last.fm на каждый запрос.

### Переменные окружения

На Vercel `.env` из репозитория не используется. Добавьте переменные в Project Settings → Environment Variables:

- `LASTFM_API_KEY`
- `LASTFM_USERNAME`
- `DEVICE_NAME` (опционально)
- `LASTFM_USER_AGENT` (опционально)

### URL

После деплоя дергайте:

- `https://<your-project>.vercel.app/api/spotify`
