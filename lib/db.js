const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const { COUNTRIES, buildTemplate } = require("./app-data");
const { createId, hashPassword, verifyPassword } = require("./security");

const TEST_ACCOUNT_PASSWORDS = {
  client: "ClientTest2026!",
  lawyer: "LawyerTest2026!",
};
const TEST_ACCOUNT_EMAIL_PATTERN = /^qa\.(client|lawyer)\.\d{2}@kamieno\.local$/i;
const TEST_ACCOUNT_EMAIL_LIKE = "qa.%@kamieno.local";
const TEST_ACCOUNT_FILE_DATA_URL = "data:application/pdf;base64,QUJD";

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
    email_verified_at TEXT,
    email_verification_required INTEGER NOT NULL DEFAULT 0,
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

  CREATE TABLE IF NOT EXISTS email_verification_tokens (
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
  db.exec("ALTER TABLE users ADD COLUMN email_verified_at TEXT");
} catch (_error) {
  // Column already exists in existing databases.
}

try {
  db.exec("ALTER TABLE users ADD COLUMN email_verification_required INTEGER NOT NULL DEFAULT 0");
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

function isTestAccountEmail(email) {
  return TEST_ACCOUNT_EMAIL_PATTERN.test(String(email || "").trim());
}

function placeholders(count) {
  return Array.from({ length: count }, () => "?").join(", ");
}

function buildTestStoredDocument(name, documentDate = "") {
  return {
    id: createId("doc"),
    name,
    title: String(name || "").replace(/\.[^.]+$/, ""),
    documentDate,
    mimeType: "application/pdf",
    size: 1280,
    dataUrl: TEST_ACCOUNT_FILE_DATA_URL,
  };
}

function buildTestBidSections(label) {
  return {
    stageOne: `Stage 1 covers initial review, a strategy call, and a written plan for the ${label}.`,
    stageTwo: `Stage 2 covers negotiation, correspondence, and document preparation needed to progress the ${label}.`,
    stageThree: `Stage 3 covers tribunal or court-ready preparation if the ${label} needs to move further.`,
    assumptions: `This estimate assumes the current facts provided for the ${label} are substantially complete and there is no urgent interlocutory work beyond what is already disclosed.`,
    priceFactors: `Pricing could move if the ${label} expands in scope, urgent applications are required, or additional evidence and experts become necessary.`,
  };
}

function getCountryFee(countryCode) {
  return COUNTRIES.find((country) => country.code === countryCode)?.clientFee || COUNTRIES[0].clientFee;
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
  const adminPassword = process.env.KAMIENO_ADMIN_PASSWORD || "admin";
  const adminEmail = process.env.KAMIENO_ADMIN_EMAIL || "admin@kamieno.local";

  const users = [
    adminPassword
      ? {
          id: "user-admin-seed",
          role: "admin",
          name: "Kamieno Admin",
          email: adminEmail,
          passwordHash: hashPassword(adminPassword),
          emailVerifiedAt: now,
          emailVerificationRequired: 0,
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
      emailVerifiedAt: now,
      emailVerificationRequired: 0,
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
      emailVerifiedAt: now,
      emailVerificationRequired: 0,
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
      emailVerifiedAt: now,
      emailVerificationRequired: 0,
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
      id, role, name, email, password_hash, email_verified_at, email_verification_required, phone, address, firm, lawyer_role,
      firm_address, firm_phone, firm_contact_name, identity_documents_json,
      practising_certificate_json, regulator_consent, status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const user of users) {
    insertUser.run(
      user.id,
      user.role,
      user.name,
      user.email,
      user.passwordHash,
      user.emailVerifiedAt || null,
      user.emailVerificationRequired || 0,
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

function buildTestAccountDataset() {
  const clientPasswordHash = hashPassword(TEST_ACCOUNT_PASSWORDS.client);
  const lawyerPasswordHash = hashPassword(TEST_ACCOUNT_PASSWORDS.lawyer);

  const users = [
    {
      id: "user-qa-client-01",
      role: "client",
      name: "Anna Mercer",
      email: "qa.client.01@kamieno.local",
      passwordHash: clientPasswordHash,
      emailVerifiedAt: "2026-04-01T01:00:00.000Z",
      emailVerificationRequired: 0,
      phone: "+61 410 100 001",
      address: "12 Bridge Street\nSydney NSW 2000",
      firm: "",
      lawyerRole: "",
      firmAddress: "",
      firmPhone: "",
      firmContactName: "",
      identityDocumentsJson: "[]",
      practisingCertificateJson: "null",
      regulatorConsent: 0,
      status: "active",
      createdAt: "2026-04-01T01:00:00.000Z",
    },
    {
      id: "user-qa-client-02",
      role: "client",
      name: "Ben Ortiz",
      email: "qa.client.02@kamieno.local",
      passwordHash: clientPasswordHash,
      emailVerifiedAt: "2026-04-01T01:05:00.000Z",
      emailVerificationRequired: 0,
      phone: "+61 410 100 002",
      address: "88 Edward Street\nBrisbane QLD 4000",
      firm: "",
      lawyerRole: "",
      firmAddress: "",
      firmPhone: "",
      firmContactName: "",
      identityDocumentsJson: "[]",
      practisingCertificateJson: "null",
      regulatorConsent: 0,
      status: "active",
      createdAt: "2026-04-01T01:05:00.000Z",
    },
    {
      id: "user-qa-client-03",
      role: "client",
      name: "Clara Doyle",
      email: "qa.client.03@kamieno.local",
      passwordHash: clientPasswordHash,
      emailVerifiedAt: "2026-04-01T01:10:00.000Z",
      emailVerificationRequired: 0,
      phone: "+61 410 100 003",
      address: "40 Collins Street\nMelbourne VIC 3000",
      firm: "",
      lawyerRole: "",
      firmAddress: "",
      firmPhone: "",
      firmContactName: "",
      identityDocumentsJson: "[]",
      practisingCertificateJson: "null",
      regulatorConsent: 0,
      status: "active",
      createdAt: "2026-04-01T01:10:00.000Z",
    },
    {
      id: "user-qa-client-04",
      role: "client",
      name: "Daniel Kim",
      email: "qa.client.04@kamieno.local",
      passwordHash: clientPasswordHash,
      emailVerifiedAt: "2026-04-01T01:15:00.000Z",
      emailVerificationRequired: 0,
      phone: "+61 410 100 004",
      address: "9 St Georges Terrace\nPerth WA 6000",
      firm: "",
      lawyerRole: "",
      firmAddress: "",
      firmPhone: "",
      firmContactName: "",
      identityDocumentsJson: "[]",
      practisingCertificateJson: "null",
      regulatorConsent: 0,
      status: "active",
      createdAt: "2026-04-01T01:15:00.000Z",
    },
    {
      id: "user-qa-client-05",
      role: "client",
      name: "Ella Stone",
      email: "qa.client.05@kamieno.local",
      passwordHash: clientPasswordHash,
      emailVerifiedAt: "2026-04-01T01:20:00.000Z",
      emailVerificationRequired: 0,
      phone: "+61 410 100 005",
      address: "102 King William Street\nAdelaide SA 5000",
      firm: "",
      lawyerRole: "",
      firmAddress: "",
      firmPhone: "",
      firmContactName: "",
      identityDocumentsJson: "[]",
      practisingCertificateJson: "null",
      regulatorConsent: 0,
      status: "active",
      createdAt: "2026-04-01T01:20:00.000Z",
    },
    {
      id: "user-qa-client-06",
      role: "client",
      name: "Felix Brown",
      email: "qa.client.06@kamieno.local",
      passwordHash: clientPasswordHash,
      emailVerifiedAt: "2026-04-01T01:25:00.000Z",
      emailVerificationRequired: 0,
      phone: "+44 7700 900106",
      address: "22 Chancery Lane\nLondon WC2A 1LS",
      firm: "",
      lawyerRole: "",
      firmAddress: "",
      firmPhone: "",
      firmContactName: "",
      identityDocumentsJson: "[]",
      practisingCertificateJson: "null",
      regulatorConsent: 0,
      status: "active",
      createdAt: "2026-04-01T01:25:00.000Z",
    },
    {
      id: "user-qa-client-07",
      role: "client",
      name: "Georgia Patel",
      email: "qa.client.07@kamieno.local",
      passwordHash: clientPasswordHash,
      emailVerifiedAt: "2026-04-01T01:30:00.000Z",
      emailVerificationRequired: 0,
      phone: "+64 21 555 107",
      address: "55 Queen Street\nAuckland 1010",
      firm: "",
      lawyerRole: "",
      firmAddress: "",
      firmPhone: "",
      firmContactName: "",
      identityDocumentsJson: "[]",
      practisingCertificateJson: "null",
      regulatorConsent: 0,
      status: "active",
      createdAt: "2026-04-01T01:30:00.000Z",
    },
    {
      id: "user-qa-client-08",
      role: "client",
      name: "Hugo Webb",
      email: "qa.client.08@kamieno.local",
      passwordHash: clientPasswordHash,
      emailVerifiedAt: "2026-04-01T01:35:00.000Z",
      emailVerificationRequired: 0,
      phone: "+61 410 100 008",
      address: "14 Constitution Avenue\nCanberra ACT 2600",
      firm: "",
      lawyerRole: "",
      firmAddress: "",
      firmPhone: "",
      firmContactName: "",
      identityDocumentsJson: "[]",
      practisingCertificateJson: "null",
      regulatorConsent: 0,
      status: "active",
      createdAt: "2026-04-01T01:35:00.000Z",
    },
    {
      id: "user-qa-client-09",
      role: "client",
      name: "Isla Greene",
      email: "qa.client.09@kamieno.local",
      passwordHash: clientPasswordHash,
      emailVerifiedAt: "2026-04-01T01:40:00.000Z",
      emailVerificationRequired: 0,
      phone: "+61 410 100 009",
      address: "7 Salamanca Place\nHobart TAS 7000",
      firm: "",
      lawyerRole: "",
      firmAddress: "",
      firmPhone: "",
      firmContactName: "",
      identityDocumentsJson: "[]",
      practisingCertificateJson: "null",
      regulatorConsent: 0,
      status: "active",
      createdAt: "2026-04-01T01:40:00.000Z",
    },
    {
      id: "user-qa-client-10",
      role: "client",
      name: "Jonah Price",
      email: "qa.client.10@kamieno.local",
      passwordHash: clientPasswordHash,
      emailVerifiedAt: "2026-04-01T01:45:00.000Z",
      emailVerificationRequired: 0,
      phone: "+61 410 100 010",
      address: "19 The Esplanade\nDarwin NT 0800",
      firm: "",
      lawyerRole: "",
      firmAddress: "",
      firmPhone: "",
      firmContactName: "",
      identityDocumentsJson: "[]",
      practisingCertificateJson: "null",
      regulatorConsent: 0,
      status: "active",
      createdAt: "2026-04-01T01:45:00.000Z",
    },
    {
      id: "user-qa-lawyer-01",
      role: "lawyer",
      name: "Rachel Monroe",
      email: "qa.lawyer.01@kamieno.local",
      passwordHash: lawyerPasswordHash,
      emailVerifiedAt: "2026-04-01T02:00:00.000Z",
      emailVerificationRequired: 0,
      phone: "+61 2 9010 1001",
      address: "Level 18, 1 Martin Place\nSydney NSW 2000",
      firm: "Monroe Family & Workplace",
      lawyerRole: "Partner",
      firmAddress: "Level 18, 1 Martin Place\nSydney NSW 2000",
      firmPhone: "+61 2 9010 1001",
      firmContactName: "Rachel Monroe",
      identityDocumentsJson: JSON.stringify([buildTestStoredDocument("rachel-monroe-passport.pdf", "2026-01-12")]),
      practisingCertificateJson: JSON.stringify(buildTestStoredDocument("rachel-monroe-practising-certificate.pdf", "2026-01-15")),
      regulatorConsent: 1,
      status: "verified",
      createdAt: "2026-04-01T02:00:00.000Z",
    },
    {
      id: "user-qa-lawyer-02",
      role: "lawyer",
      name: "Victor Chen",
      email: "qa.lawyer.02@kamieno.local",
      passwordHash: lawyerPasswordHash,
      emailVerifiedAt: "2026-04-01T02:05:00.000Z",
      emailVerificationRequired: 0,
      phone: "+61 3 9000 2002",
      address: "Level 11, 120 Collins Street\nMelbourne VIC 3000",
      firm: "Chen Estates & Employment",
      lawyerRole: "Principal Lawyer",
      firmAddress: "Level 11, 120 Collins Street\nMelbourne VIC 3000",
      firmPhone: "+61 3 9000 2002",
      firmContactName: "Victor Chen",
      identityDocumentsJson: JSON.stringify([buildTestStoredDocument("victor-chen-passport.pdf", "2026-01-10")]),
      practisingCertificateJson: JSON.stringify(buildTestStoredDocument("victor-chen-practising-certificate.pdf", "2026-01-14")),
      regulatorConsent: 1,
      status: "verified",
      createdAt: "2026-04-01T02:05:00.000Z",
    },
    {
      id: "user-qa-lawyer-03",
      role: "lawyer",
      name: "Priya Menon",
      email: "qa.lawyer.03@kamieno.local",
      passwordHash: lawyerPasswordHash,
      emailVerifiedAt: "2026-04-01T02:10:00.000Z",
      emailVerificationRequired: 0,
      phone: "+61 8 6200 3003",
      address: "Level 7, 240 St Georges Terrace\nPerth WA 6000",
      firm: "WestBridge Defence & Migration",
      lawyerRole: "Partner",
      firmAddress: "Level 7, 240 St Georges Terrace\nPerth WA 6000",
      firmPhone: "+61 8 6200 3003",
      firmContactName: "Priya Menon",
      identityDocumentsJson: JSON.stringify([buildTestStoredDocument("priya-menon-passport.pdf", "2026-01-11")]),
      practisingCertificateJson: JSON.stringify(buildTestStoredDocument("priya-menon-practising-certificate.pdf", "2026-01-16")),
      regulatorConsent: 1,
      status: "verified",
      createdAt: "2026-04-01T02:10:00.000Z",
    },
    {
      id: "user-qa-lawyer-04",
      role: "lawyer",
      name: "Thomas Blake",
      email: "qa.lawyer.04@kamieno.local",
      passwordHash: lawyerPasswordHash,
      emailVerifiedAt: "2026-04-01T02:15:00.000Z",
      emailVerificationRequired: 0,
      phone: "+44 20 7946 0404",
      address: "80 Fleet Street\nLondon EC4Y 1AE",
      firm: "Blake Cross-Border Disputes",
      lawyerRole: "Partner",
      firmAddress: "80 Fleet Street\nLondon EC4Y 1AE",
      firmPhone: "+44 20 7946 0404",
      firmContactName: "Thomas Blake",
      identityDocumentsJson: JSON.stringify([buildTestStoredDocument("thomas-blake-passport.pdf", "2026-01-13")]),
      practisingCertificateJson: JSON.stringify(buildTestStoredDocument("thomas-blake-practising-certificate.pdf", "2026-01-18")),
      regulatorConsent: 1,
      status: "verified",
      createdAt: "2026-04-01T02:15:00.000Z",
    },
    {
      id: "user-qa-lawyer-05",
      role: "lawyer",
      name: "Sophie Walker",
      email: "qa.lawyer.05@kamieno.local",
      passwordHash: lawyerPasswordHash,
      emailVerifiedAt: "2026-04-01T02:20:00.000Z",
      emailVerificationRequired: 0,
      phone: "+61 7 3220 5005",
      address: "Level 6, 215 Adelaide Street\nBrisbane QLD 4000",
      firm: "Walker Probate & Injury",
      lawyerRole: "Employee",
      firmAddress: "Level 6, 215 Adelaide Street\nBrisbane QLD 4000",
      firmPhone: "+61 7 3220 5005",
      firmContactName: "Sophie Walker",
      identityDocumentsJson: JSON.stringify([buildTestStoredDocument("sophie-walker-passport.pdf", "2026-01-19")]),
      practisingCertificateJson: JSON.stringify(buildTestStoredDocument("sophie-walker-practising-certificate.pdf", "2026-01-20")),
      regulatorConsent: 1,
      status: "pending",
      createdAt: "2026-04-01T02:20:00.000Z",
    },
  ];

  const jurisdictions = [
    ["user-qa-lawyer-01", "AU", "NSW", "AU-NSW-QA-1001", "2026-04-01T02:00:00.000Z"],
    ["user-qa-lawyer-01", "AU", "QLD", "AU-QLD-QA-1001", "2026-04-01T02:01:00.000Z"],
    ["user-qa-lawyer-02", "AU", "VIC", "AU-VIC-QA-1002", "2026-04-01T02:05:00.000Z"],
    ["user-qa-lawyer-02", "AU", "SA", "AU-SA-QA-1002", "2026-04-01T02:06:00.000Z"],
    ["user-qa-lawyer-03", "AU", "WA", "AU-WA-QA-1003", "2026-04-01T02:10:00.000Z"],
    ["user-qa-lawyer-03", "AU", "ACT", "AU-ACT-QA-1003", "2026-04-01T02:11:00.000Z"],
    ["user-qa-lawyer-03", "AU", "NT", "AU-NT-QA-1003", "2026-04-01T02:12:00.000Z"],
    ["user-qa-lawyer-04", "UK", "England & Wales", "UK-EW-QA-1004", "2026-04-01T02:15:00.000Z"],
    ["user-qa-lawyer-04", "NZ", "Auckland", "NZ-AK-QA-1004", "2026-04-01T02:16:00.000Z"],
    ["user-qa-lawyer-05", "AU", "TAS", "AU-TAS-QA-1005", "2026-04-01T02:20:00.000Z"],
    ["user-qa-lawyer-05", "AU", "QLD", "AU-QLD-QA-1005", "2026-04-01T02:21:00.000Z"],
  ];

  const cases = [
    {
      id: "case-qa-01",
      clientUserId: "user-qa-client-01",
      clientName: "Anna Mercer",
      caseName: "Anna Mercer -v- Michael Mercer",
      countryCode: "AU",
      region: "NSW",
      practiceAreaId: "family-divorce",
      scopeOfWork: "Review and advise on the family matter",
      summary: "Needs urgent advice about parenting arrangements, interim property access, and whether consent orders are realistic before mediation.",
      budget: "A$10,000 to A$20,000",
      documents: ["Parenting orders.pdf", "Mortgage summary.pdf"],
      customAnswers: {
        "Date of separation": "2026-01-18",
        "Children involved": "Two children aged 7 and 10",
        "Property pool estimate": "Approx AUD 1.2m across home, super, and savings",
      },
      status: "open",
      paymentStatus: "paid_demo",
      paymentReference: "demo-payment-01",
      acceptedBidId: null,
      createdAt: "2026-04-02T03:00:00.000Z",
    },
    {
      id: "case-qa-02",
      clientUserId: "user-qa-client-02",
      clientName: "Ben Ortiz",
      caseName: "Ben Ortiz -v- MetroBuild Insurance",
      countryCode: "AU",
      region: "QLD",
      practiceAreaId: "personal-injury",
      scopeOfWork: "Review and advise on the claim prospects",
      summary: "Worksite fall resulted in a shoulder injury and insurer delay. Wants early advice on liability, treatment costs, and likely claim value.",
      budget: "A$5,000 to A$10,000",
      documents: ["Incident report.pdf", "Orthopaedic invoice.pdf"],
      customAnswers: {
        "Date of accident": "2026-02-09",
        "Injuries sustained": "Rotator cuff tear and restricted movement",
        "Insurer details": "MetroBuild Workers Compensation",
      },
      status: "open",
      paymentStatus: "paid_demo",
      paymentReference: "demo-payment-02",
      acceptedBidId: null,
      createdAt: "2026-04-02T03:10:00.000Z",
    },
    {
      id: "case-qa-03",
      clientUserId: "user-qa-client-03",
      clientName: "Clara Doyle",
      caseName: "Clara Doyle -v- Northshore Health",
      countryCode: "AU",
      region: "VIC",
      practiceAreaId: "employment",
      scopeOfWork: "Review and advise on the workplace issue",
      summary: "Placed on performance management after raising payroll compliance issues and wants advice before responding to a final warning.",
      budget: "A$1,000 to A$5,000",
      documents: ["Employment contract.pdf", "Warning letter.pdf"],
      customAnswers: {
        "Employment status": "Permanent full-time, senior analyst",
        "Key dates": "Warning issued 2026-03-28; response due 2026-04-18",
        "Desired outcome": "Protect role or negotiate exit with reference",
      },
      status: "open",
      paymentStatus: "paid_demo",
      paymentReference: "demo-payment-03",
      acceptedBidId: null,
      createdAt: "2026-04-02T03:20:00.000Z",
    },
    {
      id: "case-qa-04",
      clientUserId: "user-qa-client-04",
      clientName: "Daniel Kim",
      caseName: "State of Western Australia -v- Daniel Kim",
      countryCode: "AU",
      region: "WA",
      practiceAreaId: "criminal-defence",
      scopeOfWork: "Review and advise on the allegation or charge",
      summary: "Charged with assault after a late-night incident and needs advice on plea options, disclosure, and hearing preparation.",
      budget: "A$5,000 to A$10,000",
      documents: ["Charge sheet.pdf", "Police facts.pdf"],
      customAnswers: {
        "Charge or allegation": "Common assault",
        "Brief of evidence status": "Police facts served, brief not yet complete",
        "Bail status": "On bail with reporting conditions",
      },
      status: "open",
      paymentStatus: "paid_demo",
      paymentReference: "demo-payment-04",
      acceptedBidId: null,
      createdAt: "2026-04-02T03:30:00.000Z",
    },
    {
      id: "case-qa-05",
      clientUserId: "user-qa-client-05",
      clientName: "Ella Stone",
      caseName: "Estate of Margaret Stone",
      countryCode: "AU",
      region: "SA",
      practiceAreaId: "wills-probate",
      scopeOfWork: "Review and advise on the wills, estate, or elder law matter",
      summary: "Executor has the original will and the client wants probate advice before filing. Draft remains saved while family documents are gathered.",
      budget: "Unsure, this is my first time",
      documents: ["Will copy.pdf", "Asset schedule.pdf"],
      customAnswers: {
        "Executor status": "Named executor and sole child",
        "Estate size": "Approx AUD 850,000 including family home",
        "Any disputes anticipated": "Possible concern from one nephew",
      },
      status: "payment_pending",
      paymentStatus: "pending",
      paymentReference: null,
      acceptedBidId: null,
      createdAt: "2026-04-02T03:40:00.000Z",
    },
    {
      id: "case-qa-06",
      clientUserId: "user-qa-client-06",
      clientName: "Felix Brown",
      caseName: "Felix Brown -v- Cedar Procurement Ltd",
      countryCode: "UK",
      region: "England & Wales",
      practiceAreaId: "contract-disputes",
      scopeOfWork: "Review and advise on the business or dispute matter",
      summary: "Supplier terminated a software implementation contract and the client wants advice on breach, damages, and a pre-action strategy.",
      budget: "£10,000 to £20,000",
      documents: ["Master services agreement.pdf", "Termination notice.pdf"],
      customAnswers: {
        "Contract date": "2025-08-14",
        "Breach alleged": "Unlawful termination and missed milestone payments",
        "Loss suffered": "Approx GBP 74,000 plus internal project costs",
      },
      status: "open",
      paymentStatus: "paid_demo",
      paymentReference: "demo-payment-06",
      acceptedBidId: null,
      createdAt: "2026-04-02T03:50:00.000Z",
    },
    {
      id: "case-qa-07",
      clientUserId: "user-qa-client-07",
      clientName: "Georgia Patel",
      caseName: "Georgia Patel -v- Harbour View Developments",
      countryCode: "NZ",
      region: "Auckland",
      practiceAreaId: "property",
      scopeOfWork: "Review and advise on the property matter",
      summary: "Pre-settlement defects and finance delay on an apartment purchase. Wants advice on notices and leverage before settlement date.",
      budget: "NZ$5,000 to NZ$10,000",
      documents: ["Sale and purchase agreement.pdf", "Builder defect list.pdf"],
      customAnswers: {
        "Property address": "Apartment 1204, 88 Quay Street, Auckland",
        "Transaction stage": "Conditional, pre-settlement",
        "Key issue to resolve": "Defects, extension of settlement, and deposit risk",
      },
      status: "open",
      paymentStatus: "paid_demo",
      paymentReference: "demo-payment-07",
      acceptedBidId: null,
      createdAt: "2026-04-02T04:00:00.000Z",
    },
    {
      id: "case-qa-08",
      clientUserId: "user-qa-client-08",
      clientName: "Hugo Webb",
      caseName: "Hugo Webb - Visa cancellation response",
      countryCode: "AU",
      region: "ACT",
      practiceAreaId: "immigration",
      scopeOfWork: "Review and advise on options and prospects",
      summary: "Received a notice to consider visa cancellation and already chose a lawyer proposal. Matter is engaged and no longer open for bidding.",
      budget: "A$10,000 to A$20,000",
      documents: ["Cancellation notice.pdf", "Passport.pdf"],
      customAnswers: {
        "Visa type": "Subclass 482",
        "Application stage": "Response period open, 21 days remaining",
        "Urgent deadlines": "Response due 2026-04-22",
      },
      status: "engaged",
      paymentStatus: "paid_demo",
      paymentReference: "demo-payment-08",
      acceptedBidId: "bid-qa-07",
      createdAt: "2026-04-02T04:10:00.000Z",
    },
    {
      id: "case-qa-09",
      clientUserId: "user-qa-client-09",
      clientName: "Isla Greene",
      caseName: "Isla Greene - aged care fee review",
      countryCode: "AU",
      region: "TAS",
      practiceAreaId: "elder-law",
      scopeOfWork: "Review and advise on the wills, estate, or elder law matter",
      summary: "Needs advice on accommodation bond pressure, powers of attorney, and aged care facility documentation before proceeding.",
      budget: "A$1,000 to A$5,000",
      documents: ["Aged care agreement.pdf", "EPA draft.pdf"],
      customAnswers: {
        "Care arrangement": "Residential aged care commencing next month",
        "Capacity concerns": "Mild cognitive decline but capacity still being assessed",
        "Financial issue": "Concern about RAD drawdown and sale timing of family home",
      },
      status: "payment_pending",
      paymentStatus: "pending",
      paymentReference: null,
      acceptedBidId: null,
      createdAt: "2026-04-02T04:20:00.000Z",
    },
    {
      id: "case-qa-10",
      clientUserId: "user-qa-client-10",
      clientName: "Jonah Price",
      caseName: "Jonah Price -v- Lotus Body Corporate",
      countryCode: "AU",
      region: "NT",
      practiceAreaId: "neighbourhood",
      scopeOfWork: "Review and advise on the property matter",
      summary: "Ongoing strata noise dispute and access issue. Wants advice on by-law enforcement and urgent correspondence before filing locally.",
      budget: "A$1,000 to A$5,000",
      documents: ["Body corporate notices.pdf", "Noise log.pdf"],
      customAnswers: {
        "Nature of dispute": "Noise, parking, and common property access",
        "Attempts to resolve": "Two committee complaints and one mediation request",
        "Body corporate involved": "Lotus Body Corporate Committee",
      },
      status: "open",
      paymentStatus: "paid_demo",
      paymentReference: "demo-payment-10",
      acceptedBidId: null,
      createdAt: "2026-04-02T04:30:00.000Z",
    },
  ];

  const bids = [
    ["bid-qa-01", "case-qa-01", "user-qa-lawyer-01", "Stage-based fixed fee estimate", "AUD 8,000 - 12,000", "Court filing and expert costs excluded", "family law dispute", "2026-04-03T05:00:00.000Z"],
    ["bid-qa-02", "case-qa-02", "user-qa-lawyer-01", "Stage-based fixed fee estimate", "AUD 6,500 - 9,500", "Medical reports and counsel fees excluded", "personal injury claim", "2026-04-03T05:10:00.000Z"],
    ["bid-qa-03", "case-qa-03", "user-qa-lawyer-02", "Structured estimate", "AUD 3,500 - 5,500", "Fair Work filing fees excluded", "employment response", "2026-04-03T05:20:00.000Z"],
    ["bid-qa-04", "case-qa-04", "user-qa-lawyer-03", "Stage-based fixed fee estimate", "AUD 7,500 - 11,000", "Counsel and trial costs excluded", "criminal defence matter", "2026-04-03T05:30:00.000Z"],
    ["bid-qa-05", "case-qa-06", "user-qa-lawyer-04", "Stage-based fixed fee estimate", "GBP 9,000 - 14,000", "Court issue and expert fees excluded", "UK contract dispute", "2026-04-03T05:40:00.000Z"],
    ["bid-qa-06", "case-qa-07", "user-qa-lawyer-04", "Structured estimate", "NZD 6,000 - 9,000", "Valuation and settlement agent costs excluded", "New Zealand property dispute", "2026-04-03T05:50:00.000Z"],
    ["bid-qa-07", "case-qa-08", "user-qa-lawyer-03", "Stage-based fixed fee estimate", "AUD 9,500 - 13,500", "Interpreter and migration agent disbursements excluded", "immigration response", "2026-04-03T06:00:00.000Z"],
    ["bid-qa-08", "case-qa-10", "user-qa-lawyer-03", "Structured estimate", "AUD 2,800 - 4,200", "Local filing fees excluded", "strata and neighbourhood dispute", "2026-04-03T06:10:00.000Z"],
  ].map(([id, caseId, lawyerId, feeType, totalFee, disbursements, label, createdAt]) => ({
    id,
    caseId,
    lawyerId,
    privateBid: 1,
    feeType,
    totalFee,
    disbursements,
    sections: buildTestBidSections(label),
    compliance: { safe: true, flags: [] },
    createdAt,
  }));

  const shortlists = [
    ["short-qa-01", "case-qa-01", "bid-qa-01", "2026-04-03T07:00:00.000Z"],
    ["short-qa-02", "case-qa-02", "bid-qa-02", "2026-04-03T07:05:00.000Z"],
    ["short-qa-03", "case-qa-08", "bid-qa-07", "2026-04-03T07:10:00.000Z"],
  ];

  return { users, jurisdictions, cases, bids, shortlists };
}

function deleteRowsByIds(table, column, ids) {
  if (!ids.length) {
    return;
  }
  run(`DELETE FROM ${table} WHERE ${column} IN (${placeholders(ids.length)})`, ids);
}

function seedTestAccounts(options = {}) {
  const existingUsers = all("SELECT id FROM users WHERE lower(email) LIKE lower(?)", [TEST_ACCOUNT_EMAIL_LIKE]).map((row) => row.id);
  if (existingUsers.length && !options.force) {
    return;
  }

  if (existingUsers.length) {
    const existingCases = all(
      `SELECT id FROM cases WHERE client_user_id IN (${placeholders(existingUsers.length)})`,
      existingUsers,
    ).map((row) => row.id);
    const existingBids = all(
      `SELECT id FROM bids WHERE lawyer_user_id IN (${placeholders(existingUsers.length)})`,
      existingUsers,
    ).map((row) => row.id);

    deleteRowsByIds("shortlists", "bid_id", existingBids);
    deleteRowsByIds("shortlists", "case_id", existingCases);
    deleteRowsByIds("bids", "id", existingBids);
    deleteRowsByIds("cases", "id", existingCases);
    deleteRowsByIds("email_verification_tokens", "user_id", existingUsers);
    deleteRowsByIds("sessions", "user_id", existingUsers);
    deleteRowsByIds("user_jurisdictions", "user_id", existingUsers);
    deleteRowsByIds("users", "id", existingUsers);
  }

  const dataset = buildTestAccountDataset();

  const insertUser = db.prepare(`
    INSERT INTO users (
      id, role, name, email, password_hash, email_verified_at, email_verification_required, phone, address, firm, lawyer_role,
      firm_address, firm_phone, firm_contact_name, identity_documents_json,
      practising_certificate_json, regulator_consent, status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const user of dataset.users) {
    insertUser.run(
      user.id,
      user.role,
      user.name,
      user.email,
      user.passwordHash,
      user.emailVerifiedAt || null,
      user.emailVerificationRequired || 0,
      user.phone || "",
      user.address || "",
      user.firm || "",
      user.lawyerRole || "",
      user.firmAddress || "",
      user.firmPhone || "",
      user.firmContactName || "",
      user.identityDocumentsJson || "[]",
      user.practisingCertificateJson || "null",
      user.regulatorConsent || 0,
      user.status,
      user.createdAt,
    );
  }

  const insertJurisdiction = db.prepare(`
    INSERT INTO user_jurisdictions (id, user_id, country_code, region, certificate_ref, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  dataset.jurisdictions.forEach(([userId, countryCode, region, certificateRef, createdAt]) => {
    insertJurisdiction.run(createId("jur"), userId, countryCode, region, certificateRef, createdAt);
  });

  const insertCase = db.prepare(`
    INSERT INTO cases (
      id, client_user_id, client_name, case_name, country_code, region, practice_area_id, quote_mode,
      summary, budget, documents_json, custom_answers_json, fee_amount, status, payment_status,
      payment_reference, payment_session_id, accepted_bid_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  dataset.cases.forEach((entry) => {
    insertCase.run(
      entry.id,
      entry.clientUserId,
      entry.clientName,
      entry.caseName,
      entry.countryCode,
      entry.region,
      entry.practiceAreaId,
      entry.scopeOfWork,
      entry.summary,
      entry.budget,
      JSON.stringify(entry.documents.map((name) => buildTestStoredDocument(name))),
      JSON.stringify(entry.customAnswers),
      getCountryFee(entry.countryCode),
      entry.status,
      entry.paymentStatus,
      entry.paymentReference,
      null,
      entry.acceptedBidId,
      entry.createdAt,
    );
  });

  const insertBid = db.prepare(`
    INSERT INTO bids (
      id, case_id, lawyer_user_id, private_bid, fee_type, total_fee,
      disbursements, sections_json, compliance_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  dataset.bids.forEach((entry) => {
    insertBid.run(
      entry.id,
      entry.caseId,
      entry.lawyerId,
      entry.privateBid,
      entry.feeType,
      entry.totalFee,
      entry.disbursements,
      JSON.stringify(entry.sections),
      JSON.stringify(entry.compliance),
      entry.createdAt,
    );
  });

  dataset.shortlists.forEach(([id, caseId, bidId, createdAt]) => {
    run(
      "INSERT INTO shortlists (id, case_id, bid_id, created_at) VALUES (?, ?, ?, ?)",
      [id, caseId, bidId, createdAt],
    );
  });
}

function applyCountryBackfills() {
  const currentCodes = new Set(all("SELECT country_code FROM settings_countries").map((row) => row.country_code));
  for (const country of COUNTRIES) {
    if (!currentCodes.has(country.code)) {
      run("INSERT INTO settings_countries (country_code, enabled) VALUES (?, ?)", [country.code, 1]);
    }
  }
}

function ensureAdminUser() {
  const existingAdmin = get("SELECT * FROM users WHERE role = 'admin' ORDER BY datetime(created_at) ASC LIMIT 1");
  const adminEmail = process.env.KAMIENO_ADMIN_EMAIL || "admin@kamieno.local";
  const adminPassword = process.env.KAMIENO_ADMIN_PASSWORD || "admin";

  if (!existingAdmin) {
    run(
      `INSERT INTO users (
        id, role, name, email, password_hash, email_verified_at, email_verification_required, phone, address, firm, lawyer_role,
        firm_address, firm_phone, firm_contact_name, identity_documents_json,
        practising_certificate_json, regulator_consent, status, created_at
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "user-admin-seed",
        "admin",
        "Kamieno Admin",
        adminEmail,
        hashPassword(adminPassword),
        new Date().toISOString(),
        0,
        "",
        "",
        "Kamieno",
        "",
        "",
        "",
        "",
        "[]",
        "null",
        0,
        "verified",
        new Date().toISOString(),
      ],
    );
    return;
  }

  if (
    !process.env.KAMIENO_ADMIN_PASSWORD
    && existingAdmin.email === adminEmail
    && verifyPassword("ChangeMeAdmin!2026", existingAdmin.password_hash)
  ) {
    run("UPDATE users SET password_hash = ? WHERE id = ?", [hashPassword("admin"), existingAdmin.id]);
  }

  if (existingAdmin.status !== "verified") {
    run("UPDATE users SET status = ? WHERE id = ?", ["verified", existingAdmin.id]);
  }
}

function cleanupExpiredSessions() {
  run("DELETE FROM sessions WHERE expires_at <= ?", [new Date().toISOString()]);
}

seedSettings();
applyCountryBackfills();
seedUsersAndData();
ensureAdminUser();
seedTestAccounts();
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
      emailVerifiedAt: row.email_verified_at || "",
      emailVerificationRequired: Boolean(row.email_verification_required),
      emailVerified: !row.email_verification_required || Boolean(row.email_verified_at),
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
  TEST_ACCOUNT_PASSWORDS,
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
  isTestAccountEmail,
  normalizeCaseDocuments,
  normalizeScopeOfWork,
  parseJsonColumn,
  run,
  seedTestAccounts,
  seedTemplateForCase,
};
