const { requireRole } = require("../lib/auth");
const { applyDecision } = require("../lib/platform");

module.exports = function handler(req, res) {
  if (req.method === "POST") {
    if (!requireRole(req, res, ["client"])) {
      return;
    }
    const result = applyDecision(req.viewer, req.body || {});
    res.status(result.status).json(result.body);
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
