const { redis } = require("../redis");

const METRICS_KEY = "metrics:providers";

async function getMetricsObject() {
  const raw = await redis.get(METRICS_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveMetricsObject(metrics) {
  await redis.set(METRICS_KEY, JSON.stringify(metrics));
}

function createDefaultMetric(provider) {
  return {
    provider,
    successCount: 0,
    failureCount: 0,
    totalLatencyMs: 0,
    avgLatencyMs: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastError: null,
  };
}

async function recordSuccess(provider, latencyMs) {
  const metrics = await getMetricsObject();
  const entry = metrics[provider] || createDefaultMetric(provider);

  entry.successCount += 1;
  entry.totalLatencyMs += latencyMs;
  entry.avgLatencyMs = Math.round(entry.totalLatencyMs / entry.successCount);
  entry.lastSuccessAt = new Date().toISOString();
  entry.lastError = null;

  metrics[provider] = entry;
  await saveMetricsObject(metrics);
}

async function recordFailure(provider, errorMessage) {
  const metrics = await getMetricsObject();
  const entry = metrics[provider] || createDefaultMetric(provider);

  entry.failureCount += 1;
  entry.lastFailureAt = new Date().toISOString();
  entry.lastError = errorMessage;

  metrics[provider] = entry;
  await saveMetricsObject(metrics);
}

async function getProviderMetrics() {
  const metrics = await getMetricsObject();
  return Object.values(metrics);
}

module.exports = {
  recordSuccess,
  recordFailure,
  getProviderMetrics,
};
