const { get, getUserByEmail, getUserRowById, getHydratedUserById, run } = require("./db");
const { createId, createOpaqueToken, hashPassword, sha256, verifyPassword } = require("./security");

const SESSION_COOKIE = "kamieno_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function parseCookies(cookieHeader) {
  return String(cookieHeader || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((accumulator, pair) => {
      const [key, ...rest] = pair.split("=");
      accumulator[key] = decodeURIComponent(rest.join("="));
      return accumulator;
    }, {});
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.httpOnly !== false) {
    parts.push("HttpOnly");
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }
  if (options.path) {
    parts.push(`Path=${options.path}`);
  }
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function shouldUseSecureCookies() {
  return process.env.KAMIENO_SECURE_COOKIE === "true" || Boolean(process.env.VERCEL);
}

function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", serializeCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    secure: shouldUseSecureCookies(),
  }));
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", serializeCookie(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
    secure: shouldUseSecureCookies(),
  }));
}

function createSessionForUserId(userId) {
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  run(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    [createId("sess"), userId, sha256(token), expiresAt, new Date().toISOString()],
  );
  return token;
}

function loadViewer(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  if (!token) {
    return null;
  }

  const session = get(
    `SELECT s.user_id
     FROM sessions s
     WHERE s.token_hash = ? AND s.expires_at > ?`,
    [sha256(token), new Date().toISOString()],
  );

  if (!session) {
    return null;
  }

  return getHydratedUserById(session.user_id);
}

function requireRole(req, res, roles) {
  if (!req.viewer) {
    res.status(401).json({ error: "Please sign in to continue." });
    return false;
  }
  if (!roles.includes(req.viewer.role)) {
    res.status(403).json({ error: "Your account does not have access to this action." });
    return false;
  }
  return true;
}

function signUp({ name, email, password, role }) {
  const normalizedRole = String(role || "").toLowerCase();
  if (!["client", "lawyer"].includes(normalizedRole)) {
    return { status: 422, body: { error: "Role must be client or lawyer." } };
  }
  if (!name || !email || !password) {
    return { status: 422, body: { error: "Name, email, and password are required." } };
  }
  if (String(password).length < 10) {
    return { status: 422, body: { error: "Password must be at least 10 characters." } };
  }
  if (getUserByEmail(email)) {
    return { status: 409, body: { error: "An account with that email already exists." } };
  }

  const userId = createId("user");
  run(
    "INSERT INTO users (id, role, name, email, password_hash, firm, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      userId,
      normalizedRole,
      name,
      email,
      hashPassword(password),
      "",
      normalizedRole === "lawyer" ? "pending" : "active",
      new Date().toISOString(),
    ],
  );

  return {
    status: 201,
    body: {
      message: "Account created",
      user: getHydratedUserById(userId),
    },
  };
}

function login({ email, password }) {
  if (!email || !password) {
    return { status: 422, body: { error: "Email and password are required." } };
  }
  const user = getUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { status: 401, body: { error: "Incorrect email or password." } };
  }

  const token = createSessionForUserId(user.id);
  return {
    status: 200,
    body: {
      message: "Signed in",
      user: getHydratedUserById(user.id),
      token,
    },
  };
}

function logout(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  if (token) {
    run("DELETE FROM sessions WHERE token_hash = ?", [sha256(token)]);
  }
  clearSessionCookie(res);
  return { status: 200, body: { message: "Signed out" } };
}

function sessionPayload(req) {
  return {
    authenticated: Boolean(req.viewer),
    user: req.viewer,
  };
}

module.exports = {
  clearSessionCookie,
  loadViewer,
  login,
  logout,
  requireRole,
  sessionPayload,
  setSessionCookie,
  signUp,
};
