const { fetchWorkerStream } = require("../providers/worker");
const { fetchVidlinkMovie } = require("../providers/vidlink");
const { fetchVixsrcMovie } = require("../providers/vixsrc");
const { fetchVidrockMovie } = require("../providers/vidrock");
const { getProviderMetrics } = require("./metrics");
const { isProviderHealthy } = require("./health");
const { config } = require("../config");

const providers = [
  {
    name: "worker",
    priority: 120,
    requiresWorkerUrl: true,
    fetchMovie: async (_tmdbId, context = {}) => {
      return fetchWorkerStream(context.workerUrl);
    },
  },
  {
    name: "vidlink",
    priority: 100,
    fetchMovie: async (tmdbId) => fetchVidlinkMovie(tmdbId),
  },
  {
    name: "vidrock",
    priority: 98,
    fetchMovie: async (tmdbId) => fetchVidrockMovie(tmdbId),
  },
  {
    name: "vixsrc",
    priority: 90,
    fetchMovie: async (tmdbId) => fetchVixsrcMovie(tmdbId),
  },
];

function scoreProvider(provider, metric) {
  if (!metric) return provider.priority;

  const successCount = metric.successCount || 0;
  const failureCount = metric.failureCount || 0;
  const avgLatencyMs = metric.avgLatencyMs || 5000;

  const totalAttempts = successCount + failureCount;
  const successRate = totalAttempts > 0 ? successCount / totalAttempts : 0.5;

  const successScore = successRate * 100;
  const latencyScore = Math.max(0, 50 - avgLatencyMs / 100);

  return provider.priority + successScore + latencyScore;
}

function isProviderEnabledByConfig(providerName) {
  return config.enabledProviders.includes(providerName.toLowerCase());
}

function hasRequiredContext(provider, context = {}) {
  if (provider.requiresWorkerUrl) {
    return Boolean(context.workerUrl);
  }
  return true;
}

async function getEnabledMovieProviders(context = {}) {
  const metrics = await getProviderMetrics();
  const metricMap = new Map(metrics.map((metric) => [metric.provider, metric]));

  const checks = await Promise.all(
    providers.map(async (provider) => {
      if (!isProviderEnabledByConfig(provider.name)) {
        return { provider, enabled: false };
      }

      if (!hasRequiredContext(provider, context)) {
        return { provider, enabled: false };
      }

      const healthy = await isProviderHealthy(provider.name);

      return {
        provider,
        enabled: healthy,
      };
    }),
  );

  return checks
    .filter((item) => item.enabled)
    .map((item) => item.provider)
    .sort((a, b) => {
      const scoreA = scoreProvider(a, metricMap.get(a.name));
      const scoreB = scoreProvider(b, metricMap.get(b.name));
      return scoreB - scoreA;
    });
}

function getProviderDefinitions(context = {}) {
  return providers.map((provider) => ({
    name: provider.name,
    priority: provider.priority,
    enabledByConfig: isProviderEnabledByConfig(provider.name),
    requiresWorkerUrl: Boolean(provider.requiresWorkerUrl),
    workerUrlAvailable: provider.requiresWorkerUrl ? Boolean(context.workerUrl) : null,
  }));
}

module.exports = {
  getEnabledMovieProviders,
  getProviderDefinitions,
};
