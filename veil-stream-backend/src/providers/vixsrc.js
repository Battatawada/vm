const axios = require("axios");

const BASE_URL = "https://vixsrc.to";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  Referer: "https://vixsrc.to/",
  Origin: "https://vixsrc.to",
};

async function fetchVixsrcMovie(tmdbId) {
  try {
    await axios.get(`${BASE_URL}/api/movie/${tmdbId}`, {
      timeout: 10000,
      headers: {
        "User-Agent": BROWSER_HEADERS["User-Agent"],
        Referer: `${BASE_URL}/`,
      },
    });

    throw new Error("vixsrc request unexpectedly passed initial gate; implementation not completed");
  } catch (error) {
    if (error.response?.status === 403) {
      throw new Error("vixsrc blocked by Cloudflare from this Oracle VM");
    }
    throw error;
  }
}

module.exports = {
  fetchVixsrcMovie,
};
