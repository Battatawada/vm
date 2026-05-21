const express = require("express");
const {
  setUserToken,
  getUserToken,
  removeUserToken,
  listUserTokens,
} = require("../core/userTokens");

const router = express.Router();

router.post("/token", (req, res) => {
  const { userId, token } = req.body || {};

  if (!userId || !token) {
    return res.status(400).json({
      ok: false,
      error: "userId and token are required",
    });
  }

  setUserToken(userId, token);

  return res.json({
    ok: true,
    userId: String(userId),
  });
});

router.get("/token/:userId", (req, res) => {
  const token = getUserToken(req.params.userId);

  if (!token) {
    return res.status(404).json({
      ok: false,
      error: "token not found",
    });
  }

  return res.json({
    ok: true,
    userId: String(req.params.userId),
    hasToken: true,
  });
});

router.delete("/token/:userId", (req, res) => {
  const removed = removeUserToken(req.params.userId);

  return res.json({
    ok: true,
    userId: String(req.params.userId),
    removed,
  });
});

router.get("/tokens", (req, res) => {
  return res.json({
    ok: true,
    users: listUserTokens(),
  });
});

module.exports = router;
