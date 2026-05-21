import axios from "axios";

const FINGER_URL = "https://backend.xprime.tv/finger";
const WORKER_URL = "https://oca.lihala-n-tmurt.workers.dev/";
const TIMEOUT_MS = 5000;

const STATIC_TURNSTILE =
  "0.a8BuqfMnfr0_O4S-ibEOgGASGrgvjTa0vwg1UeeT1kZynpnrpFNmpKnS3SJ3sEhcjqZVYVGl8pK-9hjEcx5Q7fT0gT23Pe650S8YOCHckyQa_AEcBw6JeBnfu9gjil_h0cyOH_Yl7hVrEk9YHaGPlJ_J6kgGZBtiMBxqPbM0Wg8Oq-INZq1C4XUgEGHMY8NvBWWsAToKnN_5X8Bej44FYfLhDyqDqLekbHY6yTkXtf5kcmRhz4du-4kJooOaVmCSePtJI-NnH6VIR33gFosBzO1klvmz1iFosbId1yf7J21j2rHVnaFJRomW19OfcDRj5FUfP88umTLepAQPrkug0l5E-zJGBW8V37OutfKqLXy72MENPyfBcoWrsRD0Biz6kceuvEvx3WSyO8zFqBvgwiHEsGVTfO0VesPal1dnOCXClaII453unstC4cUbveMYjbCb83YSUv3I7W8BObw9iRfdri4bRJW73U2ibPvoMD9k_Z1E1Xy6ubsvJyBbnNehKUEsimjA1WWrc5dgSwgDRpWCU-xSBKzVH1-18yB-AgLRb5bpG6OhsVT6ec_eQhCLttdfJnhp2Z4unMGUvpIVSGLFlbWwbwIjKDXVVbr9b3Rw2e-QZGToMql15SZ5uy-w3q5oQhnI50bOETE1tvhvcNLg3Y2m_AVPe7d7oc474RjElxZkAQwGLaAK273wi9mtERSHHPCnpgs3tqYCxPEiFHfPg70dEVbuHed8OgOUZGQZvIIx4UMw1f3RHX5rZ0_6VKAQy2Ei9Ax_qRJdCgG5qypHvbd5AK-a7o0S7R6NqWfATwqU3r42wW-3CM9LJ9Ut8Ma9N0beSg6xZ6kUfhOeW1RP365Xvs0eIwIh0CVS2AwnVQRw_I_yYOA_135m5PtjpudxwAYkEW8q6RWo9rQgLMD9u02WfaLSGbgJoWEC2sWJkGThdnVxphOMDKUSz6u5aqDSJKPVG7HCIhiP0COSVHnhKS7UDeyPP1wv66WYe-M.QjJS2cgEVPrV8le9sAMDBg.22b297c695d2c24f0e2dac47f8dfd13d70ce3701a1f645d298d2efd12e67b767";

type FingerMeta = {
  name: string;
  year: string | number;
  tmdbId: string | number;
  imdbId: string;
};

type NormalizedSubtitle = {
  url: string;
  language: string;
  format: string;
};

