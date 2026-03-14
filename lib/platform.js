const crypto = require("crypto");

const {
  COUNTRIES,
  PRACTICE_AREAS,
  ROLE_COPY,
  buildTemplate,
  getCountry,
  getPracticeArea,
} = require("./app-data");
const { readStore, writeStore } = require("./store");

function toSlug(prefix) {
  return `${prefix}-${crypto.randomBytes(3).toString("hex")}`;
}

function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function screenCompliance(countryCode, sections) {
  const country = getCountry(countryCode);
  const text = Object.values(sections || {}).join(" ").toLowerCase();
  const flags = country.bannedPhrases.filter((phrase) => text.includes(phrase));
  return {
    safe: flags.length === 0,
    flags: flags.map((flag) => `Remove prohibited phrasing: "${flag}"`),
  };
}

function matchJurisdiction(jurisdictions, countryCode, region) {
  return (jurisdictions || []).some((entry) => entry === `${countryCode}:${region}` || entry === `${countryCode}:ALL`);
}

function visibleCasesForLawyer(store, lawyerId) {
  const lawyer = store.lawyers.find((candidate) => candidate.id === lawyerId);
  if (!lawyer) {
    return [];
  }

  return store.cases.filter(
    (matter) => matter.status === "open" && matchJurisdiction(lawyer.jurisdictions, matter.countryCode, matter.region),
  );
}

function summarizeAnalytics(store) {
  const byCountry = COUNTRIES.map((country) => ({
    code: country.code,
    name: country.name,
    enabled: store.settings.countries.find((entry) => entry.code === country.code)?.enabled !== false,
    matters: store.cases.filter((matter) => matter.countryCode === country.code).length,
    bids: store.bids.filter((bid) => {
      const matter = store.cases.find((entry) => entry.id === bid.caseId);
      return matter?.countryCode === country.code;
    }).length,
  }));

  const byPracticeArea = PRACTICE_AREAS.map((area) => ({
    id: area.id,
    label: area.label,
    matters: store.cases.filter((matter) => matter.practiceAreaId === area.id).length,
  })).filter((area) => area.matters > 0);

  return {
    byCountry,
    byPracticeArea,
    totalMatters: store.cases.length,
    totalBids: store.bids.length,
    verifiedLawyers: store.lawyers.filter((lawyer) => lawyer.status === "verified").length,
    verificationQueue: store.lawyers.filter((lawyer) => lawyer.status !== "verified"),
  };
}

function getBootstrap() {
  const store = readStore();
  const settingsIndex = Object.fromEntries(store.settings.countries.map((entry) => [entry.code, entry.enabled]));

  return {
    hero: {
      eyebrow: "Jurisdiction-aware legal bidding",
      title: "Post your legal problem once. Receive competing strategy-backed bids from verified lawyers.",
      description:
        "Kamieno adapts pricing, terminology, checklists, and conduct-rule safeguards to the user's jurisdiction in real time.",
    },
    countries: COUNTRIES.map((country) => ({
      ...country,
      enabled: settingsIndex[country.code] !== false,
    })),
    practiceAreas: PRACTICE_AREAS,
    templateCatalog: COUNTRIES.reduce((accumulator, country) => {
      accumulator[country.code] = PRACTICE_AREAS.map((area) => buildTemplate(country.code, area.id));
      return accumulator;
    }, {}),
    roleCopy: ROLE_COPY,
    store,
    analytics: summarizeAnalytics(store),
  };
}

function listCases(query) {
  const store = readStore();
  const matters = store.cases.filter((matter) => {
    if (query.countryCode && matter.countryCode !== query.countryCode) {
      return false;
    }
    if (query.practiceAreaId && matter.practiceAreaId !== query.practiceAreaId) {
      return false;
    }
    if (query.lawyerId) {
      const visibleIds = visibleCasesForLawyer(store, query.lawyerId).map((entry) => entry.id);
      return visibleIds.includes(matter.id);
    }
    return true;
  });

  return matters.map((matter) => ({
    ...matter,
    country: getCountry(matter.countryCode),
    practiceArea: getPracticeArea(matter.practiceAreaId),
    template: buildTemplate(matter.countryCode, matter.practiceAreaId),
    bids: store.bids.filter((bid) => bid.caseId === matter.id),
  }));
}

function createCase(payload) {
  const country = getCountry(payload.countryCode);
  const template = buildTemplate(payload.countryCode, payload.practiceAreaId);
  const missing = [];

  ["clientName", "email", "countryCode", "practiceAreaId", "summary"].forEach((field) => {
    if (!payload[field]) {
      missing.push(field);
    }
  });

  if (!payload.region) {
    missing.push("region");
  }

  if (missing.length) {
    return { status: 422, body: { error: `Missing required fields: ${missing.join(", ")}` } };
  }

  const store = readStore();
  const matter = {
    id: toSlug("case"),
    clientName: payload.clientName,
    email: payload.email,
    countryCode: payload.countryCode,
    region: payload.region,
    practiceAreaId: payload.practiceAreaId,
    quoteMode: payload.quoteMode || "Detailed",
    summary: payload.summary,
    budget: payload.budget || "",
    documents: payload.documents || [],
    customAnswers: payload.customAnswers || {},
    feeAmount: country.clientFee,
    status: "open",
    createdAt: new Date().toISOString(),
  };

  store.cases.unshift(matter);
  writeStore(store);

  return {
    status: 201,
    body: {
      message: "Matter published",
      case: matter,
      template,
      disclaimer: country.disclaimer,
    },
  };
}

function listLawyers() {
  const store = readStore();
  return store.lawyers;
}

