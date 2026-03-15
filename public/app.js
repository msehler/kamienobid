const state = {
  bootstrap: null,
  currentUser: null,
  cases: [],
  lawyers: [],
  bids: [],
  admin: null,
  selectedCountryCode: null,
  selectedPracticeAreaId: null,
  selectedCaseId: null,
  pendingJurisdictions: [],
  engagementLetter: null,
  checkoutHandled: false,
};

const elements = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  applySignupRolePrefill();
  bindEvents();
  observeReveals();
  await refreshApp();
  await handleCheckoutReturn();
});

function cacheElements() {
  [
    "statusToast",
    "authQuick",
    "globalDisclaimer",
    "heroEyebrow",
    "heroDescription",
    "heroStats",
    "jurisdictionBadge",
    "sessionCard",
    "stripeStatus",
    "signupForm",
    "loginForm",
    "logoutButton",
    "countryInsights",
    "matterForm",
    "matterAccessNote",
    "matterSubmitButton",
    "countrySelect",
    "regionSelect",
    "regionLabel",
    "practiceAreaSelect",
    "quoteModeSelect",
    "promptFields",
    "requiredUploads",
    "publishFee",
    "templateSummary",
    "paymentFlowSummary",
    "lawyerForm",
    "lawyerAccessNote",
    "lawyerSubmitButton",
    "lawyerCountrySelect",
    "lawyerRegionSelect",
    "addJurisdictionButton",
    "selectedJurisdictions",
    "lawyerRoster",
    "lawyerSelect",
    "bidCaseSelect",
    "bidForm",
    "bidAccessNote",
    "feeType",
    "totalFee",
    "disbursements",
    "strategyPosition",
    "strategyNextSteps",
    "strategyRisks",
    "strategyTimeline",
    "bidWordCount",
    "compliancePreview",
    "bidSubmitButton",
    "caseSelect",
    "clientBoardAccess",
    "caseDetails",
    "bidList",
    "engagementLetter",
    "adminAccess",
    "adminCountrySettings",
    "adminMetrics",
    "practiceAreaAnalytics",
    "verificationQueue",
    "clientName",
    "clientEmail",
    "lawyerName",
    "lawyerEmail",
    "lawyerFirm",
    "certificateRefs",
  ].forEach((id) => {
    elements[id] = document.getElementById(id);
  });
}

function bindEvents() {
  if (elements.countrySelect) {
    elements.countrySelect.addEventListener("change", () => {
      state.selectedCountryCode = elements.countrySelect.value;
      renderMatterComposer();
    });
  }

  if (elements.practiceAreaSelect) {
    elements.practiceAreaSelect.addEventListener("change", () => {
      state.selectedPracticeAreaId = elements.practiceAreaSelect.value;
      renderMatterComposer();
    });
  }

  if (elements.lawyerCountrySelect) {
    elements.lawyerCountrySelect.addEventListener("change", renderLawyerRegionOptions);
  }
  if (elements.addJurisdictionButton) {
    elements.addJurisdictionButton.addEventListener("click", addJurisdiction);
  }
  if (elements.bidCaseSelect) {
    elements.bidCaseSelect.addEventListener("change", () => {
      renderBidDefaults();
      renderCompliancePreview();
    });
  }
  [elements.strategyPosition, elements.strategyNextSteps, elements.strategyRisks, elements.strategyTimeline]
    .filter(Boolean)
    .forEach((field) => field.addEventListener("input", renderCompliancePreview));
  if (elements.caseSelect) {
    elements.caseSelect.addEventListener("change", () => {
      state.selectedCaseId = elements.caseSelect.value;
      renderClientBoard();
    });
  }

  if (elements.signupForm) {
    elements.signupForm.addEventListener("submit", submitSignup);
  }
  if (elements.loginForm) {
    elements.loginForm.addEventListener("submit", submitLogin);
  }
  if (elements.logoutButton) {
    elements.logoutButton.addEventListener("click", submitLogout);
  }
  if (elements.matterForm) {
    elements.matterForm.addEventListener("submit", submitMatter);
  }
  if (elements.lawyerForm) {
    elements.lawyerForm.addEventListener("submit", submitLawyerProfile);
  }
  if (elements.bidForm) {
    elements.bidForm.addEventListener("submit", submitBid);
  }
  if (elements.bidList) {
    elements.bidList.addEventListener("click", handleBidAction);
  }
  if (elements.adminCountrySettings) {
    elements.adminCountrySettings.addEventListener("click", handleAdminCountryToggle);
  }
  if (elements.verificationQueue) {
    elements.verificationQueue.addEventListener("click", handleAdminApproval);
  }
}

