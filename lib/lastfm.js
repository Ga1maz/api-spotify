import axios from "axios";

export function getDefaultUserAgent() {
  return (
    process.env.LASTFM_USER_AGENT ||
    "spotify-playing/0.1.0 (+https://github.com/Ga1maz/api-spotify)"
  );
}

export async function fetchCurrentlyPlaying({
  apiKey,
  username,
  deviceName,
  userAgent,
}) {
  if (!apiKey || !username) {
    return {
      isActive: false,
      nowPlaying: false,
      cover: "",
      title: "",
      artist: "",
      album: "",
      spotifyUrl: "",
      device: deviceName || "Unknown Device",
      playedAt: null,
      error: "Missing LASTFM_API_KEY or LASTFM_USERNAME",
    };
  }

  const recentRes = await axios.get("https://ws.audioscrobbler.com/2.0/", {
    params: {
      method: "user.getrecenttracks",
      user: username,
      api_key: apiKey,
      format: "json",
      limit: 1,
      extended: 1,
    },
    headers: {
      "User-Agent": userAgent || getDefaultUserAgent(),
    },
    timeout: 8000,
  });

  const body = recentRes.data;

  if (!body || typeof body !== "object") {
    const message = `Unexpected Last.fm response type: ${typeof body}`;
    const err = new Error(message);
    err.lastfm = {
      type: typeof body,
      sample: typeof body === "string" ? body.slice(0, 300) : null,
    };
    throw err;
  }

  if (body.error) {
    const message = body.message || `Last.fm error ${body.error || "unknown"}`;
    const err = new Error(message);
    err.lastfm = body;
    throw err;
  }

  if (!body.recenttracks) {
    const err = new Error("Unexpected Last.fm schema: missing recenttracks");
    err.lastfm = { keys: Object.keys(body) };
    throw err;
  }

  const tracks = body.recenttracks?.track;
  if (!tracks || tracks.length === 0) {
    return {
      isActive: false,
      nowPlaying: false,
      cover: "",
      title: "",
      artist: "",
      album: "",
      spotifyUrl: "",
      device: deviceName || "Unknown Device",
      playedAt: null,
    };
  }

  const track = Array.isArray(tracks) ? tracks[0] : tracks;
  const isNowPlaying = track["@attr"]?.nowplaying === "true";

  const playedAt = track.date?.uts ? Number(track.date.uts) : null;
  const now = Math.floor(Date.now() / 1000);
  const windowSecondsRaw = process.env.LASTFM_ACTIVE_WINDOW_SECONDS;
  const windowSeconds =
    windowSecondsRaw && Number.isFinite(Number(windowSecondsRaw))
      ? Math.max(0, Number(windowSecondsRaw))
      : 600;
  const recentlyPlayed =
    playedAt && Number.isFinite(playedAt) ? now - playedAt <= windowSeconds : false;
  const isActive = Boolean(isNowPlaying || recentlyPlayed);

  const title = track.name;
  const artist = track.artist?.name || track.artist?.["#text"] || "";
  const album = track.album?.["#text"] || "";
  const cover =
    track.image?.find((i) => i.size === "extralarge")?.["#text"] ||
    track.image?.find((i) => i.size === "large")?.["#text"] ||
    "";
  const spotifyUrl = `https://open.spotify.com/search/${artist} ${title}`.replace(
    / /g,
    "%20"
  );

  return {
    isActive,
    nowPlaying: isNowPlaying,
    cover,
    title,
    artist,
    album,
    spotifyUrl,
    device: deviceName || "Unknown Device",
    playedAt: playedAt && Number.isFinite(playedAt) ? playedAt : null,
  };
}
