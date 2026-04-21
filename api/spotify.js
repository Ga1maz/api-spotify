import { fetchCurrentlyPlaying, getDefaultUserAgent } from "../lib/lastfm.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const data = await fetchCurrentlyPlaying({
      apiKey: process.env.LASTFM_API_KEY,
      username: process.env.LASTFM_USERNAME,
      deviceName: process.env.DEVICE_NAME,
      userAgent: process.env.LASTFM_USER_AGENT || getDefaultUserAgent(),
    });

    // Под Vercel лучше не кэшировать надолго, чтобы трек обновлялся быстро.
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(data);
  } catch (e) {
    const status = e?.response?.status;
    const data = e?.response?.data;
    console.error(
      "Vercel error:",
      status ? `Last.fm responded ${status}` : e?.message || String(e),
      status ? (typeof data === "string" ? data : JSON.stringify(data)) : ""
    );
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ isActive: false, track: null, error: "Last.fm error" });
  }
}