function applySignupRolePrefill() {
  if (!elements.signupRole) {
    return;
  }
  const role = new URLSearchParams(window.location.search).get("role");
  if (role === "client" || role === "lawyer") {
    elements.signupRole.value = role;
  }
}

async function refreshApp() {
  try {
    const bootstrap = await request("/api/bootstrap");
    state.bootstrap = bootstrap;
    state.currentUser = bootstrap.currentUser;

    const [cases, lawyers, bids, admin] = await Promise.all([
      request("/api/cases"),
      request("/api/lawyers"),
      safeRequest("/api/bids", []),
      state.currentUser?.role === "admin" ? request("/api/admin") : Promise.resolve(null),
    ]);

    state.cases = cases;
    state.lawyers = lawyers;
    state.bids = bids;
    state.admin = admin;

    initializeSelections();
    renderAll();
  } catch (error) {
    showToast(error.message || "Unable to load the app.");
  }
}

async function handleCheckoutReturn() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  const checkoutStatus = params.get("checkout");
  if (state.checkoutHandled || !checkoutStatus) {
    return;
  }
  state.checkoutHandled = true;

  if (checkoutStatus === "cancel") {
    showToast("Checkout was cancelled. Your matter draft is still saved.");
    clearSearchParams();
    return;
  }

  if (checkoutStatus === "demo") {
    showToast("Demo payment completed and matter published.");
    clearSearchParams();
    await refreshApp();
    return;
  }

  if (checkoutStatus === "success" && sessionId && state.currentUser?.role === "client") {
    try {
      const response = await request("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          action: "confirm-checkout",
          sessionId,
        }),
      });
      showToast(response.message);
      clearSearchParams();
      await refreshApp();
    } catch (error) {
      showToast(error.message);
    }
  }
}

function initializeSelections() {
  const enabledCountries = getEnabledCountries();
  const detectedCountry = detectCountry();
  state.selectedCountryCode = enabledCountries.some((country) => country.code === state.selectedCountryCode)
    ? state.selectedCountryCode
    : detectedCountry || enabledCountries[0]?.code || "AU";
  state.selectedPracticeAreaId = state.selectedPracticeAreaId || state.bootstrap.practiceAreas[0]?.id;
  state.selectedCaseId = state.cases.some((matter) => matter.id === state.selectedCaseId)
    ? state.selectedCaseId
    : state.cases[0]?.id || null;
}

function renderAll() {
  renderHeader();
  renderHero();
  renderAuth();
  renderCountryRail();
  renderMatterComposer();
  renderLawyerStudio();
  renderClientBoard();
  renderAdmin();
}

function renderHeader() {
  const country = getCountry(state.selectedCountryCode);
  if (elements.globalDisclaimer) {
    elements.globalDisclaimer.textContent = country.disclaimer;
  }
  if (elements.authQuick) {
    elements.authQuick.innerHTML = state.currentUser
      ? `<span class="pill">${state.currentUser.role}</span><span>${state.currentUser.name}</span>`
      : `<a class="button ghost" href="/account">Sign in</a>`;
  }
}

function renderHero() {
  if (elements.heroEyebrow) {
    elements.heroEyebrow.textContent = state.bootstrap.hero.eyebrow;
  }
  if (elements.heroDescription) {
    elements.heroDescription.textContent = state.bootstrap.hero.description;
  }
  if (elements.jurisdictionBadge) {
    elements.jurisdictionBadge.textContent = getCountry(state.selectedCountryCode).name;
  }
  if (!elements.heroStats) {
    return;
  }

  const analytics = state.bootstrap.analytics;
  elements.heroStats.innerHTML = [
    ["Live countries", getEnabledCountries().length],
    ["Matters", analytics.totalMatters],
    ["Bids", analytics.totalBids],
    ["Verified lawyers", analytics.verifiedLawyers],
  ]
    .map(
      ([label, value]) => `
        <article class="metric-card">
          <p class="eyebrow">${label}</p>
          <p class="big-stat">${value}</p>
        </article>
      `,
    )
    .join("");
}

