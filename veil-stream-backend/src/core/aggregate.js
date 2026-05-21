const { normalizeStreamResult } = require("./normalize");
const { getEnabledMovieProviders } = require("./providers");
const { getCacheKey, getFromCache, setInCache } = require("./cache");
const { recordSuccess, recordFailure } = require("./metrics");
const { markProviderSuccess, markProviderFailure } = require("./health");
const { withTimeout } = require("../utils/withTimeout");
const { config } = require("../config");

const STREAM_TTL_MS = 5 * 60 * 1000;

function createProviderPromise(provider, tmdbId, context = {}) {
  return withTimeout(
    (async () => {
      const raw = await provider.fetchMovie(tmdbId, context);
      const normalized = normalizeStreamResult(raw);

      await recordSuccess(provider.name, normalized.latencyMs);
      await markProviderSuccess(provider.name);

      return {
        provider: provider.name,
        result: normalized,
      };
    })(),
    config.providerTimeoutMs,
    `provider ${provider.name}`,
  );
}

function getStreamScoreBreakdown(result) {
  const breakdown = {
    baseTypeScore: 0,
    directUrlScore: 0,
    qualityScore: 0,
    subtitleScore: 0,
    latencyPenalty: 0,
    total: 0,
  };

  if (result.stream.type === "hls") breakdown.baseTypeScore = 100;
  else if (result.stream.type === "file") breakdown.baseTypeScore = 75;

  if (result.stream.url) breakdown.directUrlScore = 20;

  const qualityKeys = result.stream.qualities
    ? Object.keys(result.stream.qualities)
        .map((v) => Number(v))
        .filter((v) => !Number.isNaN(v))
    : [];

  if (qualityKeys.length > 0) {
    breakdown.qualityScore = Math.max(...qualityKeys) / 120;
  }

  const subtitleCount = Array.isArray(result.stream.subtitles)
    ? result.stream.subtitles.length
    : 0;

  breakdown.subtitleScore = Math.min(subtitleCount * 2, 6);
  breakdown.latencyPenalty = result.latencyMs / 60;

  breakdown.total =
    breakdown.baseTypeScore +
    breakdown.directUrlScore +
    breakdown.qualityScore +
    breakdown.subtitleScore -
    breakdown.latencyPenalty;

  return breakdown;
}

async function runProviders(tmdbId, context = {}) {
  const enabledProviders = await getEnabledMovieProviders(context);

  if (!enabledProviders.length) {
    throw new Error("no enabled healthy providers");
  }

  const settledResults = await Promise.all(
    enabledProviders.map(async (provider) => {
      try {
        const success = await createProviderPromise(provider, tmdbId, context);
        const scoreBreakdown = getStreamScoreBreakdown(success.result);

        return {
          ok: true,
          provider: provider.name,
          result: success.result,
          score: scoreBreakdown.total,
          scoreBreakdown,
        };
      } catch (error) {
        const errorMessage = error && error.message ? error.message : String(error);

        await recordFailure(provider.name, errorMessage);
        await markProviderFailure(provider.name, errorMessage);

        return {
          ok: false,
          provider: provider.name,
          error: errorMessage,
        };
      }
    }),
  );

  return settledResults;
}

async function getBestMovieStream(tmdbId, context = {}) {
  const cacheKey = getCacheKey({
    type: "movie",
    tmdbId,
  });

  const bypassCache = Boolean(context.workerUrl);

  if (!bypassCache) {
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        cache: {
          hit: true,
          ttlMs: STREAM_TTL_MS,
        },
      };
    }
  }

  const settledResults = await runProviders(tmdbId, context);

  const successes = settledResults
    .filter((item) => item.ok)
    .sort((a, b) => b.score - a.score);

  if (!successes.length) {
    const failures = settledResults
      .filter((item) => !item.ok)
      .map((item) => ({
        provider: item.provider,
        error: item.error,
      }));

    throw new Error(JSON.stringify(failures));
  }

  const winner = successes[0].result;

  if (!bypassCache) {
    await setInCache(cacheKey, winner, STREAM_TTL_MS);
  }

  return {
    ...winner,
    cache: {
      hit: false,
      ttlMs: STREAM_TTL_MS,
    },
  };
}

module.exports = {
  getBestMovieStream,
  runProviders,
  getStreamScoreBreakdown,
  STREAM_TTL_MS,
};
