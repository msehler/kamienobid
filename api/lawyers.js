const { loadViewer, rememberAccount, requireRole } = require("../lib/auth");
const { completeLawyerRegistration, listLawyers, updateLawyerProfile } = require("../lib/platform");

module.exports = function handler(req, res) {
  req.viewer = req.viewer || loadViewer(req);

  if (req.method === "GET") {
    res.status(200).json(listLawyers(req.viewer));
    return;
  }

  if (req.method === "POST") {
    if (!requireRole(req, res, ["lawyer"])) {
      return;
    }
    const result = req.body?.action === "complete-registration"
      ? completeLawyerRegistration(req.viewer, req.body || {})
      : updateLawyerProfile(req.viewer, req.body || {});
    if (result.body?.lawyer?.email) {
      rememberAccount(res, req, result.body.lawyer.email);
    }
    res.status(result.status).json(result.body);
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
