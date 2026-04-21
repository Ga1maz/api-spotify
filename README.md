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
```

Где:
- `LASTFM_API_KEY` — ключ Last.fm (получить: https://www.last.fm/api/account/create)
- `LASTFM_USERNAME` — ваш логин на Last.fm
- `PORT` — порт сервера (по умолчанию `8888`)
- `DEVICE_NAME` — как будет называться устройство в ответе API

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

Возвращает кэш последнего результата опроса.

- Если сейчас ничего не играет (и последний скроббл старше ~10 минут), ответ будет:

```json
{ "isActive": false, "track": null }
```

- Если что-то играет сейчас или играло совсем недавно, ответ будет примерно таким:

```json
{
  "isActive": true,
  "nowPlaying": true,
  "cover": "https://...",
  "title": "Song",
  "artist": "Artist",
  "album": "Album",
  "spotifyUrl": "https://open.spotify.com/search/Artist%20Song",
  "device": "My Device"
}
```

Поля:
- `isActive` — есть “активность” (now playing или трек был сыгран за последние ~10 минут)
- `nowPlaying` — `true`, если Last.fm пометил трек как “сейчас играет”
- `cover` — ссылка на обложку (если есть в данных Last.fm)
- `spotifyUrl` — ссылка на поиск по Spotify (генерируется из `artist` + `title`)
- `device` — значение из `DEVICE_NAME`

## Примеры

### Проверка через `curl`

```bash
curl -s http://localhost:8888/api/spotify | jq
```

> Если `jq` не установлен, уберите `| jq`.

## Возможные проблемы

- `getaddrinfo ENOTFOUND ws.audioscrobbler.com` — нет доступа в интернет или DNS.
- `LASTFM_API_KEY` / `LASTFM_USERNAME` не заданы — сервер будет отвечать `isActive=false` и/или логировать ошибки запроса.
