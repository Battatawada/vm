const userTokens = new Map();

function setUserToken(userId, token) {
  userTokens.set(String(userId), {
    token: String(token),
    updatedAt: new Date().toISOString(),
  });
}

function getUserToken(userId) {
  const entry = userTokens.get(String(userId));
  return entry ? entry.token : null;
}

function hasUserToken(userId) {
  return userTokens.has(String(userId));
}

function removeUserToken(userId) {
  return userTokens.delete(String(userId));
}

function listUserTokens() {
  return Array.from(userTokens.entries()).map(([userId, value]) => ({
    userId,
    updatedAt: value.updatedAt,
  }));
}

module.exports = {
  setUserToken,
  getUserToken,
  hasUserToken,
  removeUserToken,
  listUserTokens,
};
