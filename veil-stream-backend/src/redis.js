const { createClient } = require("redis");

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redis = createClient({
  url: redisUrl,
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

let connected = false;

async function connectRedis() {
  if (connected) return redis;
  await redis.connect();
  connected = true;
  return redis;
}

module.exports = {
  redis,
  connectRedis,
};
