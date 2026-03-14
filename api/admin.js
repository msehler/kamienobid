const { requireRole } = require("../lib/auth");
const { getAdminSummary, updateAdmin } = require("../lib/platform");

module.exports = function handler(req, res) {
  if (!requireRole(req, res, ["admin"])) {
    return;
  }

  if (req.method === "GET") {
    res.status(200).json(getAdminSummary());
    return;
  }

  if (req.method === "POST") {
    const result = updateAdmin(req.body || {});
    res.status(result.status).json(result.body);
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
