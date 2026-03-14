const state = {
  bootstrap: null,
  cases: [],
  lawyers: [],
  bids: [],
  admin: null,
  selectedCountryCode: null,
  selectedPracticeAreaId: null,
  selectedCaseId: null,
  selectedLawyerId: null,
  pendingJurisdictions: [],
  engagementLetter: null,
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  observeReveals();
  refreshApp();
});

function cacheElements() {
  [
    "statusToast",
    "globalDisclaimer",
    "heroEyebrow",
    "heroDescription",
    "heroStats",
    "jurisdictionBadge",
    "countryInsights",
    "matterForm",
    "countrySelect",
    "regionSelect",
    "regionLabel",
    "practiceAreaSelect",
    "quoteModeSelect",
    "promptFields",
    "requiredUploads",
    "publishFee",
    "templateSummary",
    "lawyerForm",
    "lawyerCountrySelect",
    "lawyerRegionSelect",
    "addJurisdictionButton",
    "selectedJurisdictions",
    "lawyerRoster",
    "lawyerSelect",
    "bidCaseSelect",
    "bidForm",
    "feeType",
    "totalFee",
    "disbursements",
    "strategyPosition",
    "strategyNextSteps",
    "strategyRisks",
    "strategyTimeline",
    "bidWordCount",
    "compliancePreview",
    "caseSelect",
    "caseDetails",
    "bidList",
    "engagementLetter",
    "adminCountrySettings",
    "adminMetrics",
    "practiceAreaAnalytics",
    "verificationQueue",
  ].forEach((id) => {
    elements[id] = document.getElementById(id);
  });
}

function bindEvents() {
  elements.countrySelect.addEventListener("change", () => {
    state.selectedCountryCode = elements.countrySelect.value;
    renderMatterComposer();
  });

  elements.practiceAreaSelect.addEventListener("change", () => {
    state.selectedPracticeAreaId = elements.practiceAreaSelect.value;
    renderMatterComposer();
  });

  elements.lawyerCountrySelect.addEventListener("change", renderLawyerRegionOptions);
  elements.addJurisdictionButton.addEventListener("click", addJurisdiction);
  elements.lawyerSelect.addEventListener("change", () => {
    state.selectedLawyerId = elements.lawyerSelect.value;
    renderLawyerStudio();
  });

  elements.bidCaseSelect.addEventListener("change", () => {
    renderCompliancePreview();
    renderBidDefaults();
  });

  [elements.strategyPosition, elements.strategyNextSteps, elements.strategyRisks, elements.strategyTimeline].forEach(
    (field) => field.addEventListener("input", renderCompliancePreview),
  );

  elements.caseSelect.addEventListener("change", () => {
    state.selectedCaseId = elements.caseSelect.value;
    renderClientBoard();
  });

  elements.matterForm.addEventListener("submit", submitMatter);
  elements.lawyerForm.addEventListener("submit", submitLawyer);
  elements.bidForm.addEventListener("submit", submitBid);
  elements.bidList.addEventListener("click", handleBidAction);
  elements.adminCountrySettings.addEventListener("click", handleAdminCountryToggle);
  elements.verificationQueue.addEventListener("click", handleAdminApproval);
}

