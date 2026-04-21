import { fetchCurrentlyPlaying, getDefaultUserAgent } from "../lib/lastfm.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  res.setHeader("CDN-Cache-Control", "no-store");
  if (typeof res.removeHeader === "function") res.removeHeader("ETag");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const debug = req.query?.debug === "1";

  try {
    const data = await fetchCurrentlyPlaying({
      apiKey: process.env.LASTFM_API_KEY,
      username: process.env.LASTFM_USERNAME,
      deviceName: process.env.DEVICE_NAME,
      userAgent: process.env.LASTFM_USER_AGENT || getDefaultUserAgent(),
    });

    res.status(200).json({ ...data, fetchedAt: new Date().toISOString() });
  } catch (e) {
    const status = e?.response?.status;
    const data = e?.response?.data;
    console.error(
      "Vercel error:",
      status ? `Last.fm responded ${status}` : e?.message || String(e),
      status ? (typeof data === "string" ? data : JSON.stringify(data)) : ""
    );
    if (e?.lastfm) console.error("Vercel error details:", JSON.stringify(e.lastfm));
    res.status(502).json({
      isActive: false,
      nowPlaying: false,
      cover: "",
      title: "",
      artist: "",
      album: "",
      spotifyUrl: "",
      device: process.env.DEVICE_NAME || "Unknown Device",
      playedAt: null,
      error: "Last.fm error",
      ...(debug
        ? {
            errorMessage: e?.message || String(e),
            errorDetails: e?.lastfm || null,
          }
        : null),
      fetchedAt: new Date().toISOString(),
    });
  }
}