function renderAuth() {
  if (!elements.sessionCard || !elements.stripeStatus || !elements.signupForm || !elements.loginForm || !elements.logoutButton) {
    return;
  }
  const user = state.currentUser;
  elements.stripeStatus.textContent = state.bootstrap.stripeReady ? "Stripe ready" : "Demo checkout";

  if (user) {
    elements.sessionCard.innerHTML = `
      <p><strong>${user.name}</strong></p>
      <p>${user.email}</p>
      <p>Role: ${user.role}</p>
      <p>Status: ${user.status}</p>
      ${user.jurisdictions?.length ? `<p>${user.jurisdictions.join(", ")}</p>` : "<p>No jurisdictions on file yet.</p>"}
    `;
  } else {
    elements.sessionCard.innerHTML = `
      <p><strong>Public preview</strong></p>
      <p>Create a client or lawyer account to use the workflow. Admin access is provisioned separately.</p>
    `;
  }

  elements.signupForm.style.display = user ? "none" : "";
  elements.loginForm.style.display = user ? "none" : "";
  elements.logoutButton.style.display = user ? "" : "none";
}

function renderCountryRail() {
  if (!elements.countryInsights) {
    return;
  }
  elements.countryInsights.innerHTML = getEnabledCountries()
    .map((country) => `
      <article class="country-chip">
        <p class="eyebrow">${country.currencyCode} ${formatMoney(country.clientFee, country.currencyCode)}</p>
        <strong>${country.name}</strong>
        <span>${country.legalTitle} · ${country.regionLabel} aware · ${country.dataResidency}</span>
      </article>
    `)
    .join("");
}

function renderMatterComposer() {
  if (
    !elements.countrySelect ||
    !elements.practiceAreaSelect ||
    !elements.regionLabel ||
    !elements.regionSelect ||
    !elements.publishFee ||
    !elements.templateSummary ||
    !elements.paymentFlowSummary ||
    !elements.promptFields ||
    !elements.requiredUploads ||
    !elements.matterAccessNote ||
    !elements.matterForm ||
    !elements.matterSubmitButton ||
    !elements.clientName ||
    !elements.clientEmail
  ) {
    return;
  }
  populateCountrySelect(elements.countrySelect, state.selectedCountryCode);
  populatePracticeAreas();

  const country = getCountry(state.selectedCountryCode);
  const template = getTemplate(state.selectedCountryCode, state.selectedPracticeAreaId);
  state.selectedCountryCode = country.code;
  elements.regionLabel.textContent = country.regionLabel;
  populateRegionSelect(elements.regionSelect, country, elements.regionSelect.value);
  elements.publishFee.textContent = `${formatMoney(country.clientFee, country.currencyCode)} fee`;
  elements.templateSummary.innerHTML = `
    <p><strong>${template.label}</strong></p>
    <p>${template.terminology}</p>
    <p>${template.disclaimer}</p>
    <ul>${template.prompts.map((prompt) => `<li>${prompt}</li>`).join("")}</ul>
  `;
  elements.paymentFlowSummary.innerHTML = `
    <p class="eyebrow">Publishing flow</p>
    <p>Create a draft matter first, then complete checkout to make it visible to eligible lawyers.</p>
  `;
  elements.promptFields.innerHTML = template.prompts
    .map(
      (prompt) => `
        <label>
          ${prompt}
          <textarea name="prompt:${prompt}" rows="4" placeholder="Provide matter-specific detail"></textarea>
        </label>
      `,
    )
    .join("");
  elements.requiredUploads.innerHTML = template.uploads.map((entry) => `<li>${entry}</li>`).join("");

  const isClient = state.currentUser?.role === "client";
  elements.matterAccessNote.innerHTML = isClient
    ? `<p>Signed in as client. Checkout will publish the matter once payment is confirmed.</p>`
    : `<p>Sign in as a client to create and publish a matter.</p>`;
  setFormEnabled(elements.matterForm, isClient);
  elements.matterSubmitButton.disabled = !isClient;

  if (state.currentUser) {
    elements.clientName.value = state.currentUser.name;
    elements.clientEmail.value = state.currentUser.email;
    elements.clientName.readOnly = true;
    elements.clientEmail.readOnly = true;
  } else {
    elements.clientName.readOnly = false;
    elements.clientEmail.readOnly = false;
  }
}

