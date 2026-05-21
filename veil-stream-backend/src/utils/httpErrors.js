function badRequest(message, details = null) {
  return {
    status: 400,
    body: {
      ok: false,
      error: {
        code: "BAD_REQUEST",
        message,
        details,
      },
    },
  };
}

function upstreamFailure(message, details = null) {
  return {
    status: 502,
    body: {
      ok: false,
      error: {
        code: "UPSTREAM_FAILURE",
        message,
        details,
      },
    },
  };
}

module.exports = {
  badRequest,
  upstreamFailure,
};