async function refreshApp() {
  try {
    const [bootstrap, cases, lawyers, bids, admin] = await Promise.all([
      request("/api/bootstrap"),
      request("/api/cases"),
      request("/api/lawyers"),
      request("/api/bids"),
      request("/api/admin"),
    ]);

    state.bootstrap = bootstrap;
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
  state.selectedLawyerId = state.lawyers.some((lawyer) => lawyer.id === state.selectedLawyerId)
    ? state.selectedLawyerId
    : state.lawyers[0]?.id || null;
}

function renderAll() {
  renderHeader();
  renderHero();
  renderCountryRail();
  renderMatterComposer();
  renderLawyerControls();
  renderLawyerStudio();
  renderClientBoard();
  renderAdmin();
}

function renderHeader() {
  const country = getCountry(state.selectedCountryCode);
  elements.globalDisclaimer.textContent = country.disclaimer;
}

function renderHero() {
  elements.heroEyebrow.textContent = state.bootstrap.hero.eyebrow;
  elements.heroDescription.textContent = state.bootstrap.hero.description;

  const analytics = state.bootstrap.analytics;
  const cards = [
    ["Live countries", `${getEnabledCountries().length}`],
    ["Open matters", `${analytics.totalMatters}`],
    ["Bids submitted", `${analytics.totalBids}`],
    ["Verified lawyers", `${analytics.verifiedLawyers}`],
  ];

  elements.heroStats.innerHTML = cards
    .map(
      ([label, value]) => `
        <article class="metric-card">
          <p class="eyebrow">${label}</p>
          <p class="big-stat">${value}</p>
        </article>
      `,
    )
    .join("");

  elements.jurisdictionBadge.textContent = getCountry(state.selectedCountryCode).name;
}

function renderCountryRail() {
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
  populateCountrySelect(elements.countrySelect, state.selectedCountryCode);
  populatePracticeAreas();

  const country = getCountry(state.selectedCountryCode);
  const practiceArea = getPracticeArea(state.selectedPracticeAreaId);
  const template = getTemplate(state.selectedCountryCode, state.selectedPracticeAreaId);

  state.selectedCountryCode = country.code;
  state.selectedPracticeAreaId = practiceArea.id;
  elements.regionLabel.textContent = country.regionLabel;
  populateRegionSelect(elements.regionSelect, country, elements.regionSelect.value);
  elements.publishFee.textContent = `Publish for ${formatMoney(country.clientFee, country.currencyCode)}`;

  elements.templateSummary.innerHTML = `
    <p><strong>${template.label}</strong></p>
    <p>${template.terminology}</p>
    <p>${template.disclaimer}</p>
    <ul>${template.prompts.map((prompt) => `<li>${prompt}</li>`).join("")}</ul>
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

  elements.requiredUploads.innerHTML = template.uploads.map((item) => `<li>${item}</li>`).join("");
  renderHeader();
}

function renderLawyerControls() {
  populateCountrySelect(elements.lawyerCountrySelect, elements.lawyerCountrySelect.value || state.selectedCountryCode);
  renderLawyerRegionOptions();
  renderSelectedJurisdictions();
  elements.lawyerSelect.innerHTML = state.lawyers
    .map((lawyer) => `<option value="${lawyer.id}" ${lawyer.id === state.selectedLawyerId ? "selected" : ""}>${lawyer.name}</option>`)
    .join("");

  elements.lawyerRoster.innerHTML = state.lawyers
    .map((lawyer) => `
      <article class="roster-item">
        <strong>${lawyer.name}</strong>
        <span>${lawyer.firm || "Independent practice"}</span>
        <span>${lawyer.email}</span>
        <span>Status: ${lawyer.status}</span>
        <span>${lawyer.jurisdictions.join(", ")}</span>
      </article>
    `)
    .join("");
}

function renderLawyerStudio() {
  const lawyer = state.lawyers.find((entry) => entry.id === state.selectedLawyerId) || state.lawyers[0];
  if (!lawyer) {
    return;
  }

  state.selectedLawyerId = lawyer.id;
  const visibleCases = state.cases.filter((matter) => lawyer.jurisdictions.includes(`${matter.countryCode}:${matter.region}`));
  const currentCase = visibleCases.find((matter) => matter.id === elements.bidCaseSelect.value) || visibleCases[0];

  elements.bidCaseSelect.innerHTML = visibleCases.length
    ? visibleCases.map((matter) => `
        <option value="${matter.id}" ${currentCase?.id === matter.id ? "selected" : ""}>
          ${getCountry(matter.countryCode).name} · ${getPracticeArea(matter.practiceAreaId).label}
        </option>
      `).join("")
    : `<option value="">No visible matters</option>`;

  renderBidDefaults();
  renderCompliancePreview();
}

function renderBidDefaults() {
  const matter = state.cases.find((entry) => entry.id === elements.bidCaseSelect.value);
  if (!matter) {
    elements.feeType.placeholder = "Select a visible matter";
    return;
  }

  const country = getCountry(matter.countryCode);
  const practiceTemplate = getTemplate(matter.countryCode, matter.practiceAreaId);
  elements.feeType.placeholder = country.code === "US"
    ? "Contingency fee / hourly blend"
    : country.code === "AU"
      ? "Fixed fee + disbursements + GST"
      : "Fixed or staged fee";
  elements.disbursements.placeholder = practiceTemplate.terminology;
}

function renderCompliancePreview() {
  const matter = state.cases.find((entry) => entry.id === elements.bidCaseSelect.value);
  if (!matter) {
    elements.compliancePreview.innerHTML = "<li>Select a visible matter to preview conduct checks.</li>";
    elements.bidWordCount.textContent = "0 words";
    return;
  }

  const country = getCountry(matter.countryCode);
  const content = [
    elements.strategyPosition.value,
    elements.strategyNextSteps.value,
    elements.strategyRisks.value,
    elements.strategyTimeline.value,
  ].join(" ");

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  elements.bidWordCount.textContent = `${words} words`;

  const flags = country.bannedPhrases.filter((phrase) => content.toLowerCase().includes(phrase));
  const items = [
    `<li>Minimum strategy length: 200 words.</li>`,
    `<li>Four sections required: position, next steps, risks, timeline.</li>`,
    ...flags.map((flag) => `<li>${flag} is not permitted in ${country.name} copy.</li>`),
  ];
  if (!flags.length) {
    items.push(`<li>No prohibited wording currently detected for ${country.name}.</li>`);
  }
  elements.compliancePreview.innerHTML = items.join("");
}

function renderClientBoard() {
  elements.caseSelect.innerHTML = state.cases
    .map((matter) => `
      <option value="${matter.id}" ${matter.id === state.selectedCaseId ? "selected" : ""}>
        ${getCountry(matter.countryCode).name} · ${getPracticeArea(matter.practiceAreaId).label}
      </option>
    `)
    .join("");

  const matter = state.cases.find((entry) => entry.id === state.selectedCaseId) || state.cases[0];
  if (!matter) {
    elements.caseDetails.innerHTML = "<p>No matters published yet.</p>";
    elements.bidList.innerHTML = "";
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
    ? matterBids.map((bid) => renderBidCard(bid)).join("")
    : "<p>No bids yet for this matter.</p>";

  if (state.engagementLetter) {
    elements.engagementLetter.innerHTML = `
      <h4>${state.engagementLetter.heading}</h4>
      <p>${state.engagementLetter.body}</p>
    `;
  } else {
    elements.engagementLetter.innerHTML = "";
  }
}

function renderBidCard(bid) {
  const lawyer = state.lawyers.find((entry) => entry.id === bid.lawyerId);
  const shortlisted = state.bootstrap.store.decisions.shortlistedBidIds.includes(bid.id);
  const accepted = state.bootstrap.store.decisions.acceptedBidId === bid.id;

  return `
    <article class="bid-card">
      <div>
        <strong>${lawyer?.name || "Unknown lawyer"}</strong>
        <div class="case-meta">
          <span class="pill neutral">${bid.feeType}</span>
          <span class="pill neutral">${bid.totalFee || "Price on request"}</span>
          ${shortlisted ? '<span class="pill">Shortlisted</span>' : ""}
          ${accepted ? '<span class="pill">Accepted</span>' : ""}
        </div>
      </div>
      <p>${bid.sections.position}</p>
      <ul>
        <li><strong>Next steps:</strong> ${bid.sections.nextSteps}</li>
        <li><strong>Risks:</strong> ${bid.sections.risks}</li>
        <li><strong>Timeline:</strong> ${bid.sections.timeline}</li>
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
    .map(([label, value]) => `
      <article class="metric-card">
        <p class="eyebrow">${label}</p>
        <p class="big-stat">${value}</p>
      </article>
    `)
    .join("");

  elements.practiceAreaAnalytics.innerHTML = analytics.byPracticeArea
    .map((area) => `<p>${area.label}: <strong>${area.matters}</strong> matters</p>`)
    .join("");

  elements.verificationQueue.innerHTML = analytics.verificationQueue.length
    ? analytics.verificationQueue
        .map((lawyer) => `
          <article class="queue-item">
            <strong>${lawyer.name}</strong>
            <p>${lawyer.email}</p>
            <p>${lawyer.jurisdictions.join(", ")}</p>
            <button class="button primary" data-lawyer-id="${lawyer.id}">Approve lawyer</button>
          </article>
        `)
        .join("")
    : "<p>Verification queue is clear.</p>";
}

function populateCountrySelect(select, selectedValue) {
  select.innerHTML = getEnabledCountries()
    .map((country) => `<option value="${country.code}" ${country.code === selectedValue ? "selected" : ""}>${country.name}</option>`)
    .join("");
}

function populatePracticeAreas() {
  elements.practiceAreaSelect.innerHTML = state.bootstrap.practiceAreas
    .map((area) => `<option value="${area.id}" ${area.id === state.selectedPracticeAreaId ? "selected" : ""}>${area.label}</option>`)
    .join("");
}

function populateRegionSelect(select, country, selectedValue) {
  const fallback = selectedValue && country.regions.includes(selectedValue) ? selectedValue : country.regions[0];
  select.innerHTML = country.regions.map((region) => `<option value="${region}" ${region === fallback ? "selected" : ""}>${region}</option>`).join("");
}

function renderLawyerRegionOptions() {
  const country = getCountry(elements.lawyerCountrySelect.value || state.selectedCountryCode);
  populateRegionSelect(elements.lawyerRegionSelect, country, elements.lawyerRegionSelect.value);
}

function addJurisdiction() {
  const jurisdiction = `${elements.lawyerCountrySelect.value}:${elements.lawyerRegionSelect.value}`;
  if (!state.pendingJurisdictions.includes(jurisdiction)) {
    state.pendingJurisdictions.push(jurisdiction);
  }
  renderSelectedJurisdictions();
}

function renderSelectedJurisdictions() {
  elements.selectedJurisdictions.innerHTML = state.pendingJurisdictions.length
    ? state.pendingJurisdictions
        .map((entry) => `
          <span class="selected-chip">
            ${entry}
            <button type="button" data-jurisdiction="${entry}">×</button>
          </span>
        `)
        .join("")
    : "<span class='eyebrow'>No jurisdictions added yet.</span>";

  elements.selectedJurisdictions.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.pendingJurisdictions = state.pendingJurisdictions.filter((entry) => entry !== button.dataset.jurisdiction);
      renderSelectedJurisdictions();
    });
  });
}

