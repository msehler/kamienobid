const { getBootstrap } = require("../lib/platform");

module.exports = function handler(req, res) {
  res.status(200).json(getBootstrap(req.viewer));
};
