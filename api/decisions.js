const { applyDecision } = require("../lib/platform");

module.exports = function handler(req, res) {
  if (req.method === "POST") {
    const result = applyDecision(req.body || {});
    res.status(result.status).json(result.body);
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