function renderLawyerStudio() {
  if (
    !elements.lawyerCountrySelect ||
    !elements.lawyerRegionSelect ||
    !elements.selectedJurisdictions ||
    !elements.lawyerAccessNote ||
    !elements.bidAccessNote ||
    !elements.lawyerForm ||
    !elements.bidForm ||
    !elements.lawyerSubmitButton ||
    !elements.bidSubmitButton ||
    !elements.lawyerName ||
    !elements.lawyerEmail ||
    !elements.lawyerFirm ||
    !elements.lawyerSelect ||
    !elements.lawyerRoster ||
    !elements.bidCaseSelect
  ) {
    return;
  }
  populateCountrySelect(elements.lawyerCountrySelect, elements.lawyerCountrySelect.value || state.selectedCountryCode);
  renderLawyerRegionOptions();
  renderSelectedJurisdictions();

  const isLawyer = state.currentUser?.role === "lawyer";
  elements.lawyerAccessNote.innerHTML = isLawyer
    ? `<p>Update your jurisdictions and certificate references. Bidding unlocks after verification.</p>`
    : `<p>Sign in as a lawyer to manage your practice profile and submit bids.</p>`;
  elements.bidAccessNote.innerHTML = isLawyer
    ? state.currentUser.status === "verified"
      ? `<p>Your account is verified. You can bid on matching paid matters.</p>`
      : `<p>Your account is pending verification. You can complete your profile, but bidding stays locked until approval.</p>`
    : `<p>Lawyer login required to submit bids.</p>`;

  setFormEnabled(elements.lawyerForm, isLawyer);
  setFormEnabled(elements.bidForm, isLawyer && state.currentUser?.status === "verified");
  elements.lawyerSubmitButton.disabled = !isLawyer;
  elements.bidSubmitButton.disabled = !(isLawyer && state.currentUser?.status === "verified");

  if (isLawyer) {
    elements.lawyerName.value = state.currentUser.name || "";
    elements.lawyerEmail.value = state.currentUser.email || "";
    elements.lawyerFirm.value = state.currentUser.firm || "";
    elements.lawyerEmail.readOnly = true;
    if (!state.pendingJurisdictions.length && state.currentUser.jurisdictions?.length) {
      state.pendingJurisdictions = [...state.currentUser.jurisdictions];
      renderSelectedJurisdictions();
    }
  } else {
    elements.lawyerEmail.readOnly = false;
  }

  const lawyerOptions = isLawyer
    ? [state.currentUser]
    : state.lawyers.filter((entry) => entry.status === "verified");
  elements.lawyerSelect.innerHTML = lawyerOptions.length
    ? lawyerOptions.map((lawyer) => `<option value="${lawyer.id}">${lawyer.name}</option>`).join("")
    : `<option value="">No lawyer account available</option>`;

  elements.lawyerRoster.innerHTML = state.lawyers.length
    ? state.lawyers
        .map((lawyer) => `
          <article class="roster-item">
            <strong>${lawyer.name}</strong>
            <span>${lawyer.firm || "Independent practice"}</span>
            <span>Status: ${lawyer.status}</span>
            <span>${(lawyer.jurisdictions || []).join(", ")}</span>
          </article>
        `)
        .join("")
    : "<p>No lawyer profiles yet.</p>";

  const visibleCases = state.cases;
  const selectedCase = visibleCases.find((matter) => matter.id === elements.bidCaseSelect.value) || visibleCases[0];
  elements.bidCaseSelect.innerHTML = visibleCases.length
    ? visibleCases
        .map((matter) => `
          <option value="${matter.id}" ${selectedCase?.id === matter.id ? "selected" : ""}>
            ${getCountry(matter.countryCode).name} · ${getPracticeArea(matter.practiceAreaId).label}
          </option>
        `)
        .join("")
    : `<option value="">No visible matters</option>`;

  renderBidDefaults();
  renderCompliancePreview();
}

function renderBidDefaults() {
  if (!elements.bidCaseSelect || !elements.feeType || !elements.disbursements || !elements.compliancePreview) {
    return;
  }
  const matter = state.cases.find((entry) => entry.id === elements.bidCaseSelect.value);
  if (!matter) {
    elements.feeType.placeholder = "Select an eligible matter";
    elements.compliancePreview.innerHTML = "<li>Select an eligible matter to preview conduct checks.</li>";
    return;
  }
  const country = getCountry(matter.countryCode);
  const template = getTemplate(matter.countryCode, matter.practiceAreaId);
  elements.feeType.placeholder = country.code === "US" ? "Contingency / hourly blend" : "Fixed or staged fee";
  elements.disbursements.placeholder = template.terminology;
}

