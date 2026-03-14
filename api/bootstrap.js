const { getBootstrap } = require("../lib/platform");

module.exports = function handler(_req, res) {
  res.status(200).json(getBootstrap());
};
