const crypto = require("node:crypto");

const { get, getUserByEmail, getUserRowById, getHydratedUserById, run } = require("./db");
const { createId, createOpaqueToken, hashPassword, sha256, verifyPassword } = require("./security");

const SESSION_COOKIE = "kamieno_session";
const REMEMBERED_ACCOUNTS_COOKIE = "kamieno_accounts";
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

function appendSetCookie(res, cookie) {
  const current = res.getHeader("Set-Cookie");
  if (!current) {
    res.setHeader("Set-Cookie", cookie);
    return;
  }
  const next = Array.isArray(current) ? [...current, cookie] : [current, cookie];
  res.setHeader("Set-Cookie", next);
}

function shouldUseSecureCookies() {
  return process.env.KAMIENO_SECURE_COOKIE === "true" || Boolean(process.env.VERCEL);
}

function setSessionCookie(res, token) {
  appendSetCookie(res, serializeCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    secure: shouldUseSecureCookies(),
  }));
}

function clearSessionCookie(res) {
  appendSetCookie(res, serializeCookie(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
    secure: shouldUseSecureCookies(),
  }));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      word
        .toLowerCase()
        .replace(/(^|[-'])\p{L}/gu, (match) => match.toUpperCase()),
    )
    .join(" ");
}

function cookieSigningSecret() {
  return process.env.KAMIENO_COOKIE_SECRET || process.env.KAMIENO_ADMIN_PASSWORD || "kamieno-local-cookie-secret";
}

function signCookiePayload(payload) {
  return crypto.createHmac("sha256", cookieSigningSecret()).update(payload).digest("base64url");
}

function sanitizeRememberedAccount(record) {
  if (!record || typeof record !== "object") {
    return null;
  }
  const email = normalizeEmail(record.email);
  if (!email || !record.passwordHash || !record.name || !record.role) {
    return null;
  }
  return {
    id: String(record.id || createId("user")),
    role: String(record.role),
    name: normalizeName(record.name),
    email,
    passwordHash: String(record.passwordHash),
    firm: String(record.firm || ""),
    status: String(record.status || (record.role === "lawyer" ? "pending" : "active")),
    createdAt: String(record.createdAt || new Date().toISOString()),
  };
}

function encodeRememberedAccounts(accounts) {
  const sanitized = accounts.map(sanitizeRememberedAccount).filter(Boolean).slice(0, 12);
  const payload = Buffer.from(JSON.stringify(sanitized)).toString("base64url");
  const signature = signCookiePayload(payload);
  return `${payload}.${signature}`;
}

function decodeRememberedAccounts(value) {
  const [payload, signature] = String(value || "").split(".");
  if (!payload || !signature || signCookiePayload(payload) !== signature) {
    return [];
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Array.isArray(parsed) ? parsed.map(sanitizeRememberedAccount).filter(Boolean) : [];
  } catch (_error) {
    return [];
  }
}

function getRememberedAccounts(req) {
  const cookies = parseCookies(req?.headers?.cookie);
  return decodeRememberedAccounts(cookies[REMEMBERED_ACCOUNTS_COOKIE]);
}

function clearRememberedAccountsCookie(res) {
  appendSetCookie(res, serializeCookie(REMEMBERED_ACCOUNTS_COOKIE, "", {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
    secure: shouldUseSecureCookies(),
  }));
}

function rememberAccount(res, req, email) {
  const user = getUserByEmail(normalizeEmail(email));
  if (!user) {
    return;
  }
  const existing = getRememberedAccounts(req).filter((entry) => entry.email !== user.email);
  const next = [
    {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      passwordHash: user.password_hash,
      firm: user.firm || "",
      status: user.status,
      createdAt: user.created_at,
    },
    ...existing,
  ];
  appendSetCookie(res, serializeCookie(REMEMBERED_ACCOUNTS_COOKIE, encodeRememberedAccounts(next), {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    secure: shouldUseSecureCookies(),
  }));
}

function restoreRememberedAccountRecord(remembered) {
  if (!remembered) {
    return null;
  }

  const existing = getUserByEmail(remembered.email);
  if (existing) {
    return existing;
  }

  try {
    run(
      "INSERT INTO users (id, role, name, email, password_hash, firm, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        remembered.id,
        remembered.role,
        remembered.name,
        remembered.email,
        remembered.passwordHash,
        remembered.firm,
        remembered.status,
        remembered.createdAt,
      ],
    );
  } catch (_error) {
    return getUserByEmail(remembered.email);
  }

  return getUserByEmail(remembered.email);
}

function restoreRememberedAccount(email, password, rememberedAccounts = []) {
  const remembered = rememberedAccounts.find((entry) => entry.email === email);
  if (!remembered || !verifyPassword(password, remembered.passwordHash)) {
    return null;
  }

  return restoreRememberedAccountRecord(remembered);
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
    const remembered = getRememberedAccounts(req)[0];
    if (!remembered) {
      return null;
    }
    const restored = restoreRememberedAccountRecord(remembered);
    return restored ? getHydratedUserById(restored.id) : null;
  }

  const session = get(
    `SELECT s.user_id
     FROM sessions s
     WHERE s.token_hash = ? AND s.expires_at > ?`,
    [sha256(token), new Date().toISOString()],
  );

  if (!session) {
    const remembered = getRememberedAccounts(req)[0];
    if (!remembered) {
      return null;
    }
    const restored = restoreRememberedAccountRecord(remembered);
    return restored ? getHydratedUserById(restored.id) : null;
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
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name);
  if (!["client", "lawyer"].includes(normalizedRole)) {
    return { status: 422, body: { error: "Role must be client or lawyer." } };
  }
  if (!normalizedName || !normalizedEmail || !password) {
    return { status: 422, body: { error: "Name, email, and password are required." } };
  }
  if (String(password).length < 10) {
    return { status: 422, body: { error: "Password must be at least 10 characters." } };
  }
  if (getUserByEmail(normalizedEmail)) {
    return { status: 409, body: { error: "An account with that email already exists." } };
  }

  const userId = createId("user");
  run(
    "INSERT INTO users (id, role, name, email, password_hash, firm, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      userId,
      normalizedRole,
      normalizedName,
      normalizedEmail,
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

function login({ email, password }, options = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    return { status: 422, body: { error: "Email and password are required." } };
  }
  let user = getUserByEmail(normalizedEmail);
  if (!user) {
    user = restoreRememberedAccount(normalizedEmail, password, options.rememberedAccounts || []);
  }
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
  clearRememberedAccountsCookie(res);
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
  clearRememberedAccountsCookie,
  getRememberedAccounts,
  loadViewer,
  login,
  logout,
  normalizeEmail,
  requireRole,
  rememberAccount,
  sessionPayload,
  setSessionCookie,
  signUp,
};
