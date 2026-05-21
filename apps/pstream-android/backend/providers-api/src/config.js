function trimTrailingSlash(value) {
  return value ? value.replace(/\/+$/, "") : "";
}

export const config = {
  port: Number(process.env.PORT || 3001),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 90000),
  simpleProxyUrl: trimTrailingSlash(
    process.env.SIMPLE_PROXY_URL || "http://127.0.0.1:3000",
  ),
  m3u8ProxyUrl: trimTrailingSlash(
    process.env.M3U8_PROXY_URL || "",
  ),
};
