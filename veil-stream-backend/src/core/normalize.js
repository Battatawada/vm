function normalizeStreamResult(result) {
  if (!result?.ok || !result?.stream) {
    throw new Error("cannot normalize invalid provider result");
  }

  const streamUrl = result.stream.url || null;

  if (!streamUrl && !result.stream.qualities) {
    throw new Error("provider result has no stream url or qualities");
  }

  return {
    ok: true,
    provider: result.provider,
    latencyMs: result.latencyMs,
    stream: {
      type: result.stream.type || "unknown",
      url: streamUrl,
      qualities: result.stream.qualities || null,
      headers: result.stream.headers || {},
      subtitles: Array.isArray(result.stream.captions)
        ? result.stream.captions.map((caption) => ({
            url: caption.url,
            language: caption.language || "Unknown",
            format: caption.type || "unknown",
          }))
        : [],
    },
  };
}

module.exports = {
  normalizeStreamResult,
};
