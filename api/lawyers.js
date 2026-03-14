const { requireRole } = require("../lib/auth");
const { listLawyers, updateLawyerProfile } = require("../lib/platform");

module.exports = function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json(listLawyers(req.viewer));
    return;
  }

  if (req.method === "POST") {
    if (!requireRole(req, res, ["lawyer"])) {
      return;
    }
    const result = updateLawyerProfile(req.viewer, req.body || {});
    res.status(result.status).json(result.body);
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
