const { createSessionForUserId, loadViewer, rememberAccount, requireRole, setSessionCookie } = require("../lib/auth");
const { getAdminSummary, updateAdmin } = require("../lib/platform");

module.exports = function handler(req, res) {
  req.viewer = req.viewer || loadViewer(req);

  if (!requireRole(req, res, ["admin"])) {
    return;
  }

  if (req.method === "GET") {
    res.status(200).json(getAdminSummary());
    return;
  }

  if (req.method === "POST") {
    const result = updateAdmin(req.viewer, req.body || {});
    if (req.body?.action === "impersonate-user" && result.body?.user?.id) {
      const token = createSessionForUserId(result.body.user.id);
      setSessionCookie(res, token);
      rememberAccount(res, req, result.body.user.email);
    } else if (result.body?.user?.email) {
      rememberAccount(res, req, result.body.user.email);
    }
    res.status(result.status).json(result.body);
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