type FingerResult = {
  provider: "finger";
  ok: true;
  latencyMs: number;
  stream: {
    type: "hls" | "file";
    url: string | null;
    qualities: Record<string, { type: "mp4"; url: string }> | null;
    headers: Record<string, string>;
    subtitles: NormalizedSubtitle[];
  };
  debug?: Record<string, unknown>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function findPayload(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return null;

    try {
      const parsed = JSON.parse(trimmed);
      const nested = findPayload(parsed);
      if (nested) return nested;
    } catch {}

    if (
      trimmed.startsWith("ey") ||
      /^[A-Za-z0-9_\-.=+/~%]+$/.test(trimmed)
    ) {
      return trimmed;
    }

    const directMatch =
      trimmed.match(/(?:^|[?&])v=([^&]+)/i) ||
      trimmed.match(/["']v["']\s*:\s*["']([^"']+)["']/i) ||
      trimmed.match(/["']payload["']\s*:\s*["']([^"']+)["']/i) ||
      trimmed.match(/["']token["']\s*:\s*["']([^"']+)["']/i);

    if (directMatch?.[1]) return directMatch[1];

    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPayload(item);
      if (found) return found;
    }
    return null;
  }

  if (isObject(value)) {
    const priorityKeys = [
      "v",
      "payload",
      "encrypted",
      "token",
      "data",
      "result",
      "url",
      "worker",
    ];

    for (const key of priorityKeys) {
      if (key in value) {
        const found = findPayload(value[key]);
        if (found) return found;
      }
    }

    for (const nested of Object.values(value)) {
      const found = findPayload(nested);
      if (found) return found;
    }
  }

  return null;
}

function normalizeSubtitles(data: unknown): NormalizedSubtitle[] {
  const subtitles: NormalizedSubtitle[] = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      if (!isObject(item)) continue;
      const url = typeof item.url === "string" ? item.url : null;
      if (!url) continue;

      subtitles.push({
        url,
        language:
          typeof item.language === "string"
            ? item.language
            : typeof item.lang === "string"
            ? item.lang
            : "unknown",
        format:
          typeof item.format === "string"
            ? item.format
            : url.toLowerCase().includes(".vtt")
            ? "vtt"
            : "srt",
      });
    }

    return subtitles;
  }

  if (isObject(data)) {
    for (const [key, value] of Object.entries(data)) {
      if (!isObject(value)) continue;
      const url =
        typeof value.url === "string"
          ? value.url
          : typeof value.subtitle_link === "string"
          ? value.subtitle_link
          : null;

      if (!url) continue;

      subtitles.push({
        url,
        language:
          typeof value.language === "string"
            ? value.language
            : typeof value.lang === "string"
            ? value.lang
            : key.split("_")[0] || "unknown",
        format:
          typeof value.format === "string"
            ? value.format
            : url.toLowerCase().includes(".vtt")
            ? "vtt"
            : "srt",
      });
    }
  }

  return subtitles;
}

function extractFirstUrlByPattern(
  value: unknown,
  pattern: RegExp,
): string | null {
  if (typeof value === "string") {
    const match = value.match(pattern);
    return match ? match[0] : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractFirstUrlByPattern(item, pattern);
      if (found) return found;
    }
    return null;
  }

  if (isObject(value)) {
    for (const nested of Object.values(value)) {
      const found = extractFirstUrlByPattern(nested, pattern);
      if (found) return found;
    }
  }

  return null;
}

function extractMp4Qualities(
  value: unknown,
): Record<string, { type: "mp4"; url: string }> | null {
  const qualities: Record<string, { type: "mp4"; url: string }> = {};

  function walk(node: unknown) {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    if (!isObject(node)) return;

    const url =
      typeof node.url === "string"
        ? node.url
        : typeof node.file === "string"
        ? node.file
        : null;

    const qualityRaw =
      typeof node.quality === "string" || typeof node.quality === "number"
        ? String(node.quality)
        : typeof node.resolution === "string" || typeof node.resolution === "number"
        ? String(node.resolution)
        : typeof node.label === "string"
        ? node.label
        : null;

    if (url && url.includes(".mp4")) {
      const key =
        qualityRaw?.replace(/[^\d]/g, "") ||
        "unknown";

      qualities[key] = {
        type: "mp4",
        url,
      };
    }

    for (const nested of Object.values(node)) walk(nested);
  }

  walk(value);

  return Object.keys(qualities).length ? qualities : null;
}

function extractWorkerStream(workerData: unknown) {
  const hlsPattern = /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i;
  const mp4Pattern = /https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i;

  const hlsUrl = extractFirstUrlByPattern(workerData, hlsPattern);
  if (hlsUrl) {
    return {
      type: "hls" as const,
      url: hlsUrl,
      qualities: null,
      subtitles: normalizeSubtitles(
        isObject(workerData)
          ? workerData.subtitles ?? workerData.captions ?? workerData.tracks
          : null,
      ),
    };
  }

  const qualities = extractMp4Qualities(workerData);
  if (qualities) {
    return {
      type: "file" as const,
      url: null,
      qualities,
      subtitles: normalizeSubtitles(
        isObject(workerData)
          ? workerData.subtitles ?? workerData.captions ?? workerData.tracks
          : null,
      ),
    };
  }

  const mp4Url = extractFirstUrlByPattern(workerData, mp4Pattern);
  if (mp4Url) {
    return {
      type: "file" as const,
      url: null,
      qualities: {
        unknown: {
          type: "mp4" as const,
          url: mp4Url,
        },
      },
      subtitles: normalizeSubtitles(
        isObject(workerData)
          ? workerData.subtitles ?? workerData.captions ?? workerData.tracks
          : null,
      ),
    };
  }

  throw new Error("finger worker returned no playable stream");
}

export async function fetchFingerMovie(meta: FingerMeta): Promise<FingerResult> {
  const startedAt = Date.now();

  const fingerRes = await axios.get(FINGER_URL, {
    timeout: TIMEOUT_MS,
    params: {
      name: meta.name,
      year: String(meta.year),
      id: String(meta.tmdbId),
      imdb: meta.imdbId,
      turnstile: STATIC_TURNSTILE,
    },
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      Referer: "https://xprime.tv/",
      Origin: "https://xprime.tv",
    },
    validateStatus: () => true,
  });

  if (fingerRes.status >= 400) {
    throw new Error(`finger returned HTTP ${fingerRes.status}`);
  }

  const payload = findPayload(fingerRes.data);
  if (!payload) {
    throw new Error("finger returned no worker payload");
  }

  const workerRes = await axios.get(WORKER_URL, {
    timeout: TIMEOUT_MS,
    params: { v: payload },
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    },
    validateStatus: () => true,
  });

  if (workerRes.status >= 400) {
    throw new Error(`finger worker returned HTTP ${workerRes.status}`);
  }

  const streamInfo = extractWorkerStream(workerRes.data);

  return {
    provider: "finger",
    ok: true,
    latencyMs: Date.now() - startedAt,
    stream: {
      type: streamInfo.type,
      url: streamInfo.url,
      qualities: streamInfo.qualities,
      headers: {},
      subtitles: streamInfo.subtitles,
    },
    debug: {
      fingerStatus: fingerRes.status,
      workerStatus: workerRes.status,
      payloadPreview: String(payload).slice(0, 180),
    },
  };
}
