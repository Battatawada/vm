const { redis } = require("../redis");

function getCacheKey({ type, tmdbId }) {
  return `stream:${type}:${tmdbId}`;
}

function isValidCachedStream(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      value.ok === true &&
      typeof value.provider === "string" &&
      value.stream &&
      typeof value.stream === "object" &&
      typeof value.stream.type === "string"
  );
}

async function getFromCache(key) {
  const raw = await redis.get(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!isValidCachedStream(parsed)) {
      await redis.del(key);
      return null;
    }
    return parsed;
  } catch {
    await redis.del(key);
    return null;
  }
}

async function setInCache(key, value, ttlMs) {
  const ttlSeconds = Math.max(1, Math.floor(ttlMs / 1000));
  await redis.set(key, JSON.stringify(value), {
    EX: ttlSeconds,
  });
}

async function getCacheStats() {
  const info = await redis.info("memory");
  return {
    backend: "redis",
    info,
  };
}

module.exports = {
  getCacheKey,
  getFromCache,
  setInCache,
  getCacheStats,
};
