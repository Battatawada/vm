const { redis } = require("../redis");

const HEALTH_KEY = "health:providers";

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 10 * 60 * 1000;

async function getHealthObject() {
  const raw = await redis.get(HEALTH_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveHealthObject(health) {
  await redis.set(HEALTH_KEY, JSON.stringify(health));
}

function createDefaultHealth(provider) {
  return {
    provider,
    healthy: true,
    consecutiveFailures: 0,
    disabledUntil: null,
    lastFailureAt: null,
    lastFailureReason: null,
  };
}

async function markProviderSuccess(provider) {
  const health = await getHealthObject();
  const entry = health[provider] || createDefaultHealth(provider);

  entry.healthy = true;
  entry.consecutiveFailures = 0;
  entry.disabledUntil = null;
  entry.lastFailureReason = null;

  health[provider] = entry;
  await saveHealthObject(health);
}

async function markProviderFailure(provider, reason) {
  const health = await getHealthObject();
  const entry = health[provider] || createDefaultHealth(provider);

  entry.consecutiveFailures += 1;
  entry.lastFailureAt = new Date().toISOString();
  entry.lastFailureReason = reason;

  if (entry.consecutiveFailures >= FAILURE_THRESHOLD) {
    entry.healthy = false;
    entry.disabledUntil = new Date(Date.now() + COOLDOWN_MS).toISOString();
  }

  health[provider] = entry;
  await saveHealthObject(health);
}

async function isProviderHealthy(provider) {
  const health = await getHealthObject();
  const entry = health[provider] || createDefaultHealth(provider);

  if (entry.healthy) {
    return true;
  }

  if (!entry.disabledUntil) {
    return false;
  }

  const disabledUntilTs = new Date(entry.disabledUntil).getTime();
  if (Date.now() >= disabledUntilTs) {
    entry.healthy = true;
    entry.consecutiveFailures = 0;
    entry.disabledUntil = null;
    entry.lastFailureReason = null;

    health[provider] = entry;
    await saveHealthObject(health);
    return true;
  }

  return false;
}

async function getProviderHealth() {
  const health = await getHealthObject();
  return Object.values(health);
}

module.exports = {
  FAILURE_THRESHOLD,
  COOLDOWN_MS,
  markProviderSuccess,
  markProviderFailure,
  isProviderHealthy,
  getProviderHealth,
};
