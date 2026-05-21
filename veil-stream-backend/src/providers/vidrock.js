const axios = require("axios");
const CryptoJS = require("crypto-js");

const BASE_URL = "https://vidrock.net/api";
const PASSPHRASE = "x7k9mPqT2rWvY8zA5bC3nF6hJ2lK4mN9";

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
  Referer: "https://vidrock.net/",
  Origin: "https://vidrock.net",
};

function encryptMovieId(tmdbId) {
  const key = CryptoJS.enc.Utf8.parse(PASSPHRASE);
  const iv = CryptoJS.enc.Utf8.parse(PASSPHRASE.substring(0, 16));

  const encrypted = CryptoJS.AES.encrypt(String(tmdbId), key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  let encryptedBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
  encryptedBase64 = encryptedBase64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return encodeURIComponent(encryptedBase64);
}

function buildMirrorStream(url, headers = REQUEST_HEADERS) {
  return {
    type: "hls",
    url,
    qualities: null,
    headers,
    captions: [],
  };
}

function buildFileStreamFromPlaylist(playlistData, headers = REQUEST_HEADERS) {
  const qualities = {};

  for (const stream of playlistData) {
    if (!stream?.url || !stream?.resolution) continue;
    qualities[String(stream.resolution)] = {
      type: "mp4",
      url: stream.url,
    };
  }

  return {
    type: "file",
    url: null,
    qualities,
    headers,
    captions: [],
  };
}

async function fetchVidrockMovie(tmdbId) {
  const startedAt = Date.now();
  const encryptedId = encryptMovieId(tmdbId);

  const res = await axios.get(`${BASE_URL}/movie/${encryptedId}`, {
    timeout: 15000,
    headers: REQUEST_HEADERS,
    validateStatus: () => true,
  });

  if (res.status === 403) {
    throw new Error("vidrock blocked with 403 from this Oracle VM");
  }

  if (res.status >= 400) {
    throw new Error(`vidrock returned HTTP ${res.status}`);
  }

  const data = res.data;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("vidrock returned invalid response");
  }

  for (const [sourceName, sourceData] of Object.entries(data)) {
    if (!sourceData?.url) continue;

    if (
      sourceName === "Atlas" ||
      String(sourceData.url).includes("cdn.vidrock.store/playlist/")
    ) {
      const playlistRes = await axios.get(sourceData.url, {
        timeout: 15000,
        headers: REQUEST_HEADERS,
        validateStatus: () => true,
      });

      if (playlistRes.status >= 400) continue;

      if (Array.isArray(playlistRes.data) && playlistRes.data.length > 0) {
        const stream = buildFileStreamFromPlaylist(playlistRes.data);

        if (stream.qualities && Object.keys(stream.qualities).length > 0) {
          return {
            provider: "vidrock",
            ok: true,
            latencyMs: Date.now() - startedAt,
            stream,
            raw: data,
          };
        }
      }

      continue;
    }

    if (
      String(sourceName).includes("Astra") ||
      String(sourceData.url).includes(".workers.dev")
    ) {
      continue;
    }

    return {
      provider: "vidrock",
      ok: true,
      latencyMs: Date.now() - startedAt,
      stream: buildMirrorStream(sourceData.url),
      raw: data,
    };
  }

  throw new Error("vidrock returned no usable stream");
}

module.exports = {
  fetchVidrockMovie,
};
