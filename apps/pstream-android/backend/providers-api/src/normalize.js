import { config } from "./config.js";

function pickBestFile(qualities = {}) {
  const preferredOrder = ["4k", "1080", "720", "480", "360", "unknown"];

  for (const quality of preferredOrder) {
    const file = qualities[quality];
    if (file?.url) {
      return { quality, file };
    }
  }

  const firstEntry = Object.entries(qualities).find(([, file]) => file?.url);
  if (!firstEntry) {
    return null;
  }

  const [quality, file] = firstEntry;
  return { quality, file };
}

function buildM3u8ProxyUrl(playlist, headers = {}) {
  if (!playlist || !config.m3u8ProxyUrl) {
    return null;
  }

  const url = new URL(config.m3u8ProxyUrl);
  url.searchParams.set("url", playlist);

  const referer = headers.referer || headers.Referer;
  const origin = headers.origin || headers.Origin;

  if (referer) {
    url.searchParams.set("referer", referer);
  }

  if (origin) {
    url.searchParams.set("origin", origin);
  }

  return url.toString();
}

function normalizeQualities(qualities = {}) {
  if (!qualities || typeof qualities !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(qualities).filter(([, value]) => value?.url),
  );
}

function buildPlaybackInfo(stream) {
  if (!stream) {
    return {
      playbackUrl: null,
      playbackType: null,
      selectedQuality: null,
      proxiedPlaylist: null,
    };
  }

  if (stream.type === "hls") {
    const playlist = stream.playlist ?? null;
    const proxiedPlaylist = buildM3u8ProxyUrl(playlist, stream.headers ?? {});

    return {
      playbackUrl: proxiedPlaylist || playlist,
      playbackType: "hls",
      selectedQuality: null,
      proxiedPlaylist,
    };
  }

  if (stream.type === "file") {
    const bestFile = pickBestFile(stream.qualities);
    return {
      playbackUrl: bestFile?.file?.url ?? null,
      playbackType: bestFile?.file?.type ?? "file",
      selectedQuality: bestFile?.quality ?? null,
      proxiedPlaylist: null,
    };
  }

  return {
    playbackUrl: null,
    playbackType: stream.type ?? null,
    selectedQuality: null,
    proxiedPlaylist: null,
  };
}

export function normalizeStream(stream) {
  return {
    id: stream?.id ?? null,
    type: stream?.type ?? null,
    playlist: stream?.playlist ?? null,
    proxiedPlaylist:
      stream?.type === "hls"
        ? buildM3u8ProxyUrl(stream?.playlist ?? null, stream?.headers ?? {})
        : null,
    qualities: normalizeQualities(stream?.qualities ?? {}),
    headers: stream?.headers ?? {},
    preferredHeaders: stream?.preferredHeaders ?? {},
    captions: stream?.captions ?? [],
    flags: stream?.flags ?? [],
    ...buildPlaybackInfo(stream),
  };
}

export function normalizeRunOutput(output, sourceMeta, embedMeta) {
  return {
    sourceId: output.sourceId,
    sourceName: sourceMeta?.name ?? output.sourceId,
    embedId: output.embedId ?? null,
    embedName: embedMeta?.name ?? output.embedId ?? null,
    stream: normalizeStream(output.stream),
  };
}
