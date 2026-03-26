const { loadViewer } = require("../lib/auth");
const { getBootstrap } = require("../lib/platform");

module.exports = function handler(req, res) {
  req.viewer = req.viewer || loadViewer(req);
  res.status(200).json(getBootstrap(req.viewer));
};
