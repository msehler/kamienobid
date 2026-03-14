const { requireRole } = require("../lib/auth");
const { createBid, listBids } = require("../lib/platform");

module.exports = function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json(listBids(req.viewer, req.query || {}));
    return;
  }

  if (req.method === "POST") {
    if (!requireRole(req, res, ["lawyer"])) {
      return;
    }
    const result = createBid(req.viewer, req.body || {});
    res.status(result.status).json(result.body);
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
