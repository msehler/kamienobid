const {
  COUNTRIES,
  PRACTICE_AREAS,
  ROLE_COPY,
  buildTemplate,
  getCountry,
  getPracticeArea,
} = require("./app-data");
const {
  all,
  get,
  getBidRowById,
  getCaseRowById,
  getHydratedUserById,
  getUserRowById,
  hydrateBidRow,
  hydrateCaseRow,
  listBidRows,
  listCasesRows,
  listEnabledCountrySettings,
  listHydratedUsersByRole,
  listShortlistsRows,
  run,
} = require("./db");
const { createId } = require("./security");
const { createStripeCheckoutSession, fetchStripeCheckoutSession } = require("./payments");

function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function enabledCountriesFromSettings() {
  const settingsIndex = Object.fromEntries(listEnabledCountrySettings().map((entry) => [entry.country_code, Boolean(entry.enabled)]));
  return COUNTRIES.map((country) => ({
    ...country,
    enabled: settingsIndex[country.code] !== false,
  }));
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

function hydrateBids() {
  return listBidRows().map(hydrateBidRow);
}

function hydrateCases() {
  return listCasesRows().map(hydrateCaseRow);
}

function shortlistIdsByCaseId() {
  return listShortlistsRows().reduce((accumulator, row) => {
    const existing = accumulator[row.case_id] || [];
    existing.push(row.bid_id);
    accumulator[row.case_id] = existing;
    return accumulator;
  }, {});
}

function visibleCasesForLawyer(lawyer) {
  if (!lawyer || lawyer.role !== "lawyer") {
    return [];
  }
  return hydrateCases().filter(
    (matter) =>
      matter.status === "open"
      && String(matter.paymentStatus).startsWith("paid")
      && matchJurisdiction(lawyer.jurisdictions, matter.countryCode, matter.region),
  );
}

function listLawyers(viewer) {
  const lawyers = listHydratedUsersByRole("lawyer");
  if (viewer?.role === "admin") {
    return lawyers;
  }
  return lawyers
    .filter((lawyer) => lawyer.status === "verified")
    .map((lawyer) => ({
      id: lawyer.id,
      name: lawyer.name,
      firm: lawyer.firm,
      status: lawyer.status,
      jurisdictions: lawyer.jurisdictions,
    }));
}

function summarizeAnalytics() {
  const countries = enabledCountriesFromSettings();
  const cases = hydrateCases();
  const bids = hydrateBids();
  const lawyers = listHydratedUsersByRole("lawyer");

  return {
    byCountry: countries.map((country) => ({
      code: country.code,
      name: country.name,
      enabled: country.enabled,
      matters: cases.filter((matter) => matter.countryCode === country.code).length,
      bids: bids.filter((bid) => {
        const matter = cases.find((entry) => entry.id === bid.caseId);
        return matter?.countryCode === country.code;
      }).length,
    })),
    byPracticeArea: PRACTICE_AREAS.map((area) => ({
      id: area.id,
      label: area.label,
      matters: cases.filter((matter) => matter.practiceAreaId === area.id).length,
    })).filter((entry) => entry.matters > 0),
    totalMatters: cases.length,
    totalBids: bids.length,
    verifiedLawyers: lawyers.filter((lawyer) => lawyer.status === "verified").length,
    verificationQueue: lawyers.filter((lawyer) => lawyer.status !== "verified"),
  };
}

function decorateCase(matter, bids, shortlistMap, viewerRole) {
  const country = getCountry(matter.countryCode);
  const visibleBids = bids.filter((bid) => bid.caseId === matter.id);
  return {
    ...matter,
    country,
    practiceArea: getPracticeArea(matter.practiceAreaId),
    template: buildTemplate(matter.countryCode, matter.practiceAreaId),
    bids: visibleBids,
    shortlistedBidIds: shortlistMap[matter.id] || [],
    acceptedBidId: matter.acceptedBidId,
    clientName: viewerRole === "admin" || viewerRole === "client" ? matter.clientName : "Confidential client",
  };
}

function listCases(viewer, query = {}) {
  const cases = hydrateCases();
  const bids = hydrateBids();
  const shortlistMap = shortlistIdsByCaseId();

  let visible = cases;
  if (!viewer) {
    visible = cases.filter((matter) => matter.status === "open" && String(matter.paymentStatus).startsWith("paid"));
  } else if (viewer.role === "client") {
    visible = cases.filter((matter) => matter.clientUserId === viewer.id);
  } else if (viewer.role === "lawyer") {
    const visibleIds = new Set(visibleCasesForLawyer(viewer).map((matter) => matter.id));
    visible = cases.filter((matter) => visibleIds.has(matter.id));
  }

  visible = visible.filter((matter) => {
    if (query.countryCode && matter.countryCode !== query.countryCode) {
      return false;
    }
    if (query.practiceAreaId && matter.practiceAreaId !== query.practiceAreaId) {
      return false;
    }
    return true;
  });

  return visible.map((matter) => {
    let filteredBids = bids;
    if (!viewer) {
      filteredBids = [];
    } else if (viewer.role === "lawyer") {
      filteredBids = bids.filter((bid) => bid.lawyerId === viewer.id);
    } else if (viewer.role === "client") {
      filteredBids = bids.filter((bid) => bid.caseId === matter.id);
    }
    return decorateCase(matter, filteredBids, shortlistMap, viewer?.role);
  });
}

function listBids(viewer, query = {}) {
  const bids = hydrateBids();
  const cases = hydrateCases();
  if (!viewer) {
    return [];
  }

  return bids.filter((bid) => {
    const matter = cases.find((entry) => entry.id === bid.caseId);
    if (!matter) {
      return false;
    }
    if (query.caseId && bid.caseId !== query.caseId) {
      return false;
    }
    if (viewer.role === "admin") {
      return true;
    }
    if (viewer.role === "lawyer") {
      return bid.lawyerId === viewer.id;
    }
    if (viewer.role === "client") {
      return matter.clientUserId === viewer.id;
    }
    return false;
  });
}

function getBootstrap(viewer) {
  return {
    hero: {
      eyebrow: "Compare lawyers with confidence",
      title: "Tender out your legal problem to the right lawyer.",
      description:
        "Describe your matter once, receive proposals from verified lawyers, and compare your options before choosing who to hire.",
    },
    countries: enabledCountriesFromSettings(),
    practiceAreas: PRACTICE_AREAS,
    templateCatalog: COUNTRIES.reduce((accumulator, country) => {
      accumulator[country.code] = PRACTICE_AREAS.map((area) => buildTemplate(country.code, area.id));
      return accumulator;
    }, {}),
    roleCopy: ROLE_COPY,
    analytics: summarizeAnalytics(),
    currentUser: viewer || null,
    stripeReady: Boolean(process.env.STRIPE_SECRET_KEY),
  };
}

function createCase(viewer, payload) {
  const country = getCountry(payload.countryCode);
  const missing = [];
  ["countryCode", "practiceAreaId", "summary", "region"].forEach((field) => {
    if (!payload[field]) {
      missing.push(field);
    }
  });

  if (missing.length) {
    return { status: 422, body: { error: `Missing required fields: ${missing.join(", ")}` } };
  }

  const caseId = createId("case");
  run(
    `INSERT INTO cases (
      id, client_user_id, client_name, country_code, region, practice_area_id, quote_mode,
      summary, budget, documents_json, custom_answers_json, fee_amount, status, payment_status,
      payment_reference, payment_session_id, accepted_bid_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      caseId,
      viewer.id,
      viewer.name,
      payload.countryCode,
      payload.region,
      payload.practiceAreaId,
      payload.quoteMode || "Detailed",
      payload.summary,
      payload.budget || "",
      JSON.stringify(payload.documents || []),
      JSON.stringify(payload.customAnswers || {}),
      country.clientFee,
      "payment_pending",
      "pending",
      null,
      null,
      null,
      new Date().toISOString(),
    ],
  );

  return {
    status: 201,
    body: {
      message: "Matter draft created",
      case: hydrateCaseRow(getCaseRowById(caseId)),
      template: buildTemplate(payload.countryCode, payload.practiceAreaId),
      disclaimer: country.disclaimer,
    },
  };
}

async function createCheckout(viewer, payload, origin) {
  const matter = hydrateCaseRow(getCaseRowById(payload.caseId));
  if (!matter) {
    return { status: 404, body: { error: "Matter not found." } };
  }
  if (matter.clientUserId !== viewer.id) {
    return { status: 403, body: { error: "You can only pay for your own matter." } };
  }
  if (String(matter.paymentStatus).startsWith("paid")) {
    return { status: 200, body: { message: "Matter already paid", case: matter } };
  }

  const country = getCountry(matter.countryCode);
  const checkout = await createStripeCheckoutSession({
    amount: country.clientFee,
    currencyCode: country.currencyCode,
    caseId: matter.id,
    email: viewer.email,
    name: getPracticeArea(matter.practiceAreaId).label,
    origin,
    returnPath: payload.returnPath,
  });

  if (checkout.mode === "demo") {
    run(
      "UPDATE cases SET status = ?, payment_status = ?, payment_reference = ? WHERE id = ?",
      ["open", "paid_demo", "demo-local-checkout", matter.id],
    );
    return {
      status: 200,
      body: {
        message: "Demo payment complete",
        mode: "demo",
        redirectUrl: `${origin}${normalizeReturnPath(payload.returnPath)}?checkout=demo&caseId=${matter.id}`,
      },
    };
  }

  run(
    "UPDATE cases SET payment_reference = ?, payment_session_id = ? WHERE id = ?",
    [checkout.sessionId, checkout.sessionId, matter.id],
  );
  return {
    status: 200,
    body: {
      message: "Checkout created",
      mode: "stripe",
      redirectUrl: checkout.redirectUrl,
    },
  };
}

async function confirmCheckout(viewer, payload) {
  const sessionId = payload.sessionId;
  if (!sessionId) {
    return { status: 422, body: { error: "sessionId is required." } };
  }

  const matterRow = get("SELECT * FROM cases WHERE payment_session_id = ?", [sessionId]);
  const matter = hydrateCaseRow(matterRow);
  if (!matter) {
    return { status: 404, body: { error: "No matter matches this checkout session." } };
  }
  if (matter.clientUserId !== viewer.id && viewer.role !== "admin") {
    return { status: 403, body: { error: "You do not have access to confirm this payment." } };
  }

  if (String(matter.paymentStatus).startsWith("paid")) {
    return { status: 200, body: { message: "Payment already confirmed", case: matter } };
  }

  const session = await fetchStripeCheckoutSession(sessionId);
  if (session.payment_status !== "paid") {
    return { status: 409, body: { error: "Checkout has not been paid yet." } };
  }

  run(
    "UPDATE cases SET status = ?, payment_status = ?, payment_reference = ? WHERE id = ?",
    ["open", "paid_stripe", session.payment_intent || session.id, matter.id],
  );

  return {
    status: 200,
    body: {
      message: "Payment confirmed and matter published",
      case: hydrateCaseRow(getCaseRowById(matter.id)),
    },
  };
}

function normalizeReturnPath(returnPath) {
  if (typeof returnPath !== "string") {
    return "/";
  }
  if (!returnPath.startsWith("/") || returnPath.startsWith("//")) {
    return "/";
  }
  return returnPath.replace(/[\r\n]/g, "") || "/";
}

function updateLawyerProfile(viewer, payload) {
  const jurisdictions = Array.isArray(payload.jurisdictions) ? payload.jurisdictions : [];
  if (!jurisdictions.length) {
    return { status: 422, body: { error: "At least one jurisdiction is required." } };
  }

  run("UPDATE users SET name = ?, firm = ?, status = ? WHERE id = ?", [
    payload.name || viewer.name,
    payload.firm || viewer.firm || "",
    "pending",
    viewer.id,
  ]);

  run("DELETE FROM user_jurisdictions WHERE user_id = ?", [viewer.id]);
  const certificateRefs = Array.isArray(payload.certificateRefs) ? payload.certificateRefs : [];
  for (const [index, entry] of jurisdictions.entries()) {
    const [countryCode, region] = String(entry).split(":");
    if (!countryCode || !region) {
      continue;
    }
    run(
      "INSERT INTO user_jurisdictions (id, user_id, country_code, region, certificate_ref, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [createId("jur"), viewer.id, countryCode, region, certificateRefs[index] || certificateRefs[0] || "", new Date().toISOString()],
    );
  }

  return {
    status: 200,
    body: {
      message: "Lawyer profile updated and sent for verification",
      lawyer: getHydratedUserById(viewer.id),
    },
  };
}

function createBid(viewer, payload) {
  const matter = hydrateCaseRow(getCaseRowById(payload.caseId));
  if (!matter) {
    return { status: 404, body: { error: "Matter not found." } };
  }
  if (viewer.status !== "verified") {
    return { status: 403, body: { error: "Your lawyer account must be verified before you can bid." } };
  }
  if (!matchJurisdiction(viewer.jurisdictions, matter.countryCode, matter.region)) {
    return { status: 403, body: { error: "You are not authorised for this jurisdiction." } };
  }
  if (matter.status !== "open" || !String(matter.paymentStatus).startsWith("paid")) {
    return { status: 409, body: { error: "This matter is not open for bidding." } };
  }

  const recentBidCount = get(
    "SELECT COUNT(*) AS count FROM bids WHERE lawyer_user_id = ? AND datetime(created_at) >= datetime(?)",
    [viewer.id, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()],
  ).count;
  if (recentBidCount >= 5) {
    return { status: 429, body: { error: "Maximum of 5 bids in 24 hours reached." } };
  }

  const sections = payload.sections || {};
  const totalWords = Object.values(sections).reduce((sum, section) => sum + countWords(section), 0);
  if (totalWords < 200) {
    return { status: 422, body: { error: `Strategy must contain at least 200 words. Current count: ${totalWords}.` } };
  }

  const bidId = createId("bid");
  const compliance = screenCompliance(matter.countryCode, sections);
  run(
    `INSERT INTO bids (
      id, case_id, lawyer_user_id, private_bid, fee_type, total_fee,
      disbursements, sections_json, compliance_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bidId,
      matter.id,
      viewer.id,
      payload.privateBid !== false ? 1 : 0,
      payload.feeType || "Fixed fee",
      payload.totalFee || "",
      payload.disbursements || "",
      JSON.stringify(sections),
      JSON.stringify(compliance),
      new Date().toISOString(),
    ],
  );

  return {
    status: 201,
    body: {
      message: "Bid submitted",
      bid: hydrateBidRow(getBidRowById(bidId)),
      compliance,
    },
  };
}

function applyDecision(viewer, payload) {
  const matter = hydrateCaseRow(getCaseRowById(payload.caseId));
  const bid = hydrateBidRow(getBidRowById(payload.bidId));
  if (!matter || !bid) {
    return { status: 404, body: { error: "Case or bid not found." } };
  }
  if (matter.clientUserId !== viewer.id) {
    return { status: 403, body: { error: "You can only manage your own matters." } };
  }

  if (payload.action === "shortlist") {
    run(
      "INSERT OR IGNORE INTO shortlists (id, case_id, bid_id, created_at) VALUES (?, ?, ?, ?)",
      [createId("short"), matter.id, bid.id, new Date().toISOString()],
    );
    return { status: 200, body: { message: "Bid shortlisted" } };
  }

  if (payload.action === "accept") {
    run("UPDATE cases SET accepted_bid_id = ?, status = ? WHERE id = ?", [bid.id, "engaged", matter.id]);
    const lawyer = getHydratedUserById(bid.lawyerId);
    const country = getCountry(matter.countryCode);
    return {
      status: 200,
      body: {
        message: "Bid accepted",
        engagementLetter: {
          heading: `${country.name} Engagement Letter`,
          body: `Client ${matter.clientName} agrees to engage ${lawyer.name} of ${lawyer.firm || lawyer.name} for ${getPracticeArea(
            matter.practiceAreaId,
          ).label}. Pricing basis: ${bid.feeType}. Proposed fee: ${bid.totalFee}. This draft is jurisdiction-aware and should be reviewed before signature.`,
        },
      },
    };
  }

  return { status: 400, body: { error: "Unsupported decision action." } };
}

function getAdminSummary() {
  return {
    settings: {
      countries: listEnabledCountrySettings().map((entry) => ({
        code: entry.country_code,
        enabled: Boolean(entry.enabled),
      })),
      launchedCountries: ["AU", "NZ", "UK"],
      futureExpansion: ["SG", "ZA"],
    },
    analytics: summarizeAnalytics(),
  };
}

function updateAdmin(payload) {
  if (payload.action === "toggle-country") {
    run("UPDATE settings_countries SET enabled = ? WHERE country_code = ?", [payload.enabled ? 1 : 0, payload.code]);
    return { status: 200, body: { message: "Country setting updated" } };
  }
  if (payload.action === "approve-lawyer") {
    const lawyer = getUserRowById(payload.lawyerId);
    if (!lawyer || lawyer.role !== "lawyer") {
      return { status: 404, body: { error: "Lawyer not found." } };
    }
    run("UPDATE users SET status = ? WHERE id = ?", ["verified", payload.lawyerId]);
    return {
      status: 200,
      body: {
        message: "Lawyer approved",
        lawyer: getHydratedUserById(payload.lawyerId),
      },
    };
  }
  return { status: 400, body: { error: "Unsupported admin action." } };
}

module.exports = {
  applyDecision,
  createBid,
  createCase,
  createCheckout,
  getAdminSummary,
  getBootstrap,
  listBids,
  listCases,
  listLawyers,
  screenCompliance,
  updateAdmin,
  updateLawyerProfile,
  confirmCheckout,
  visibleCasesForLawyer,
};
