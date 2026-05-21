function validateTmdbId(value) {
  if (value === undefined || value === null || value === "") {
    return {
      valid: false,
      message: "tmdbId is required",
    };
  }

  const normalized = String(value).trim();

  if (!/^\d+$/.test(normalized)) {
    return {
      valid: false,
      message: "tmdbId must be a numeric string",
    };
  }

  return {
    valid: true,
    value: normalized,
  };
}

module.exports = {
  validateTmdbId,
};