function registerLawyer(payload) {
  const missing = [];
  ["name", "email"].forEach((field) => {
    if (!payload[field]) {
      missing.push(field);
    }
  });

  if (!Array.isArray(payload.jurisdictions) || !payload.jurisdictions.length) {
    missing.push("jurisdictions");
  }

  if (missing.length) {
    return { status: 422, body: { error: `Missing required fields: ${missing.join(", ")}` } };
  }

  const store = readStore();
  const lawyer = {
    id: toSlug("law"),
    name: payload.name,
    email: payload.email,
    firm: payload.firm || "",
    jurisdictions: payload.jurisdictions,
    certificateRefs: payload.certificateRefs || [],
    status: "pending",
  };

  store.lawyers.unshift(lawyer);
  writeStore(store);

  return {
    status: 201,
    body: {
      message: "Lawyer registration received",
      lawyer,
    },
  };
}

function listBids(query) {
  const store = readStore();
  return store.bids.filter((bid) => !query.caseId || bid.caseId === query.caseId);
}

function createBid(payload) {
  const store = readStore();
  const matter = store.cases.find((entry) => entry.id === payload.caseId);
  const lawyer = store.lawyers.find((entry) => entry.id === payload.lawyerId);

  if (!matter || !lawyer) {
    return { status: 404, body: { error: "Case or lawyer not found." } };
  }

  if (!matchJurisdiction(lawyer.jurisdictions, matter.countryCode, matter.region)) {
    return { status: 403, body: { error: "Lawyer is not authorised for this jurisdiction." } };
  }

  const bidWindow = store.bids.filter((bid) => {
    if (bid.lawyerId !== lawyer.id) {
      return false;
    }
    const age = Date.now() - new Date(bid.createdAt).getTime();
    return age <= 24 * 60 * 60 * 1000;
  });

  if (bidWindow.length >= 5) {
    return { status: 429, body: { error: "Maximum of 5 bids in 24 hours reached." } };
  }

  const sections = payload.sections || {};
  const totalWords = Object.values(sections).reduce((sum, section) => sum + countWords(section), 0);
  if (totalWords < 200) {
    return {
      status: 422,
      body: { error: `Strategy must contain at least 200 words. Current count: ${totalWords}.` },
    };
  }

  const compliance = screenCompliance(matter.countryCode, sections);

  const bid = {
    id: toSlug("bid"),
    caseId: matter.id,
    lawyerId: lawyer.id,
    privateBid: payload.privateBid !== false,
    feeType: payload.feeType || "Fixed fee",
    totalFee: payload.totalFee || "",
    disbursements: payload.disbursements || "",
    sections,
    createdAt: new Date().toISOString(),
    compliance,
  };

  store.bids.unshift(bid);
  writeStore(store);

  return {
    status: 201,
    body: {
      message: "Bid submitted",
      bid,
      compliance,
    },
  };
}

function applyDecision(payload) {
  const store = readStore();
  const matter = store.cases.find((entry) => entry.id === payload.caseId);
  const bid = store.bids.find((entry) => entry.id === payload.bidId);

  if (!matter || !bid) {
    return { status: 404, body: { error: "Case or bid not found." } };
  }

  if (payload.action === "shortlist") {
    store.decisions.shortlistedBidIds = Array.from(new Set([...store.decisions.shortlistedBidIds, bid.id]));
    writeStore(store);
    return { status: 200, body: { message: "Bid shortlisted", decisions: store.decisions } };
  }

  if (payload.action === "accept") {
    store.decisions.acceptedBidId = bid.id;
    matter.status = "engaged";
    writeStore(store);

    const lawyer = store.lawyers.find((entry) => entry.id === bid.lawyerId);
    const country = getCountry(matter.countryCode);
    return {
      status: 200,
      body: {
        message: "Bid accepted",
        decisions: store.decisions,
        engagementLetter: {
          heading: `${country.name} Engagement Letter`,
          body: `Client ${matter.clientName} agrees to engage ${lawyer.name} of ${lawyer.firm || lawyer.name} for ${getPracticeArea(
            matter.practiceAreaId,
          ).label}. Pricing basis: ${bid.feeType}. Proposed fee: ${bid.totalFee}. This document is generated as a jurisdiction-aware draft and should be reviewed before signature.`,
        },
      },
    };
  }

  return { status: 400, body: { error: "Unsupported decision action." } };
}

function getAdminSummary() {
  const store = readStore();
  return {
    settings: store.settings,
    analytics: summarizeAnalytics(store),
  };
}

function updateAdmin(payload) {
  const store = readStore();

  if (payload.action === "toggle-country") {
    store.settings.countries = store.settings.countries.map((entry) => (
      entry.code === payload.code ? { ...entry, enabled: Boolean(payload.enabled) } : entry
    ));
    writeStore(store);
    return { status: 200, body: { message: "Country setting updated", settings: store.settings } };
  }

  if (payload.action === "approve-lawyer") {
    const lawyer = store.lawyers.find((entry) => entry.id === payload.lawyerId);
    if (!lawyer) {
      return { status: 404, body: { error: "Lawyer not found." } };
    }
    lawyer.status = "verified";
    writeStore(store);
    return { status: 200, body: { message: "Lawyer approved", lawyer } };
  }

  return { status: 400, body: { error: "Unsupported admin action." } };
}

module.exports = {
  applyDecision,
  createBid,
  createCase,
  getAdminSummary,
  getBootstrap,
  listBids,
  listCases,
  listLawyers,
  registerLawyer,
  screenCompliance,
  updateAdmin,
  visibleCasesForLawyer,
};
