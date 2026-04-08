const {
  getRememberedAccounts,
  login,
  loadViewer,
  logout,
  resendVerification,
  rememberAccount,
  sendVerificationForUser,
  sessionPayload,
  setSessionCookie,
  signUp,
  updateAccount,
  verifyEmailToken,
} = require("../lib/auth");
const { getRequestOrigin } = require("../lib/http");

module.exports = async function handler(req, res) {
  req.viewer = req.viewer || loadViewer(req);

  if (req.method === "GET") {
    res.status(200).json(sessionPayload(req));
    return;
  }

  if (req.method === "POST") {
    if (req.body?.action === "signup") {
      const result = signUp(req.body || {});
      if (
        result.body.user
        && (
          req.body?.role !== "lawyer"
          || req.body?.lawyerRegistration?.registrationStage === "initial"
        )
      ) {
        rememberAccount(res, req, req.body?.email);
        const loginResult = login(req.body || {}, {
          rememberedAccounts: getRememberedAccounts(req),
        });
        if (loginResult.body.token) {
          setSessionCookie(res, loginResult.body.token);
          rememberAccount(res, req, loginResult.body.user?.email || req.body?.email);
          result.body.user = loginResult.body.user;
        }
      }
      if (result.body.user) {
        try {
          const delivery = await sendVerificationForUser(result.body.user, getRequestOrigin(req));
          result.body.verificationMessage = delivery.sent
            ? "We sent a verification email to confirm the account."
            : "The verification link was prepared. Email delivery will start once the mail provider is configured.";
        } catch (_error) {
          result.body.verificationMessage = "The account was created, but the verification email could not be sent right now.";
        }
      }
      delete result.body.token;
      res.status(result.status).json(result.body);
      return;
    }

    if (req.body?.action === "login") {
      const result = login(req.body || {}, {
        rememberedAccounts: getRememberedAccounts(req),
      });
      if (result.body.token) {
        setSessionCookie(res, result.body.token);
        rememberAccount(res, req, result.body.user?.email);
        delete result.body.token;
      }
      res.status(result.status).json(result.body);
      return;
    }

    if (req.body?.action === "verify-email") {
      const result = verifyEmailToken(req.body?.token);
      if (result.body?.user) {
        rememberAccount(res, req, result.body.user.email);
      }
      res.status(result.status).json(result.body);
      return;
    }

    if (req.body?.action === "resend-verification") {
      if (!req.viewer) {
        res.status(401).json({ error: "Please sign in to continue." });
        return;
      }
      const result = await resendVerification(req.viewer, getRequestOrigin(req));
      if (result.body?.user) {
        rememberAccount(res, req, result.body.user.email);
      }
      res.status(result.status).json(result.body);
      return;
    }

    if (req.body?.action === "update-account") {
      if (!req.viewer) {
        res.status(401).json({ error: "Please sign in to continue." });
        return;
      }
      const result = updateAccount(req.viewer, req.body || {});
      if (result.body?.user) {
        rememberAccount(res, req, result.body.user.email);
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