async function submitMatter(event) {
  event.preventDefault();
  const template = getTemplate(elements.countrySelect.value, elements.practiceAreaSelect.value);
  const formData = new FormData(elements.matterForm);
  const customAnswers = {};

  template.prompts.forEach((prompt) => {
    customAnswers[prompt] = formData.get(`prompt:${prompt}`) || "";
  });

  const payload = {
    clientName: formData.get("clientName"),
    email: formData.get("email"),
    countryCode: formData.get("countryCode"),
    region: formData.get("region"),
    practiceAreaId: formData.get("practiceAreaId"),
    quoteMode: formData.get("quoteMode"),
    summary: formData.get("summary"),
    budget: formData.get("budget"),
    documents: splitList(formData.get("documents")),
    customAnswers,
  };

  try {
    const response = await request("/api/cases", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    showToast(response.message);
    elements.matterForm.reset();
    state.selectedCaseId = response.case.id;
    renderMatterComposer();
    await refreshApp();
  } catch (error) {
    showToast(error.message);
  }
}

async function submitLawyer(event) {
  event.preventDefault();
  const formData = new FormData(elements.lawyerForm);
  const payload = {
    name: formData.get("name"),
    email: formData.get("email"),
    firm: formData.get("firm"),
    jurisdictions: state.pendingJurisdictions,
    certificateRefs: splitList(formData.get("certificateRefs")),
  };

  try {
    const response = await request("/api/lawyers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    showToast(response.message);
    elements.lawyerForm.reset();
    state.pendingJurisdictions = [];
    state.selectedLawyerId = response.lawyer.id;
    renderSelectedJurisdictions();
    await refreshApp();
  } catch (error) {
    showToast(error.message);
  }
}

async function submitBid(event) {
  event.preventDefault();
  const payload = {
    lawyerId: elements.lawyerSelect.value,
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
  };

  try {
    const response = await request("/api/bids", {
      method: "POST",
      body: JSON.stringify(payload),
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
  if (!button) {
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
  if (!button) {
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
  if (!button) {
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

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
  elements.statusToast.textContent = message;
  elements.statusToast.classList.add("is-visible");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.statusToast.classList.remove("is-visible");
  }, 2400);
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
