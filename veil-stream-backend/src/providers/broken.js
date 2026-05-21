async function fetchBrokenMovie(tmdbId) {
  await new Promise((resolve) => setTimeout(resolve, 200));
  throw new Error(`broken provider forced failure for tmdbId=${tmdbId}`);
}

module.exports = {
  fetchBrokenMovie,
};
