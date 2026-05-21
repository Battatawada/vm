function validateWorkerUrl(workerUrl) {
  if (!workerUrl || typeof workerUrl !== "string") {
    throw new Error("workerUrl is required");
  }

  let parsed;
  try {
    parsed = new URL(workerUrl);
  } catch {
    throw new Error("workerUrl is invalid");
  }

  if (!parsed.hostname.includes("workers.dev")) {
    throw new Error("workerUrl must include workers.dev");
  }

  if (!parsed.searchParams.get("v")) {
    throw new Error("workerUrl must include v param");
  }

  return parsed.toString();
}

async function fetchWorkerStream(workerUrl) {
  const startedAt = Date.now();
  const validUrl = validateWorkerUrl(workerUrl);

  return {
    provider: "worker",
    ok: true,
    latencyMs: Date.now() - startedAt,
    stream: {
      type: "hls",
      url: validUrl,
      qualities: null,
      headers: {},
      subtitles: [],
    },
  };
}

module.exports = {
  validateWorkerUrl,
  fetchWorkerStream,
};