function renderCompliancePreview() {
  if (
    !elements.bidCaseSelect ||
    !elements.strategyPosition ||
    !elements.strategyNextSteps ||
    !elements.strategyRisks ||
    !elements.strategyTimeline ||
    !elements.bidWordCount ||
    !elements.compliancePreview
  ) {
    return;
  }
  const matter = state.cases.find((entry) => entry.id === elements.bidCaseSelect.value);
  const content = [
    elements.strategyPosition.value,
    elements.strategyNextSteps.value,
    elements.strategyRisks.value,
    elements.strategyTimeline.value,
  ].join(" ");
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  elements.bidWordCount.textContent = `${words} words`;
  if (!matter) {
    elements.compliancePreview.innerHTML = "<li>Select a visible matter to preview conduct checks.</li>";
    return;
  }
  const country = getCountry(matter.countryCode);
  const flags = country.bannedPhrases.filter((phrase) => content.toLowerCase().includes(phrase));
  const items = [
    "<li>Minimum strategy length: 200 words.</li>",
    "<li>Four sections required: position, next steps, risks, timeline.</li>",
  ];
  if (flags.length) {
    flags.forEach((flag) => items.push(`<li>${flag} is not permitted in ${country.name} copy.</li>`));
  } else {
    items.push(`<li>No prohibited wording currently detected for ${country.name}.</li>`);
  }
  elements.compliancePreview.innerHTML = items.join("");
}

function renderClientBoard() {
  if (!elements.clientBoardAccess || !elements.caseSelect || !elements.caseDetails || !elements.bidList || !elements.engagementLetter) {
    return;
  }
  const isClient = state.currentUser?.role === "client";
  elements.clientBoardAccess.innerHTML = isClient
    ? "<p>These are your own matters. Payment-pending drafts are visible only to you.</p>"
    : "<p>Sign in as a client to view your decision board.</p>";

  elements.caseSelect.innerHTML = state.cases.length
    ? state.cases
        .map((matter) => `
          <option value="${matter.id}" ${matter.id === state.selectedCaseId ? "selected" : ""}>
            ${getCountry(matter.countryCode).name} · ${getPracticeArea(matter.practiceAreaId).label}
          </option>
        `)
        .join("")
    : `<option value="">No matters available</option>`;

  if (!isClient || !state.cases.length) {
    elements.caseDetails.innerHTML = "";
    elements.bidList.innerHTML = "";
    elements.engagementLetter.innerHTML = "";
    return;
  }

  const matter = state.cases.find((entry) => entry.id === state.selectedCaseId) || state.cases[0];
  if (!matter) {
    return;
  }
  state.selectedCaseId = matter.id;
  const template = getTemplate(matter.countryCode, matter.practiceAreaId);
  const matterBids = state.bids.filter((bid) => bid.caseId === matter.id);

  elements.caseDetails.innerHTML = `
    <p><strong>${getPracticeArea(matter.practiceAreaId).label}</strong></p>
    <p>${matter.summary}</p>
    <div class="case-meta">
      <span class="pill neutral">${getCountry(matter.countryCode).name}</span>
      <span class="pill neutral">${matter.region}</span>
      <span class="pill neutral">${matter.quoteMode}</span>
      <span class="pill neutral">${matter.status}</span>
      <span class="pill neutral">${matter.paymentStatus}</span>
    </div>
    <div class="checklist-card">
      <p class="eyebrow">Dynamic prompts</p>
      <ul>${Object.entries(matter.customAnswers || {})
        .map(([key, value]) => `<li><strong>${key}</strong>: ${value || "Not provided"}</li>`)
        .join("")}</ul>
    </div>
    <p>${template.disclaimer}</p>
  `;

  elements.bidList.innerHTML = matterBids.length
    ? matterBids.map((bid) => renderBidCard(bid, matter)).join("")
    : "<p>No bids yet for this matter.</p>";

  elements.engagementLetter.innerHTML = state.engagementLetter
    ? `<h4>${state.engagementLetter.heading}</h4><p>${state.engagementLetter.body}</p>`
    : "";
}

