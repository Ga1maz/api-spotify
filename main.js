import express from "express";
import "dotenv/config";
import { fetchCurrentlyPlaying, getDefaultUserAgent } from "./lib/lastfm.js";

const app = express();

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_USERNAME = process.env.LASTFM_USERNAME;
const PORT = process.env.PORT || 8888;
const DEVICE_NAME = process.env.DEVICE_NAME || "Unknown Device";
const LASTFM_USER_AGENT = process.env.LASTFM_USER_AGENT || getDefaultUserAgent();

let cache = {
  isActive: false,
  nowPlaying: false,
  cover: "",
  title: "",
  artist: "",
  album: "",
  spotifyUrl: "",
  device: DEVICE_NAME,
  playedAt: null,
};

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  next();
});

async function startPolling() {
  let nextDelayMs = 2000;
  try {
    const fresh = await fetchCurrentlyPlaying({
      apiKey: LASTFM_API_KEY,
      username: LASTFM_USERNAME,
      deviceName: DEVICE_NAME,
      userAgent: LASTFM_USER_AGENT,
    });
    const changed =
      fresh.isActive !== cache.isActive ||
      fresh.title !== cache.title ||
      fresh.artist !== cache.artist;
    if (changed) cache = fresh;
  } catch (e) {
    nextDelayMs = 10000;
    const status = e?.response?.status;
    const data = e?.response?.data;
    if (status) {
      console.error(
        "Server error:",
        `Last.fm responded ${status}`,
        typeof data === "string" ? data : JSON.stringify(data)
      );
    } else if (e?.lastfm) {
      console.error("Server error:", "Last.fm error", JSON.stringify(e.lastfm));
    } else {
      console.error("Server error:", e?.message || String(e));
    }
  }
  setTimeout(startPolling, nextDelayMs);
}

app.get("/api/spotify", (req, res) => {
  res.json(cache);
});

app.listen(PORT, async () => {
  console.log(`Server on: http://localhost:${PORT}/api/spotify`);
  await startPolling();
});
