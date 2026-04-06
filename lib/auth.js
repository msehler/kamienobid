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

function getAdminUser() {
  return get("SELECT * FROM users WHERE role = 'admin' ORDER BY datetime(created_at) ASC LIMIT 1");
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

function normalizePhone(phone) {
  return String(phone || "").trim().replace(/\s+/g, " ").slice(0, 40);
}

function normalizeAddress(address) {
  return String(address || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 500);
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
    phone: normalizePhone(record.phone),
    address: normalizeAddress(record.address),
    firm: String(record.firm || ""),
    lawyerRole: String(record.lawyerRole || ""),
    firmAddress: normalizeAddress(record.firmAddress),
    firmPhone: normalizePhone(record.firmPhone),
    firmContactName: normalizeName(record.firmContactName),
    regulatorConsent: Boolean(record.regulatorConsent),
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
  const existing = getRememberedAccounts(req).filter((entry) => entry.id !== user.id && entry.email !== user.email);
  const next = [
    {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      passwordHash: user.password_hash,
      phone: user.phone || "",
      address: user.address || "",
      firm: user.firm || "",
      lawyerRole: user.lawyer_role || "",
      firmAddress: user.firm_address || "",
      firmPhone: user.firm_phone || "",
      firmContactName: user.firm_contact_name || "",
      regulatorConsent: Boolean(user.regulator_consent),
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
      `INSERT INTO users (
        id, role, name, email, password_hash, phone, address, firm, lawyer_role,
        firm_address, firm_phone, firm_contact_name, regulator_consent, status, created_at
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        remembered.id,
        remembered.role,
        remembered.name,
        remembered.email,
        remembered.passwordHash,
        remembered.phone || "",
        remembered.address || "",
        remembered.firm,
        remembered.lawyerRole || "",
        remembered.firmAddress || "",
        remembered.firmPhone || "",
        remembered.firmContactName || "",
        remembered.regulatorConsent ? 1 : 0,
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

function signUp(payload = {}) {
  const { name, email, password, role, lawyerRegistration: registration = {} } = payload;
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

  const allowedLawyerRoles = ["Employee", "Principal Lawyer", "Partner"];
  const normalizedLawyerRole = String(registration.lawyerRole || "").trim();
  const normalizedFirmName = String(registration.firmName || "").trim().replace(/\s+/g, " ").slice(0, 160);
  const normalizedFirmAddress = normalizeAddress(registration.firmAddress || "");
  const normalizedFirmPhone = normalizePhone(registration.firmPhone || "");
  const normalizedFirmContactName = normalizeName(registration.firmContactName || "");
  const identityDocuments = Array.isArray(registration.identityDocuments)
    ? registration.identityDocuments.filter((entry) => entry?.name && entry?.dataUrl)
    : [];
  const practisingCertificate = registration.practisingCertificate?.name && registration.practisingCertificate?.dataUrl
    ? {
        id: String(registration.practisingCertificate.id || createId("doc")),
        name: String(registration.practisingCertificate.name).slice(0, 180),
        mimeType: String(registration.practisingCertificate.mimeType || ""),
        size: Number(registration.practisingCertificate.size || 0),
        dataUrl: String(registration.practisingCertificate.dataUrl || ""),
      }
    : null;
  const regulatorConsent = Boolean(registration.regulatorConsent);

  if (normalizedRole === "lawyer") {
    if (!allowedLawyerRoles.includes(normalizedLawyerRole)) {
      return { status: 422, body: { error: "Select whether you are an employee, principal lawyer, or partner." } };
    }
    if (!normalizedFirmName || !normalizedFirmAddress || !normalizedFirmPhone || !normalizedFirmContactName) {
      return { status: 422, body: { error: "Firm name, address, phone number, and contact name are required." } };
    }
    if (!identityDocuments.length) {
      return { status: 422, body: { error: "Upload 100 points of identification to continue." } };
    }
    if (!practisingCertificate) {
      return { status: 422, body: { error: "Upload a current practising certificate to continue." } };
    }
    if (!regulatorConsent) {
      return { status: 422, body: { error: "Consent is required so Kamieno can confirm your details with the regulator." } };
    }
  }

  const userId = createId("user");
  run(
    `INSERT INTO users (
      id, role, name, email, password_hash, phone, address, firm, lawyer_role,
      firm_address, firm_phone, firm_contact_name, identity_documents_json,
      practising_certificate_json, regulator_consent, status, created_at
    )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      normalizedRole,
      normalizedName,
      normalizedEmail,
      hashPassword(password),
      "",
      "",
      normalizedRole === "lawyer" ? normalizedFirmName : "",
      normalizedRole === "lawyer" ? normalizedLawyerRole : "",
      normalizedRole === "lawyer" ? normalizedFirmAddress : "",
      normalizedRole === "lawyer" ? normalizedFirmPhone : "",
      normalizedRole === "lawyer" ? normalizedFirmContactName : "",
      normalizedRole === "lawyer" ? JSON.stringify(identityDocuments) : "[]",
      normalizedRole === "lawyer" ? JSON.stringify(practisingCertificate) : "null",
      normalizedRole === "lawyer" ? 1 : 0,
      normalizedRole === "lawyer" ? "pending" : "active",
      new Date().toISOString(),
    ],
  );

  return {
    status: 201,
    body: {
      message: normalizedRole === "lawyer"
        ? "Lawyer registration submitted. Sign in after Kamieno reviews your details."
        : "Account created",
      user: getHydratedUserById(userId),
    },
  };
}

function updateAccount(viewer, payload = {}) {
  const existingUser = getUserRowById(viewer?.id);
  if (!existingUser) {
    return { status: 404, body: { error: "Account not found." } };
  }

  const normalizedName = normalizeName(payload.name || existingUser.name);
  const normalizedEmail = normalizeEmail(payload.email || existingUser.email);
  const normalizedPhone = normalizePhone(payload.phone || "");
  const normalizedAddress = normalizeAddress(payload.address || "");

  if (!normalizedName || !normalizedEmail) {
    return { status: 422, body: { error: "Name and email are required." } };
  }

  const existingByEmail = getUserByEmail(normalizedEmail);
  if (existingByEmail && existingByEmail.id !== existingUser.id) {
    return { status: 409, body: { error: "An account with that email already exists." } };
  }

  const currentPassword = String(payload.currentPassword || "");
  const newPassword = String(payload.newPassword || "");
  const confirmPassword = String(payload.confirmPassword || "");
  let nextPasswordHash = existingUser.password_hash;

  if (currentPassword || newPassword || confirmPassword) {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return { status: 422, body: { error: "Enter your current password and confirm the new password." } };
    }
    if (!verifyPassword(currentPassword, existingUser.password_hash)) {
      return { status: 401, body: { error: "Current password is incorrect." } };
    }
    if (newPassword.length < 10) {
      return { status: 422, body: { error: "New password must be at least 10 characters." } };
    }
    if (newPassword !== confirmPassword) {
      return { status: 422, body: { error: "New password and confirmation do not match." } };
    }
    if (verifyPassword(newPassword, existingUser.password_hash)) {
      return { status: 422, body: { error: "Choose a new password that is different from your current one." } };
    }
    nextPasswordHash = hashPassword(newPassword);
  }

  run(
    `UPDATE users
     SET name = ?, email = ?, phone = ?, address = ?, password_hash = ?
     WHERE id = ?`,
    [normalizedName, normalizedEmail, normalizedPhone, normalizedAddress, nextPasswordHash, existingUser.id],
  );

  return {
    status: 200,
    body: {
      message: currentPassword ? "Account details and password updated." : "Account details updated.",
      user: getHydratedUserById(existingUser.id),
    },
  };
}

function login({ email, identifier, password, expectedRole }, options = {}) {
  const normalizedIdentifier = normalizeEmail(identifier || email);
  if (!normalizedIdentifier || !password) {
    return { status: 422, body: { error: "Username or email and password are required." } };
  }
  let user = normalizedIdentifier === "admin" ? getAdminUser() : getUserByEmail(normalizedIdentifier);
  if (!user) {
    user = restoreRememberedAccount(normalizedIdentifier, password, options.rememberedAccounts || []);
  }
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { status: 401, body: { error: "Incorrect username, email, or password." } };
  }
  if (expectedRole && user.role !== expectedRole) {
    return { status: 403, body: { error: "This account does not have access to the admin dashboard." } };
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
  updateAccount,
};