function renderBidCard(bid, matter) {
  const shortlisted = (matter.shortlistedBidIds || []).includes(bid.id);
  const accepted = matter.acceptedBidId === bid.id;
  const lawyer = (state.lawyers || []).find((entry) => entry.id === bid.lawyerId);
  return `
    <article class="bid-card">
      <div>
        <strong>${lawyer?.name || "Lawyer"}</strong>
        <div class="case-meta">
          <span class="pill neutral">${bid.feeType}</span>
          <span class="pill neutral">${bid.totalFee || "Price on request"}</span>
          ${shortlisted ? '<span class="pill">Shortlisted</span>' : ""}
          ${accepted ? '<span class="pill">Accepted</span>' : ""}
        </div>
      </div>
      <p>${bid.sections.position || ""}</p>
      <ul>
        <li><strong>Next steps:</strong> ${bid.sections.nextSteps || ""}</li>
        <li><strong>Risks:</strong> ${bid.sections.risks || ""}</li>
        <li><strong>Timeline:</strong> ${bid.sections.timeline || ""}</li>
      </ul>
      ${
        bid.compliance?.flags?.length
          ? `<div class="flag-list">${bid.compliance.flags.map((flag) => `<div>${flag}</div>`).join("")}</div>`
          : ""
      }
      <div class="bid-actions">
        <button class="button secondary" data-action="shortlist" data-bid-id="${bid.id}">Shortlist</button>
        <button class="button primary" data-action="accept" data-bid-id="${bid.id}">Accept bid</button>
      </div>
    </article>
  `;
}

function renderAdmin() {
  if (!elements.adminAccess || !elements.adminCountrySettings || !elements.adminMetrics || !elements.practiceAreaAnalytics || !elements.verificationQueue) {
    return;
  }
  if (state.currentUser?.role !== "admin") {
    elements.adminAccess.innerHTML = "<p>Admin access is restricted to administrator accounts.</p>";
    elements.adminCountrySettings.innerHTML = "";
    elements.adminMetrics.innerHTML = "";
    elements.practiceAreaAnalytics.innerHTML = "";
    elements.verificationQueue.innerHTML = "";
    return;
  }

  elements.adminAccess.innerHTML = "<p>Admin session active.</p>";
  const countries = state.bootstrap.countries;
  const analytics = state.admin.analytics;
  elements.adminCountrySettings.innerHTML = countries
    .map((country) => `
      <article class="setting-card">
        <strong>${country.name}</strong>
        <span>${country.currencyCode} · ${country.legalTitle}</span>
        <span>${country.dataResidency}</span>
        <button class="button ${country.enabled ? "secondary" : "primary"}" data-country="${country.code}" data-enabled="${country.enabled}">
          ${country.enabled ? "Disable" : "Enable"}
        </button>
      </article>
    `)
    .join("");

  elements.adminMetrics.innerHTML = [
    ["Total matters", analytics.totalMatters],
    ["Total bids", analytics.totalBids],
    ["Verified lawyers", analytics.verifiedLawyers],
  ]
    .map(
      ([label, value]) => `
        <article class="metric-card">
          <p class="eyebrow">${label}</p>
          <p class="big-stat">${value}</p>
        </article>
      `,
    )
    .join("");

  elements.practiceAreaAnalytics.innerHTML = analytics.byPracticeArea
    .map((entry) => `<p>${entry.label}: <strong>${entry.matters}</strong> matters</p>`)
    .join("");

  elements.verificationQueue.innerHTML = analytics.verificationQueue.length
    ? analytics.verificationQueue
        .map((lawyer) => `
          <article class="queue-item">
            <strong>${lawyer.name}</strong>
            <p>${lawyer.email}</p>
            <p>${(lawyer.jurisdictions || []).join(", ")}</p>
            <button class="button primary" data-lawyer-id="${lawyer.id}">Approve lawyer</button>
          </article>
        `)
        .join("")
    : "<p>Verification queue is clear.</p>";
}

async function submitSignup(event) {
  event.preventDefault();
  const formData = new FormData(elements.signupForm);
  try {
    const response = await request("/api/auth", {
      method: "POST",
      body: JSON.stringify({
        action: "signup",
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        role: formData.get("role"),
      }),
    });
    showToast(response.message);
    elements.signupForm.reset();
    await refreshApp();
  } catch (error) {
    showToast(error.message);
  }
}

