const { requireRole } = require("../lib/auth");
const { getRequestOrigin } = require("../lib/http");
const { confirmCheckout, createCheckout } = require("../lib/platform");

module.exports = async function handler(req, res) {
  if (!requireRole(req, res, ["client", "admin"])) {
    return;
  }

  if (req.method === "POST") {
    if (req.body?.action === "create-checkout") {
      const result = await createCheckout(req.viewer, req.body || {}, getRequestOrigin(req));
      res.status(result.status).json(result.body);
      return;
    }

    if (req.body?.action === "confirm-checkout") {
      const result = await confirmCheckout(req.viewer, req.body || {});
      res.status(result.status).json(result.body);
      return;
    }
  }

  res.status(405).json({ error: "Method not allowed" });
};
