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
      track: null,
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

  if (recentRes.data?.error) {
    const message =
      recentRes.data?.message ||
      `Last.fm error ${recentRes.data?.error || "unknown"}`;
    const err = new Error(message);
    err.lastfm = recentRes.data;
    throw err;
  }

  const tracks = recentRes.data.recenttracks?.track;
  if (!tracks || tracks.length === 0) {
    return { isActive: false, track: null };
  }

  const track = Array.isArray(tracks) ? tracks[0] : tracks;
  const isNowPlaying = track["@attr"]?.nowplaying === "true";

  if (!isNowPlaying) {
    const playedAt = track.date?.uts ? Number(track.date.uts) : null;
    const now = Math.floor(Date.now() / 1000);
    if (!playedAt || now - playedAt > 600) {
      return { isActive: false, track: null };
    }
  }

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
    isActive: true,
    nowPlaying: isNowPlaying,
    cover,
    title,
    artist,
    album,
    spotifyUrl,
    device: deviceName || "Unknown Device",
  };
}

