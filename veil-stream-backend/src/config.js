function parseEnabledProviders(value) {
  if (!value || !value.trim()) return [];

  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

const config = {
  port: Number(process.env.PORT || 3002),
  enabledProviders: parseEnabledProviders(process.env.ENABLED_PROVIDERS || "vidlink"),
  providerTimeoutMs: Number(process.env.PROVIDER_TIMEOUT_MS || 8000),
};

module.exports = {
  config,
};
