const axios = require("axios");

const ENC_URL = "https://enc-dec.app/api/enc-vidlink";
const API_BASE = "https://vidlink.pro/api/b";

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  Referer: "https://vidlink.pro/",
  Origin: "https://vidlink.pro",
};

async function getEncryptedTmdbId(tmdbId) {
  const res = await axios.get(ENC_URL, {
    params: { text: String(tmdbId) },
    timeout: 10000,
    headers: {
      "User-Agent": REQUEST_HEADERS["User-Agent"],
    },
  });

  if (!res.data?.result) {
    throw new Error("vidlink encryption failed");
  }

  return res.data.result;
}

async function fetchVidlinkMovie(tmdbId) {
  const startedAt = Date.now();

  const encryptedId = await getEncryptedTmdbId(tmdbId);

  const res = await axios.get(`${API_BASE}/movie/${encryptedId}`, {
    timeout: 15000,
    headers: REQUEST_HEADERS,
  });

  const data = res.data;

  if (!data?.stream?.playlist && !data?.stream?.qualities) {
    throw new Error("vidlink returned no playable stream");
  }

  return {
    provider: "vidlink",
    ok: true,
    latencyMs: Date.now() - startedAt,
    stream: {
      type: data.stream.type || "unknown",
      url: data.stream.playlist || null,
      qualities: data.stream.qualities || null,
      headers: data.stream.headers || REQUEST_HEADERS,
      captions: Array.isArray(data.stream.captions) ? data.stream.captions : [],
    },
    raw: data,
  };
}

module.exports = {
  fetchVidlinkMovie,
};
