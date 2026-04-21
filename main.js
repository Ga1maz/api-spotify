import express from "express";
import axios from "axios";
import "dotenv/config";

const app = express();

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_USERNAME = process.env.LASTFM_USERNAME;
const PORT = process.env.PORT || 8888;
const DEVICE_NAME = process.env.DEVICE_NAME || "Unknown Device";

let cache = { isActive: false, track: null };

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  next();
});

async function fetchCurrentlyPlaying() {
  const recentRes = await axios.get("https://ws.audioscrobbler.com/2.0/", {
    params: {
      method: "user.getrecenttracks",
      user: LASTFM_USERNAME,
      api_key: LASTFM_API_KEY,
      format: "json",
      limit: 1,
      extended: 1,
    },
    timeout: 5000,
  });

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
  const spotifyUrl = `https://open.spotify.com/search/${artist} ${title}`.replace(/ /g, "%20");

  return {
    isActive: true,
    nowPlaying: isNowPlaying,
    cover,
    title,
    artist,
    album,
    spotifyUrl,
    device: DEVICE_NAME,
  };
}

async function startPolling() {
  try {
    const fresh = await fetchCurrentlyPlaying();
    const changed =
      fresh.isActive !== cache.isActive ||
      fresh.title !== cache.title ||
      fresh.artist !== cache.artist;
    if (changed) cache = fresh;
  } catch (e) {
    console.error("Server error:", e.message);
  }
  setTimeout(startPolling, 2000);
}

app.get("/api/spotify", (req, res) => {
  res.json(cache);
});

app.listen(PORT, async () => {
  console.log(`Server on: http://localhost:${PORT}/api/spotify`);
  await startPolling();
});