async function submitLogin(event) {
  event.preventDefault();
  const formData = new FormData(elements.loginForm);
  try {
    const response = await request("/api/auth", {
      method: "POST",
      body: JSON.stringify({
        action: "login",
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });
    showToast(response.message);
    elements.loginForm.reset();
    await refreshApp();
  } catch (error) {
    showToast(error.message);
  }
}

async function submitLogout() {
  try {
    const response = await request("/api/auth", {
      method: "POST",
      body: JSON.stringify({ action: "logout" }),
    });
    state.pendingJurisdictions = [];
    state.engagementLetter = null;
    showToast(response.message);
    await refreshApp();
  } catch (error) {
    showToast(error.message);
  }
}

async function submitMatter(event) {
  event.preventDefault();
  if (state.currentUser?.role !== "client") {
    showToast("Client login required to publish a matter.");
    return;
  }

  const template = getTemplate(elements.countrySelect.value, elements.practiceAreaSelect.value);
  const formData = new FormData(elements.matterForm);
  const customAnswers = {};
  template.prompts.forEach((prompt) => {
    customAnswers[prompt] = formData.get(`prompt:${prompt}`) || "";
  });

  try {
    const draft = await request("/api/cases", {
      method: "POST",
      body: JSON.stringify({
        countryCode: formData.get("countryCode"),
        region: formData.get("region"),
        practiceAreaId: formData.get("practiceAreaId"),
        quoteMode: formData.get("quoteMode"),
        summary: formData.get("summary"),
        budget: formData.get("budget"),
        documents: splitList(formData.get("documents")),
        customAnswers,
      }),
    });
    const checkout = await request("/api/payments", {
      method: "POST",
      body: JSON.stringify({
        action: "create-checkout",
        caseId: draft.case.id,
        returnPath: window.location.pathname === "/" ? "/client" : window.location.pathname,
      }),
    });
    showToast(checkout.message);
    if (checkout.redirectUrl) {
      window.location.assign(checkout.redirectUrl);
      return;
    }
    await refreshApp();
  } catch (error) {
    showToast(error.message);
  }
}

async function submitLawyerProfile(event) {
  event.preventDefault();
  if (state.currentUser?.role !== "lawyer") {
    showToast("Lawyer login required.");
    return;
  }

  const formData = new FormData(elements.lawyerForm);
  try {
    const response = await request("/api/lawyers", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        firm: formData.get("firm"),
        jurisdictions: state.pendingJurisdictions,
        certificateRefs: splitList(formData.get("certificateRefs")),
      }),
    });
    showToast(response.message);
    await refreshApp();
  } catch (error) {
    showToast(error.message);
  }
}

async function submitBid(event) {
  event.preventDefault();
  if (state.currentUser?.role !== "lawyer") {
    showToast("Lawyer login required.");
    return;
  }
  try {
    const response = await request("/api/bids", {
      method: "POST",
      body: JSON.stringify({
        caseId: elements.bidCaseSelect.value,
        feeType: elements.feeType.value,
        totalFee: elements.totalFee.value,
        disbursements: elements.disbursements.value,
        privateBid: document.getElementById("privateBid").checked,
        sections: {
          position: elements.strategyPosition.value,
          nextSteps: elements.strategyNextSteps.value,
          risks: elements.strategyRisks.value,
          timeline: elements.strategyTimeline.value,
        },
      }),
    });
    showToast(response.message);
    elements.bidForm.reset();
    await refreshApp();
  } catch (error) {
    showToast(error.message);
  }
}

async function handleBidAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button || state.currentUser?.role !== "client") {
    return;
  }
  try {
    const response = await request("/api/decisions", {
      method: "POST",
      body: JSON.stringify({
        action: button.dataset.action,
        caseId: state.selectedCaseId,
        bidId: button.dataset.bidId,
      }),
    });
    showToast(response.message);
    state.engagementLetter = response.engagementLetter || null;
    await refreshApp();
  } catch (error) {
    showToast(error.message);
  }
}

async function handleAdminCountryToggle(event) {
  const button = event.target.closest("button[data-country]");
  if (!button || state.currentUser?.role !== "admin") {
    return;
  }
  try {
    const response = await request("/api/admin", {
      method: "POST",
      body: JSON.stringify({
        action: "toggle-country",
        code: button.dataset.country,
        enabled: button.dataset.enabled !== "true",
      }),
    });
    showToast(response.message);
    await refreshApp();
  } catch (error) {
    showToast(error.message);
  }
}

async function handleAdminApproval(event) {
  const button = event.target.closest("button[data-lawyer-id]");
  if (!button || state.currentUser?.role !== "admin") {
    return;
  }
  try {
    const response = await request("/api/admin", {
      method: "POST",
      body: JSON.stringify({
        action: "approve-lawyer",
        lawyerId: button.dataset.lawyerId,
      }),
    });
    showToast(response.message);
    await refreshApp();
  } catch (error) {
    showToast(error.message);
  }
}

