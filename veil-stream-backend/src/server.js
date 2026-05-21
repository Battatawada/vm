require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pino = require("pino");

const { validateWorkerUrl } = require("./providers/worker");
const { getBestMovieStream } = require("./core/aggregate");
const { getCacheStats } = require("./core/cache");
const { getProviderMetrics } = require("./core/metrics");
const { getEnabledMovieProviders, getProviderDefinitions } = require("./core/providers");
const { getProviderHealth } = require("./core/health");
const { badRequest, upstreamFailure } = require("./utils/httpErrors");
const { validateTmdbId } = require("./utils/validators");
const { config } = require("./config");
const { connectRedis } = require("./redis");

const app = express();
const logger = pino();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "veil-stream-backend",
    timestamp: new Date().toISOString(),
  });
});

app.get("/debug/cache", async (req, res) => {
  const stats = await getCacheStats();
  res.json({
    ok: true,
    cache: stats,
  });
});

app.get("/debug/metrics", async (req, res) => {
  res.json({
    ok: true,
    providers: await getProviderMetrics(),
  });
});

app.get("/debug/health", async (req, res) => {
  res.json({
    ok: true,
    providers: await getProviderHealth(),
  });
});

app.get("/debug/providers/order", async (req, res) => {
  const context = {
    workerUrl: req.query.workerUrl ? String(req.query.workerUrl) : undefined,
  };

  const ordered = (await getEnabledMovieProviders(context)).map((provider) => ({
    name: provider.name,
    priority: provider.priority,
  }));

  res.json({
    ok: true,
    context,
    enabledProvidersFromConfig: config.enabledProviders,
    providers: ordered,
  });
});

app.get("/debug/providers/all", (req, res) => {
  const context = {
    workerUrl: req.query.workerUrl ? String(req.query.workerUrl) : undefined,
  };

  res.json({
    ok: true,
    context,
    enabledProvidersFromConfig: config.enabledProviders,
    providers: getProviderDefinitions(context),
  });
});

app.get("/stream", async (req, res) => {
  try {
    const validation = validateTmdbId(req.query.tmdbId);

    if (!validation.valid) {
      const error = badRequest(validation.message);
      return res.status(error.status).json(error.body);
    }

    const tmdbId = validation.value;
    const context = {
      workerUrl: req.query.workerUrl ? validateWorkerUrl(String(req.query.workerUrl)) : undefined,
    };

    const result = await getBestMovieStream(tmdbId, context);

    const directUrl = result?.stream?.url || null;
    const qualityUrl =
      result?.stream?.qualities && typeof result.stream.qualities === "object"
        ? Object.entries(result.stream.qualities)
            .map(([key, value]) => ({
              key,
              url: value && value.url ? value.url : null,
              rank: /^\d+$/.test(key) ? Number(key) : -1,
            }))
            .filter((item) => item.url)
            .sort((a, b) => b.rank - a.rank)[0]?.url || null
        : null;

    const finalUrl = directUrl || qualityUrl;

    if (!finalUrl) {
      throw new Error("no playable url in normalized result");
    }

    return res.json({
      url: finalUrl,
      provider: result.provider,
      latency: result.latencyMs,
    });
  } catch (error) {
    logger.error({ err: error }, "stream aggregation failed");

    const formatted = upstreamFailure(
      "no provider returned a valid stream",
      process.env.NODE_ENV === "production" ? null : error.message,
    );

    return res.status(formatted.status).json(formatted.body);
  }
});

const PORT = config.port || 3002;

(async () => {
  await connectRedis();
  app.listen(PORT, () => {
    logger.info(`Veil stream backend listening on port ${PORT}`);
  });
})();
