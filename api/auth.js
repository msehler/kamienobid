const {
  getRememberedAccounts,
  login,
  logout,
  rememberAccount,
  sessionPayload,
  setSessionCookie,
  signUp,
} = require("../lib/auth");

module.exports = function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json(sessionPayload(req));
    return;
  }

  if (req.method === "POST") {
    if (req.body?.action === "signup") {
      const result = signUp(req.body || {});
      if (result.body.user) {
        rememberAccount(res, req, req.body?.email);
        const loginResult = login(req.body || {}, {
          rememberedAccounts: getRememberedAccounts(req),
        });
        if (loginResult.body.token) {
          setSessionCookie(res, loginResult.body.token);
          rememberAccount(res, req, req.body?.email);
          delete loginResult.body.token;
          res.status(201).json({ ...result.body, user: loginResult.body.user });
          return;
        }
      }
      res.status(result.status).json(result.body);
      return;
    }

    if (req.body?.action === "login") {
      const result = login(req.body || {}, {
        rememberedAccounts: getRememberedAccounts(req),
      });
      if (result.body.token) {
        setSessionCookie(res, result.body.token);
        rememberAccount(res, req, req.body?.email);
        delete result.body.token;
      }
      res.status(result.status).json(result.body);
      return;
    }

    if (req.body?.action === "logout") {
      const result = logout(req, res);
      res.status(result.status).json(result.body);
      return;
    }
  }

  res.status(405).json({ error: "Method not allowed" });
};