function populateCountrySelect(select, selectedValue) {
  if (!select) {
    return;
  }
  select.innerHTML = getEnabledCountries()
    .map((country) => `<option value="${country.code}" ${country.code === selectedValue ? "selected" : ""}>${country.name}</option>`)
    .join("");
}

function populatePracticeAreas() {
  if (!elements.practiceAreaSelect) {
    return;
  }
  elements.practiceAreaSelect.innerHTML = state.bootstrap.practiceAreas
    .map((area) => `<option value="${area.id}" ${area.id === state.selectedPracticeAreaId ? "selected" : ""}>${area.label}</option>`)
    .join("");
}

function populateRegionSelect(select, country, selectedValue) {
  if (!select) {
    return;
  }
  const fallback = selectedValue && country.regions.includes(selectedValue) ? selectedValue : country.regions[0];
  select.innerHTML = country.regions.map((region) => `<option value="${region}" ${region === fallback ? "selected" : ""}>${region}</option>`).join("");
}

function renderLawyerRegionOptions() {
  if (!elements.lawyerCountrySelect || !elements.lawyerRegionSelect) {
    return;
  }
  const country = getCountry(elements.lawyerCountrySelect.value || state.selectedCountryCode);
  populateRegionSelect(elements.lawyerRegionSelect, country, elements.lawyerRegionSelect.value);
}

function addJurisdiction() {
  if (!elements.lawyerCountrySelect || !elements.lawyerRegionSelect) {
    return;
  }
  const entry = `${elements.lawyerCountrySelect.value}:${elements.lawyerRegionSelect.value}`;
  if (!state.pendingJurisdictions.includes(entry)) {
    state.pendingJurisdictions.push(entry);
  }
  renderSelectedJurisdictions();
}

function renderSelectedJurisdictions() {
  if (!elements.selectedJurisdictions) {
    return;
  }
  elements.selectedJurisdictions.innerHTML = state.pendingJurisdictions.length
    ? state.pendingJurisdictions
        .map(
          (entry) => `
            <span class="selected-chip">
              ${entry}
              <button type="button" data-jurisdiction="${entry}">×</button>
            </span>
          `,
        )
        .join("")
    : "<span class='eyebrow'>No jurisdictions added yet.</span>";

  elements.selectedJurisdictions.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.pendingJurisdictions = state.pendingJurisdictions.filter((entry) => entry !== button.dataset.jurisdiction);
      renderSelectedJurisdictions();
    });
  });
}

function getEnabledCountries() {
  return state.bootstrap.countries.filter((country) => country.enabled);
}

function getCountry(code) {
  return state.bootstrap.countries.find((country) => country.code === code) || state.bootstrap.countries[0];
}

function getPracticeArea(id) {
  return state.bootstrap.practiceAreas.find((area) => area.id === id) || state.bootstrap.practiceAreas[0];
}

function getTemplate(countryCode, practiceAreaId) {
  return state.bootstrap.templateCatalog[countryCode].find((template) => template.areaId === practiceAreaId);
}

function setFormEnabled(form, enabled) {
  if (!form) {
    return;
  }
  Array.from(form.elements).forEach((element) => {
    if (element.id === "privateBid" || element.tagName === "BUTTON" || element.name?.startsWith("prompt:")) {
      return;
    }
    if (element.id === "clientName" || element.id === "clientEmail" || element.id === "lawyerEmail") {
      return;
    }
    element.disabled = !enabled;
  });
  form.classList.toggle("is-disabled", !enabled);
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatMoney(value, currencyCode) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function detectCountry() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timezone) {
    return null;
  }
  if (timezone.startsWith("Australia/")) {
    return "AU";
  }
  if (timezone === "Pacific/Auckland") {
    return "NZ";
  }
  if (timezone === "Europe/London") {
    return "UK";
  }
  if (timezone.startsWith("America/")) {
    return "US";
  }
  if (timezone === "Europe/Dublin") {
    return "IE";
  }
  return null;
}

function clearSearchParams() {
  window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
}

async function safeRequest(url, fallbackValue) {
  try {
    return await request(url);
  } catch (error) {
    if (/access|sign in|required/i.test(error.message)) {
      return fallbackValue;
    }
    throw error;
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

function showToast(message) {
  if (!elements.statusToast) {
    return;
  }
  elements.statusToast.textContent = message;
  elements.statusToast.classList.add("is-visible");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.statusToast.classList.remove("is-visible");
  }, 2600);
}

function observeReveals() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.16 },
  );

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}
