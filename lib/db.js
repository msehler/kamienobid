const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const { COUNTRIES, buildTemplate } = require("./app-data");
const { createId, hashPassword } = require("./security");

const DB_PATH = process.env.KAMIENO_DB_PATH
  || (process.env.VERCEL
    ? path.join("/tmp", "kamienobid.sqlite")
    : path.join(process.cwd(), "data", "kamienobid.sqlite"));

const directory = path.dirname(DB_PATH);
if (!fs.existsSync(directory)) {
  fs.mkdirSync(directory, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS settings_countries (
    country_code TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    firm TEXT,
    lawyer_role TEXT,
    firm_address TEXT,
    firm_phone TEXT,
    firm_contact_name TEXT,
    identity_documents_json TEXT,
    practising_certificate_json TEXT,
    regulator_consent INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_jurisdictions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL,
    region TEXT NOT NULL,
    certificate_ref TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    client_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    case_name TEXT,
    country_code TEXT NOT NULL,
    region TEXT NOT NULL,
    practice_area_id TEXT NOT NULL,
    quote_mode TEXT NOT NULL,
    summary TEXT NOT NULL,
    budget TEXT,
    documents_json TEXT NOT NULL,
    custom_answers_json TEXT NOT NULL,
    fee_amount REAL NOT NULL,
    status TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    payment_reference TEXT,
    payment_session_id TEXT,
    accepted_bid_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    lawyer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    private_bid INTEGER NOT NULL DEFAULT 1,
    fee_type TEXT,
    total_fee TEXT,
    disbursements TEXT,
    sections_json TEXT NOT NULL,
    compliance_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shortlists (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    bid_id TEXT NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE(case_id, bid_id)
  );
`);

try {
  db.exec("ALTER TABLE cases ADD COLUMN case_name TEXT");
} catch (_error) {
  // Column already exists in existing databases.
}

try {
  db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
} catch (_error) {
  // Column already exists in existing databases.
}

try {
  db.exec("ALTER TABLE users ADD COLUMN address TEXT");
} catch (_error) {
  // Column already exists in existing databases.
}

try {
  db.exec("ALTER TABLE users ADD COLUMN lawyer_role TEXT");
} catch (_error) {
  // Column already exists in existing databases.
}

try {
  db.exec("ALTER TABLE users ADD COLUMN firm_address TEXT");
} catch (_error) {
  // Column already exists in existing databases.
}

try {
  db.exec("ALTER TABLE users ADD COLUMN firm_phone TEXT");
} catch (_error) {
  // Column already exists in existing databases.
}

try {
  db.exec("ALTER TABLE users ADD COLUMN firm_contact_name TEXT");
} catch (_error) {
  // Column already exists in existing databases.
}

try {
  db.exec("ALTER TABLE users ADD COLUMN identity_documents_json TEXT");
} catch (_error) {
  // Column already exists in existing databases.
}

try {
  db.exec("ALTER TABLE users ADD COLUMN practising_certificate_json TEXT");
} catch (_error) {
  // Column already exists in existing databases.
}

try {
  db.exec("ALTER TABLE users ADD COLUMN regulator_consent INTEGER NOT NULL DEFAULT 0");
} catch (_error) {
  // Column already exists in existing databases.
}

function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

function seedSettings() {
  const countRow = get("SELECT COUNT(*) AS count FROM settings_countries");
  if (countRow.count > 0) {
    return;
  }

  const statement = db.prepare("INSERT INTO settings_countries (country_code, enabled) VALUES (?, ?)");
  for (const country of COUNTRIES) {
    statement.run(country.code, country.enabled ? 1 : 0);
  }
}

function seedUsersAndData() {
  const userCount = get("SELECT COUNT(*) AS count FROM users");
  if (userCount.count > 0) {
    return;
  }

  const now = new Date().toISOString();
  const adminPassword = process.env.KAMIENO_ADMIN_PASSWORD || (!process.env.VERCEL ? "ChangeMeAdmin!2026" : null);
  const adminEmail = process.env.KAMIENO_ADMIN_EMAIL || "admin@kamieno.local";

  const users = [
    adminPassword
      ? {
          id: "user-admin-seed",
          role: "admin",
        name: "Kamieno Admin",
        email: adminEmail,
        passwordHash: hashPassword(adminPassword),
      phone: "",
      address: "",
      firm: "Kamieno",
      lawyerRole: "",
      firmAddress: "",
      firmPhone: "",
      firmContactName: "",
      identityDocumentsJson: "[]",
      practisingCertificateJson: "null",
      regulatorConsent: 0,
      status: "verified",
      }
      : null,
    {
      id: "user-client-seed",
      role: "client",
      name: "Olivia Brooks",
      email: "olivia@example.com",
      passwordHash: hashPassword("ClientSeed!2026"),
      phone: "+61 412 555 210",
      address: "18 Collins Street\nMelbourne VIC 3000",
      firm: "",
      lawyerRole: "",
      firmAddress: "",
      firmPhone: "",
      firmContactName: "",
      identityDocumentsJson: "[]",
      practisingCertificateJson: "null",
      regulatorConsent: 0,
      status: "active",
    },
    {
      id: "user-lawyer-seed-au",
      role: "lawyer",
      name: "Amelia Reid",
      email: "amelia@reidfamily.au",
      passwordHash: hashPassword("LawyerSeed!2026"),
      phone: "+61 2 9012 4400",
      address: "Level 12, 80 William Street\nSydney NSW 2000",
      firm: "Reid Family Advisory",
      lawyerRole: "Principal Lawyer",
      firmAddress: "Level 12, 80 William Street\nSydney NSW 2000",
      firmPhone: "+61 2 9012 4400",
      firmContactName: "Amelia Reid",
      identityDocumentsJson: "[]",
      practisingCertificateJson: "null",
      regulatorConsent: 1,
      status: "verified",
    },
    {
      id: "user-lawyer-seed-uk",
      role: "lawyer",
      name: "Harriet Singh",
      email: "harriet@tribunalnorth.co.uk",
      passwordHash: hashPassword("LawyerSeed!2026"),
      phone: "+44 20 7946 0880",
      address: "14 Chancery Lane\nLondon WC2A 1LG",
      firm: "Tribunal North",
      lawyerRole: "Partner",
      firmAddress: "14 Chancery Lane\nLondon WC2A 1LG",
      firmPhone: "+44 20 7946 0880",
      firmContactName: "Harriet Singh",
      identityDocumentsJson: "[]",
      practisingCertificateJson: "null",
      regulatorConsent: 1,
      status: "pending",
    },
  ].filter(Boolean);

  const insertUser = db.prepare(`
    INSERT INTO users (
      id, role, name, email, password_hash, phone, address, firm, lawyer_role,
      firm_address, firm_phone, firm_contact_name, identity_documents_json,
      practising_certificate_json, regulator_consent, status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const user of users) {
    insertUser.run(
      user.id,
      user.role,
      user.name,
      user.email,
      user.passwordHash,
      user.phone || "",
      user.address || "",
      user.firm,
      user.lawyerRole || "",
      user.firmAddress || "",
      user.firmPhone || "",
      user.firmContactName || "",
      user.identityDocumentsJson || "[]",
      user.practisingCertificateJson || "null",
      user.regulatorConsent || 0,
      user.status,
      now,
    );
  }

  const insertJurisdiction = db.prepare(`
    INSERT INTO user_jurisdictions (id, user_id, country_code, region, certificate_ref, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  [
    ["user-lawyer-seed-au", "AU", "VIC", "AU-VIC-44891"],
    ["user-lawyer-seed-au", "AU", "NSW", "AU-NSW-22170"],
    ["user-lawyer-seed-uk", "UK", "England & Wales", "SRA-601443"],
  ].forEach(([userId, countryCode, region, certificateRef]) => {
    insertJurisdiction.run(createId("jur"), userId, countryCode, region, certificateRef, now);
  });

  const insertCase = db.prepare(`
    INSERT INTO cases (
      id, client_user_id, client_name, case_name, country_code, region, practice_area_id, quote_mode,
      summary, budget, documents_json, custom_answers_json, fee_amount, status, payment_status,
      payment_reference, payment_session_id, accepted_bid_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCase.run(
    "case-1001",
    "user-client-seed",
    "Olivia Brooks",
    "Olivia Brooks -v- Daniel Brooks",
    "AU",
    "VIC",
    "family-divorce",
    "Advise and represent the family matter through to completion",
    "Seeking post-separation advice about parenting arrangements and asset division.",
    "A$5,000 to A$10,000",
    JSON.stringify(["Minutes of consent", "Mortgage statement"]),
    JSON.stringify({
      "Date of separation": "2025-11-03",
      "Children's names and ages": "Two children, 8 and 11",
      "Property pool value": "Approx AUD 1.4m",
    }),
    29.99,
    "open",
    "paid_seed",
    "seed-payment-au",
    null,
    null,
    "2026-03-14T05:45:00.000Z",
  );

  insertCase.run(
    "case-1002",
    "user-client-seed",
    "Olivia Brooks",
    "Olivia Brooks -v- Northern Engineering Ltd",
    "UK",
    "England & Wales",
    "employment",
    "Single task only: letter, response, settlement review, or contract review",
    "Dismissed after raising concerns and needs help with ACAS and tribunal timing.",
    "£5,000 to £10,000",
    JSON.stringify(["Contract", "Dismissal letter"]),
    JSON.stringify({
      "Date of dismissal": "2026-02-28",
      "ACAS early conciliation reference": "Pending",
      "Employment Tribunal deadline": "Unsure",
    }),
    22.99,
    "open",
    "paid_seed",
    "seed-payment-uk",
    null,
    null,
    "2026-03-14T07:10:00.000Z",
  );

  const compliance = { safe: true, flags: [] };
  const insertBid = db.prepare(`
    INSERT INTO bids (
      id, case_id, lawyer_user_id, private_bid, fee_type, total_fee,
      disbursements, sections_json, compliance_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBid.run(
    "bid-9001",
    "case-1001",
    "user-lawyer-seed-au",
    1,
    "Stage-based fixed fee estimate",
    "AUD 4,800 - 7,200",
    "Court filing, barrister, and valuation costs billed separately",
    JSON.stringify({
      stageOne:
        "Stage 1 would cover urgent review of parenting and property issues, the first strategy conference, and a written action plan with likely negotiation ranges.",
      stageTwo:
        "Stage 2 would cover disclosure management, drafting proposals, and negotiation work across the first settlement window, including one round of revised advice if the other side pushes back.",
      stageThree:
        "Stage 3 would only be needed if the matter moves closer to hearing or contested interim work, and would cover court-ready preparation, barrister briefing, and hearing attendance planning.",
      assumptions:
        "This estimate assumes cooperative disclosure, no urgent recovery applications, and a matter size consistent with the information currently provided by the client.",
      priceFactors:
        "The estimate could increase if there are contested parenting allegations, hidden assets, multiple valuations, or a need for urgent interim applications or barrister-heavy work.",
    }),
    JSON.stringify(compliance),
    "2026-03-14T08:00:00.000Z",
  );

  run(
    "INSERT INTO shortlists (id, case_id, bid_id, created_at) VALUES (?, ?, ?, ?)",
    [createId("short"), "case-1001", "bid-9001", "2026-03-14T08:05:00.000Z"],
  );
}

function applyCountryBackfills() {
  const currentCodes = new Set(all("SELECT country_code FROM settings_countries").map((row) => row.country_code));
  for (const country of COUNTRIES) {
    if (!currentCodes.has(country.code)) {
      run("INSERT INTO settings_countries (country_code, enabled) VALUES (?, ?)", [country.code, 1]);
    }
  }
}

function cleanupExpiredSessions() {
  run("DELETE FROM sessions WHERE expires_at <= ?", [new Date().toISOString()]);
}

seedSettings();
applyCountryBackfills();
seedUsersAndData();
cleanupExpiredSessions();

function parseJsonColumn(value, fallback) {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function normalizeCaseDocumentDate(value) {
  const normalized = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function estimateDocumentBytesFromDataUrl(value) {
  const match = String(value || "").match(/^data:[^;]+;base64,(.+)$/);
  if (!match) {
    return 0;
  }
  const base64 = match[1];
  const padding = (base64.match(/=*$/) || [""])[0].length;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function normalizeCaseDocuments(value, options = {}) {
  const strict = Boolean(options.strict);
  const source = Array.isArray(value) ? value : [];
  const normalized = [];
  let totalBytes = 0;

  if (strict && source.length > 10) {
    throw new Error("You can attach up to 10 documents per case.");
  }

  source.slice(0, 10).forEach((entry) => {
    let documentEntry = null;

    if (typeof entry === "string") {
      const name = entry.trim();
      if (name) {
        documentEntry = {
          id: createId("doc"),
          name,
          title: name.replace(/\.[^.]+$/, ""),
          documentDate: "",
          mimeType: "",
          size: 0,
          dataUrl: "",
        };
      }
    } else if (entry && typeof entry === "object") {
      const name = String(entry.name || entry.fileName || "").trim();
      if (name) {
        const dataUrl = typeof entry.dataUrl === "string" && /^data:[^;]+;base64,[A-Za-z0-9+/=]+$/.test(entry.dataUrl)
          ? entry.dataUrl
          : "";
        documentEntry = {
          id: String(entry.id || createId("doc")).trim() || createId("doc"),
          name,
          title: String(entry.title || name.replace(/\.[^.]+$/, "")).trim().slice(0, 120),
          documentDate: normalizeCaseDocumentDate(entry.documentDate),
          mimeType: String(entry.mimeType || entry.type || "").trim().slice(0, 120),
          size: Number.isFinite(Number(entry.size)) ? Math.max(0, Number(entry.size)) : estimateDocumentBytesFromDataUrl(dataUrl),
          dataUrl,
        };
      }
    }

    if (!documentEntry) {
      return;
    }

    if (strict && documentEntry.size > 2 * 1024 * 1024) {
      throw new Error(`${documentEntry.name} is too large. Keep each file under 2 MB.`);
    }

    totalBytes += documentEntry.size;
    normalized.push(documentEntry);
  });

  if (strict && totalBytes > 3 * 1024 * 1024) {
    throw new Error("Uploaded documents are too large together. Keep the total under 3 MB.");
  }

  return normalized;
}

function defaultScopeOfWork(practiceAreaId) {
  const id = String(practiceAreaId || "");
  if (["family-divorce", "child-custody"].includes(id)) {
    return "Review and advise on the family matter";
  }
  if (["employment"].includes(id)) {
    return "Review and advise on the workplace issue";
  }
  if (["criminal-defence", "traffic"].includes(id)) {
    return "Review and advise on the allegation or charge";
  }
  if (["personal-injury", "medical-negligence"].includes(id)) {
    return "Review and advise on the claim prospects";
  }
  if (["property"].includes(id)) {
    return "Review and advise on the property matter";
  }
  if (["commercial", "contract-disputes", "ip", "consumer", "debt-insolvency", "construction", "environmental", "administrative"].includes(id)) {
    return "Review and advise on the business or dispute matter";
  }
  if (["wills-probate", "estate-litigation", "elder-law", "retirement"].includes(id)) {
    return "Review and advise on the wills, estate, or elder law matter";
  }
  if (["immigration"].includes(id)) {
    return "Review and advise on options and prospects";
  }
  if (["tax"].includes(id)) {
    return "Review and advise on the tax issue";
  }
  return "Review and advise on the matter";
}

function normalizeScopeOfWork(value, practiceAreaId) {
  const normalized = String(value || "").trim();
  if (!normalized || ["Detailed", "Broad", "Structured estimate"].includes(normalized)) {
    return defaultScopeOfWork(practiceAreaId);
  }
  return normalized;
}

function getJurisdictionsByUserIds(userIds) {
  if (!userIds.length) {
    return new Map();
  }
  const placeholders = userIds.map(() => "?").join(", ");
  const rows = all(
    `SELECT user_id, country_code, region, certificate_ref FROM user_jurisdictions WHERE user_id IN (${placeholders}) ORDER BY created_at ASC`,
    userIds,
  );
  const grouped = new Map();
  for (const row of rows) {
    const existing = grouped.get(row.user_id) || [];
    existing.push(row);
    grouped.set(row.user_id, existing);
  }
  return grouped;
}

function hydrateUsers(rows) {
  const grouped = getJurisdictionsByUserIds(rows.map((row) => row.id));
  return rows.map((row) => {
    const jurisdictions = grouped.get(row.id) || [];
    return {
      id: row.id,
      role: row.role,
      name: row.name,
      email: row.email,
      phone: row.phone || "",
      address: row.address || "",
      firm: row.firm || "",
      lawyerRole: row.lawyer_role || "",
      firmAddress: row.firm_address || "",
      firmPhone: row.firm_phone || "",
      firmContactName: row.firm_contact_name || "",
      hasIdentityDocuments: parseJsonColumn(row.identity_documents_json, []).length > 0,
      hasPractisingCertificate: Boolean(parseJsonColumn(row.practising_certificate_json, null)),
      regulatorConsent: Boolean(row.regulator_consent),
      status: row.status,
      createdAt: row.created_at,
      jurisdictions: jurisdictions.map((entry) => `${entry.country_code}:${entry.region}`),
      certificateRefs: jurisdictions.map((entry) => entry.certificate_ref).filter(Boolean),
      jurisdictionRecords: jurisdictions.map((entry) => ({
        countryCode: entry.country_code,
        region: entry.region,
        certificateRef: entry.certificate_ref || "",
      })),
    };
  });
}

function getUserByEmail(email) {
  return get("SELECT * FROM users WHERE lower(email) = lower(?)", [email]);
}

function getUserRowById(id) {
  return get("SELECT * FROM users WHERE id = ?", [id]);
}

function getHydratedUserById(id) {
  const row = getUserRowById(id);
  if (!row) {
    return null;
  }
  return hydrateUsers([row])[0];
}

function listHydratedUsersByRole(role) {
  return hydrateUsers(all("SELECT * FROM users WHERE role = ? ORDER BY created_at DESC", [role]));
}

function listEnabledCountrySettings() {
  return all("SELECT country_code, enabled FROM settings_countries ORDER BY country_code ASC");
}

function listCasesRows() {
  return all("SELECT * FROM cases ORDER BY datetime(created_at) DESC");
}

function listBidRows() {
  return all("SELECT * FROM bids ORDER BY datetime(created_at) DESC");
}

function listShortlistsRows() {
  return all("SELECT * FROM shortlists ORDER BY datetime(created_at) ASC");
}

function getCaseRowById(id) {
  return get("SELECT * FROM cases WHERE id = ?", [id]);
}

function getBidRowById(id) {
  return get("SELECT * FROM bids WHERE id = ?", [id]);
}

function hydrateCaseRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    clientUserId: row.client_user_id,
    clientName: row.client_name,
    caseName: row.case_name || "",
    countryCode: row.country_code,
    region: row.region,
    practiceAreaId: row.practice_area_id,
    scopeOfWork: normalizeScopeOfWork(row.quote_mode, row.practice_area_id),
    summary: row.summary,
    budget: row.budget || "",
    documents: normalizeCaseDocuments(parseJsonColumn(row.documents_json, [])),
    customAnswers: parseJsonColumn(row.custom_answers_json, {}),
    feeAmount: row.fee_amount,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentReference: row.payment_reference,
    paymentSessionId: row.payment_session_id,
    acceptedBidId: row.accepted_bid_id,
    createdAt: row.created_at,
  };
}

function hydrateBidRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    caseId: row.case_id,
    lawyerId: row.lawyer_user_id,
    privateBid: Boolean(row.private_bid),
    feeType: row.fee_type || "",
    totalFee: row.total_fee || "",
    disbursements: row.disbursements || "",
    sections: parseJsonColumn(row.sections_json, {}),
    compliance: parseJsonColumn(row.compliance_json, { safe: true, flags: [] }),
    createdAt: row.created_at,
  };
}

function seedTemplateForCase(countryCode, practiceAreaId) {
  return buildTemplate(countryCode, practiceAreaId);
}

module.exports = {
  DB_PATH,
  all,
  db,
  get,
  getBidRowById,
  getCaseRowById,
  getHydratedUserById,
  getUserByEmail,
  getUserRowById,
  hydrateBidRow,
  hydrateCaseRow,
  hydrateUsers,
  listBidRows,
  listCasesRows,
  listEnabledCountrySettings,
  listHydratedUsersByRole,
  listShortlistsRows,
  normalizeCaseDocuments,
  normalizeScopeOfWork,
  parseJsonColumn,
  run,
  seedTemplateForCase,
};
