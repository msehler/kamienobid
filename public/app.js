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
  clientView: "marketing",
  editingCaseId: null,
};

const elements = {};
const STORED_USER_KEY = "kamieno.rememberedUser";

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  applyNavigationFocus();
  applySignupRolePrefill();
  applyAccountPageMode();
  bindEvents();
  initMobileNav();
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
    "signupFirstName",
    "signupLastName",
    "signupRole",
    "loginForm",
    "logoutButton",
    "accountHeroSection",
    "accountHeroEyebrow",
    "accountHeroTitle",
    "accountHeroSummary",
    "accountHeroPills",
    "accountHeroSecondaryEyebrow",
    "accountHeroNotes",
    "accountWorkspaceEyebrow",
    "accountWorkspaceTitle",
    "signupPanelTitle",
    "signupPanelPill",
    "signupSubmitLabel",
    "signupHotButton",
    "accountInsightEyebrow",
    "accountInsightBody",
    "accountPrimaryColumn",
    "accountSignedInPanel",
    "accountStatusPanelTitle",
    "countryInsights",
    "clientMarketingHero",
    "clientMarketingDetails",
    "clientDashboard",
    "clientCreateCaseButton",
    "clientComposer",
    "matterForm",
    "matterFormTitle",
    "matterFormPill",
    "matterAccessNote",
    "matterSubmitButton",
    "caseName",
    "countrySelect",
    "regionSelect",
    "regionLabel",
    "practiceAreaSelect",
    "quoteModeSelect",
    "promptFields",
    "requiredUploads",
    "templateSummary",
    "paymentFlowSummary",
    "matterSummary",
    "budgetInput",
    "documentNames",
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
    "caseList",
    "clientBoardAccess",
    "caseDetails",
    "dashboardCaseStatusPill",
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
  [elements.signupFirstName, elements.signupLastName].filter(Boolean).forEach((field) => {
    field.addEventListener("input", handleSignupNameInput);
    field.addEventListener("blur", handleSignupNameInput);
  });

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
  if (elements.clientCreateCaseButton) {
    elements.clientCreateCaseButton.addEventListener("click", () => openMatterComposer());
  }
  [elements.caseList, elements.caseDetails].filter(Boolean).forEach((container) => {
    container.addEventListener("click", handleClientCaseAction);
  });

  if (elements.signupForm) {
    elements.signupForm.addEventListener("submit", submitSignup);
  }
  if (elements.signupHotButton) {
    elements.signupHotButton.addEventListener("click", submitHotSignup);
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

function applyNavigationFocus() {
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role");
  const path = window.location.pathname;
  const currentHrefByPath = {
    "/about": "/about",
    "/contact": "/contact",
    "/client": "/client",
    "/lawyer": "/account?role=lawyer",
  };

  const currentHref = path === "/account" ? (role === "lawyer" ? "/account?role=lawyer" : "/account") : currentHrefByPath[path];

  ["/client", "/about", "/contact", "/account", "/account?role=lawyer"].forEach((href) => {
    document.querySelectorAll(`a[href="${href}"]`).forEach((link) => {
      if (href === currentHref) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  });
}

function initMobileNav() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".mobile-nav-toggle");
  const panel = document.querySelector(".mobile-nav-panel");

  if (!header || !toggle || !panel) {
    return;
  }

  const closeMenu = () => {
    header.classList.remove("mobile-nav-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
    panel.hidden = true;
  };

  const openMenu = () => {
    header.classList.add("mobile-nav-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close navigation");
    panel.hidden = false;
  };

  toggle.addEventListener("click", () => {
    if (panel.hidden) {
      openMenu();
    } else {
      closeMenu();
    }
  });

  panel.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      closeMenu();
    }
  });

  document.addEventListener("click", (event) => {
    if (!panel.hidden && !header.contains(event.target)) {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900 && !panel.hidden) {
      closeMenu();
    }
  });
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

function applyAccountPageMode() {
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role");
  const mode = params.get("mode");

  if (role === "lawyer") {
    if (elements.accountHeroEyebrow) {
      elements.accountHeroEyebrow.textContent = "Lawyer registration";
    }
    if (elements.accountHeroTitle) {
      elements.accountHeroTitle.innerHTML = 'Register your practice for <span>the right matters.</span>';
    }
    if (elements.accountHeroSummary) {
      elements.accountHeroSummary.textContent = "Create your Kamieno lawyer account so you can verify your jurisdictions, receive relevant opportunities, and submit structured proposals to clients looking for the right legal fit.";
    }
    if (elements.accountHeroPills) {
      elements.accountHeroPills.innerHTML = `
        <span class="tag-pill">Practice profile</span>
        <span class="tag-pill">Jurisdiction verification</span>
        <span class="tag-pill">Bid on matched matters</span>
      `;
    }
    if (elements.accountHeroSecondaryEyebrow) {
      elements.accountHeroSecondaryEyebrow.textContent = "What happens next";
    }
    if (elements.accountHeroNotes) {
      elements.accountHeroNotes.innerHTML = `
        <p>Create your lawyer account with your name, email, and secure password.</p>
        <p>Complete your practice and jurisdiction details so Kamieno can verify where you are eligible to act.</p>
        <p>Once approved, you can respond to suitable matters with pricing and a clear proposed approach.</p>
      `;
    }
    if (elements.accountWorkspaceEyebrow) {
      elements.accountWorkspaceEyebrow.textContent = "Lawyer onboarding";
    }
    if (elements.accountWorkspaceTitle) {
      elements.accountWorkspaceTitle.textContent = "Start your Kamieno lawyer account here, then complete verification and bidding from your lawyer workspace.";
    }
    if (elements.signupPanelTitle) {
      elements.signupPanelTitle.textContent = "Register as a lawyer";
    }
    if (elements.signupPanelPill) {
      elements.signupPanelPill.textContent = "Lawyer account";
    }
    if (elements.signupSubmitLabel) {
      elements.signupSubmitLabel.textContent = "Create lawyer account";
    }
    if (elements.accountInsightEyebrow) {
      elements.accountInsightEyebrow.textContent = "Why lawyers join";
    }
    if (elements.accountInsightBody) {
      elements.accountInsightBody.textContent = "Kamieno is designed to help lawyers compete on relevance, jurisdiction fit, and quality of approach before a client makes first contact. After registration, complete your profile in the lawyer workspace to enter verification.";
    }
    return;
  }

  if (mode === "signin") {
    if (elements.accountHeroEyebrow) {
      elements.accountHeroEyebrow.textContent = "Client sign in";
    }
    if (elements.accountHeroTitle) {
      elements.accountHeroTitle.innerHTML = 'Sign in to your client dashboard <span>and continue your cases.</span>';
    }
    if (elements.accountHeroSummary) {
      elements.accountHeroSummary.textContent = "Use your Kamieno client account to review existing matters, add a new case from the dashboard, and continue any draft that still needs payment.";
    }
    if (elements.accountWorkspaceEyebrow) {
      elements.accountWorkspaceEyebrow.textContent = "Client access";
    }
    if (elements.accountWorkspaceTitle) {
      elements.accountWorkspaceTitle.textContent = "Sign in to open your client dashboard. If you are new here, you can still create a client account below.";
    }
    if (elements.loginForm && elements.signupForm) {
      elements.loginForm.style.order = "-1";
      elements.signupForm.style.order = "1";
    }
  }
}

async function refreshApp() {
  try {
    const bootstrap = await request("/api/bootstrap");
    state.bootstrap = bootstrap;
    state.currentUser = bootstrap.currentUser || getStoredUser();

    const [cases, lawyers, bids, admin] = await Promise.all([
      request("/api/cases"),
      request("/api/lawyers"),
      safeRequest("/api/bids", []),
      state.currentUser?.role === "admin" ? request("/api/admin") : Promise.resolve(null),
    ]);

    state.cases = bootstrap.currentUser ? cases : filterCasesForStoredUser(cases, state.currentUser);
    state.lawyers = lawyers;
    state.bids = bootstrap.currentUser ? bids : [];
    state.admin = admin;

    if (bootstrap.currentUser) {
      storeUser(bootstrap.currentUser);
    } else if (!state.currentUser) {
      clearStoredUser();
    }

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
  const caseId = params.get("caseId");
  if (state.checkoutHandled || !checkoutStatus) {
    return;
  }
  state.checkoutHandled = true;
  state.clientView = state.currentUser?.role === "client" ? "dashboard" : state.clientView;
  state.editingCaseId = null;
  if (caseId) {
    state.selectedCaseId = caseId;
  }

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
  const params = new URLSearchParams(window.location.search);
  state.selectedCountryCode = enabledCountries.some((country) => country.code === state.selectedCountryCode)
    ? state.selectedCountryCode
    : detectedCountry || enabledCountries[0]?.code || "AU";
  state.selectedPracticeAreaId = state.selectedPracticeAreaId || state.bootstrap.practiceAreas[0]?.id;
  state.selectedCaseId = state.cases.some((matter) => matter.id === state.selectedCaseId)
    ? state.selectedCaseId
    : state.cases[0]?.id || null;
  if (state.currentUser?.role === "client") {
    state.clientView = params.get("view") === "composer" || state.clientView === "composer" ? "composer" : "dashboard";
  } else {
    state.clientView = "marketing";
    state.editingCaseId = null;
  }
}

function renderAll() {
  renderHeader();
  renderHero();
  renderAuth();
  renderCountryRail();
  renderClientExperience();
  renderLawyerStudio();
  renderAdmin();
}

function renderHeader() {
  const country = getCountry(state.selectedCountryCode);
  const pathname = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const isClientSignedIn = state.currentUser?.role === "client";
  if (elements.globalDisclaimer) {
    elements.globalDisclaimer.textContent = country.disclaimer;
  }
  document.querySelectorAll("[data-region-badge] strong").forEach((badge) => {
    badge.textContent = country.name;
  });
  if (elements.authQuick) {
    elements.authQuick.innerHTML = state.currentUser
      ? `<span class="pill">${state.currentUser.role}</span><span>${state.currentUser.name}</span>`
      : `<a class="button ghost" href="/account">Sign in</a>`;
  }

  document.querySelectorAll(".main-nav-primary, .mobile-nav-primary").forEach((container) => {
    if (isClientSignedIn) {
      const dashboardCurrent =
        pathname === "/client" && (params.get("view") === "dashboard" || !params.get("view")) ? ' aria-current="page"' : "";
      const myAccountCurrent = pathname === "/account" ? ' aria-current="page"' : "";
      container.innerHTML = `
        <a href="/client?view=dashboard"${dashboardCurrent}>Dashboard</a>
        <a href="/account"${myAccountCurrent}>My account</a>
      `;
      return;
    }

    if (!state.currentUser) {
      container.innerHTML = getPublicPrimaryNavMarkup(pathname);
      return;
    }

    const accountLink = container.querySelector('a[href="/account"]');
    if (state.currentUser && accountLink) {
      accountLink.textContent = "Logout";
      accountLink.setAttribute("href", "#logout");
      accountLink.setAttribute("data-nav-logout", "true");
      return;
    }

    if (accountLink) {
      accountLink.textContent = "Sign in";
      accountLink.setAttribute("href", "/account");
      accountLink.removeAttribute("data-nav-logout");
    }
  });

  document.querySelectorAll(".main-nav-secondary, .mobile-nav-secondary").forEach((container) => {
    if (isClientSignedIn) {
      container.innerHTML = `
        <a class="button secondary nav-user-label" href="${getDashboardPath(state.currentUser)}">Signed in as ${state.currentUser.name}</a>
        <a href="#logout" data-nav-logout="true">Logout</a>
        <span class="header-jurisdiction-chip" data-region-badge>Detected region: <strong></strong></span>
      `;
      return;
    }

    if (!state.currentUser) {
      container.innerHTML = getPublicSecondaryNavMarkup(pathname);
      return;
    }

    document.querySelectorAll(".nav-user-label").forEach((node) => node.remove());
  });

  document.querySelectorAll("[data-region-badge] strong").forEach((badge) => {
    badge.textContent = country.name;
  });

  document.querySelectorAll("[data-nav-logout]").forEach((link) => {
    link.onclick = async (event) => {
      event.preventDefault();
      await submitLogout();
    };
  });
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
  if (
    !elements.sessionCard ||
    !elements.stripeStatus ||
    !elements.signupForm ||
    !elements.loginForm ||
    !elements.logoutButton ||
    !elements.accountSignedInPanel
  ) {
    return;
  }
  const user = state.currentUser;
  const isAccountPage = window.location.pathname === "/account";
  elements.stripeStatus.textContent = state.bootstrap.stripeReady ? "Stripe ready" : "Demo checkout";

  if (user && isAccountPage) {
    if (elements.accountHeroSection) {
      elements.accountHeroSection.hidden = true;
    }
    if (elements.accountWorkspaceEyebrow) {
      elements.accountWorkspaceEyebrow.textContent = "My account";
    }
    if (elements.accountWorkspaceTitle) {
      elements.accountWorkspaceTitle.hidden = true;
    }
    if (elements.accountStatusPanelTitle) {
      elements.accountStatusPanelTitle.textContent = "About this screen";
    }
    elements.stripeStatus.style.display = "none";
    elements.accountSignedInPanel.hidden = false;
    elements.accountSignedInPanel.innerHTML = `
      <article class="panel account-summary-panel">
        <div class="panel-header">
          <h3>My account</h3>
          <span class="pill neutral">${user.role}</span>
        </div>
        <div class="template-summary account-summary">
          <p><strong>${user.name}</strong></p>
          <p>${user.email}</p>
          <p>Role: ${user.role}</p>
          <p>Status: ${user.status}</p>
          ${user.jurisdictions?.length ? `<p>Jurisdictions: ${user.jurisdictions.join(", ")}</p>` : "<p>No jurisdictions on file yet.</p>"}
        </div>
      </article>
    `;
    elements.sessionCard.innerHTML = `
      <p><strong>This page shows your core Kamieno profile details.</strong></p>
      <p>Use it to confirm the name, email, role, and account status tied to your signed-in account.</p>
      <p>${user.role === "client" ? "When you are ready to work on a matter, return to your dashboard from the signed-in link and create a new case there." : "If you are a lawyer, this page confirms your account role and current verification state before you continue into your profile workflow."}</p>
    `;
    if (elements.accountInsightEyebrow) {
      elements.accountInsightEyebrow.textContent = "What to do next";
    }
    if (elements.accountInsightBody) {
      elements.accountInsightBody.textContent = user.role === "client"
        ? "Use the signed-in menu to return to your dashboard, create a new case, or sign out when you are finished."
        : "Use the signed-in menu to return to your lawyer workspace, review your account details here, or sign out when you are finished.";
    }
  } else {
    if (elements.accountHeroSection) {
      elements.accountHeroSection.hidden = false;
    }
    if (elements.accountWorkspaceTitle) {
      elements.accountWorkspaceTitle.hidden = false;
    }
    if (elements.accountStatusPanelTitle) {
      elements.accountStatusPanelTitle.textContent = "Your account status";
    }
    elements.stripeStatus.style.display = "";
    elements.accountSignedInPanel.hidden = true;
    elements.accountSignedInPanel.innerHTML = "";
    elements.sessionCard.innerHTML = `
      <p><strong>Public preview</strong></p>
      <p>Create a client or lawyer account to use the workflow. Admin access is provisioned separately.</p>
    `;
  }

  elements.signupForm.style.display = user && isAccountPage ? "none" : "";
  elements.loginForm.style.display = user && isAccountPage ? "none" : "";
  elements.logoutButton.style.display = user && isAccountPage ? "none" : user ? "" : "none";
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

function renderClientExperience() {
  const isClientPage = window.location.pathname === "/client";
  if (!isClientPage) {
    renderMatterComposer();
    renderClientBoard();
    return;
  }

  const isClient = state.currentUser?.role === "client";
  const showMarketing = !isClient;
  const showDashboard = isClient && state.clientView === "dashboard";
  const showComposer = isClient && state.clientView === "composer";

  if (elements.clientMarketingHero) {
    elements.clientMarketingHero.hidden = !showMarketing;
  }
  if (elements.clientMarketingDetails) {
    elements.clientMarketingDetails.hidden = !showMarketing;
  }
  if (elements.clientDashboard) {
    elements.clientDashboard.hidden = !showDashboard;
  }
  if (elements.clientComposer) {
    elements.clientComposer.hidden = !showComposer;
  }

  renderMatterComposer();
  renderClientBoard();

  if (isClient && !showDashboard && !showComposer) {
    state.clientView = "dashboard";
    if (elements.clientMarketingHero) {
      elements.clientMarketingHero.hidden = true;
    }
    if (elements.clientMarketingDetails) {
      elements.clientMarketingDetails.hidden = true;
    }
    if (elements.clientDashboard) {
      elements.clientDashboard.hidden = false;
    }
  }
}

function openMatterComposer(caseId = null) {
  if (state.currentUser?.role !== "client") {
    window.location.assign("/account?role=client&returnTo=%2Fclient");
    return;
  }

  state.clientView = "composer";
  state.editingCaseId = caseId;

  if (caseId) {
    const matter = state.cases.find((entry) => entry.id === caseId);
    if (!matter) {
      showToast("That case could not be loaded.");
      return;
    }
    state.selectedCaseId = matter.id;
    state.selectedCountryCode = matter.countryCode;
    state.selectedPracticeAreaId = matter.practiceAreaId;
  } else {
    elements.matterForm?.reset();
  }

  renderClientExperience();

  if (caseId) {
    populateMatterFormFromCase(state.cases.find((entry) => entry.id === caseId));
  } else {
    prepareNewMatterForm();
  }

  elements.clientComposer?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeMatterComposer() {
  state.clientView = state.currentUser?.role === "client" ? "dashboard" : "marketing";
  state.editingCaseId = null;
  renderClientExperience();
  elements.clientDashboard?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function prepareNewMatterForm() {
  if (!elements.matterForm) {
    return;
  }
  elements.matterForm.reset();
  state.editingCaseId = null;
  renderMatterComposer();
  if (elements.quoteModeSelect) {
    elements.quoteModeSelect.value = "Detailed";
  }
  if (elements.documentNames) {
    elements.documentNames.value = "";
  }
  if (elements.matterSummary) {
    elements.matterSummary.value = "";
  }
  if (elements.budgetInput) {
    elements.budgetInput.value = "";
  }
  if (elements.caseName) {
    elements.caseName.value = "";
  }
}

function populateMatterFormFromCase(matter) {
  if (!matter || !elements.matterForm) {
    return;
  }
  state.selectedCountryCode = matter.countryCode;
  state.selectedPracticeAreaId = matter.practiceAreaId;
  renderMatterComposer();

  if (elements.regionSelect) {
    elements.regionSelect.value = matter.region;
  }
  if (elements.caseName) {
    elements.caseName.value = matter.caseName || "";
  }
  if (elements.quoteModeSelect) {
    elements.quoteModeSelect.value = matter.quoteMode || "Detailed";
  }
  if (elements.matterSummary) {
    elements.matterSummary.value = matter.summary || "";
  }
  if (elements.budgetInput) {
    elements.budgetInput.value = matter.budget || "";
  }
  if (elements.documentNames) {
    elements.documentNames.value = (matter.documents || []).join(", ");
  }

  Array.from(elements.promptFields?.querySelectorAll("textarea") || []).forEach((field) => {
    const prompt = field.name.replace(/^prompt:/, "");
    field.value = matter.customAnswers?.[prompt] || "";
  });
}

function renderMatterComposer() {
  if (
    !elements.countrySelect ||
    !elements.practiceAreaSelect ||
    !elements.regionLabel ||
    !elements.regionSelect ||
    !elements.templateSummary ||
    !elements.paymentFlowSummary ||
    !elements.promptFields ||
    !elements.requiredUploads ||
    !elements.matterAccessNote ||
    !elements.matterForm ||
    !elements.matterSubmitButton ||
    !elements.matterFormTitle ||
    !elements.matterFormPill ||
    !elements.clientName ||
    !elements.clientEmail ||
    !elements.caseName
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
  elements.templateSummary.innerHTML = `
    <p><strong>${template.label}</strong></p>
    <p>${template.terminology}</p>
    <p>${template.disclaimer}</p>
    <ul>${template.prompts.map((prompt) => `<li>${prompt}</li>`).join("")}</ul>
  `;
  elements.paymentFlowSummary.innerHTML = `
    <p class="eyebrow">Publishing flow</p>
    <p>Save your draft first, then add it to cart from your dashboard when you are ready for checkout and payment.</p>
  `;
  elements.caseName.placeholder = buildCaseNamePlaceholder(state.currentUser?.name);
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
  const editingMatter = state.cases.find((entry) => entry.id === state.editingCaseId) || null;

  elements.matterFormTitle.textContent = editingMatter ? "Edit your case" : "Create your case";
  elements.matterFormPill.textContent = editingMatter ? "Existing case" : "New draft";
  elements.matterSubmitButton.textContent = editingMatter
    ? String(editingMatter.paymentStatus).startsWith("paid")
      ? "Save case changes"
      : "Save draft changes"
    : "Save draft";
  elements.matterAccessNote.hidden = isClient;
  elements.matterAccessNote.innerHTML = isClient ? "" : `<p>Sign in as a client to create and publish a matter.</p>`;
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
  if (
    !elements.clientBoardAccess ||
    !elements.clientCreateCaseButton ||
    !elements.caseList ||
    !elements.caseDetails ||
    !elements.bidList ||
    !elements.engagementLetter
  ) {
    return;
  }
  const isClient = state.currentUser?.role === "client";
  elements.clientBoardAccess.innerHTML = isClient
    ? "<p>Manage your case drafts, published matters, and proposal decisions from one client dashboard.</p>"
    : "<p>Sign in as a client to view your dashboard.</p>";
  elements.clientCreateCaseButton.hidden = !isClient || !state.cases.length;

  if (!isClient) {
    elements.caseList.innerHTML = "";
    elements.caseDetails.innerHTML = "";
    elements.bidList.innerHTML = "";
    elements.engagementLetter.innerHTML = "";
    if (elements.dashboardCaseStatusPill) {
      elements.dashboardCaseStatusPill.textContent = "Case view";
    }
    return;
  }

  if (!state.cases.length) {
    elements.caseList.innerHTML = `
      <div class="case-empty">
        <p><strong>No cases yet.</strong></p>
        <p>Create your first case from this dashboard when you are ready to brief it.</p>
        <button class="button primary" type="button" data-case-action="create">Add new case</button>
      </div>
    `;
    elements.caseDetails.innerHTML = "<p>Select a case to review its details, or create a new one to get started.</p>";
    elements.bidList.innerHTML = "<p>No lawyer proposals yet.</p>";
    elements.engagementLetter.innerHTML = "";
    if (elements.dashboardCaseStatusPill) {
      elements.dashboardCaseStatusPill.textContent = "No cases";
    }
    return;
  }

  const matter = state.cases.find((entry) => entry.id === state.selectedCaseId) || state.cases[0];
  if (!matter) {
    return;
  }
  state.selectedCaseId = matter.id;
  const template = getTemplate(matter.countryCode, matter.practiceAreaId);
  const matterBids = state.bids.filter((bid) => bid.caseId === matter.id);
  const canDelete = matter.status !== "engaged" && !matter.acceptedBidId;
  const needsPayment = !String(matter.paymentStatus).startsWith("paid");

  elements.caseList.innerHTML = state.cases
    .map((entry) => {
      const selected = entry.id === matter.id;
      const needsPayment = !String(entry.paymentStatus).startsWith("paid");
      return `
        <article class="case-card ${selected ? "is-selected" : ""}" data-case-action="select" data-case-id="${entry.id}">
          <div class="case-card-header">
            <div>
              <p class="eyebrow">${getCountry(entry.countryCode).name}</p>
              <strong>${entry.caseName || getPracticeArea(entry.practiceAreaId).label}</strong>
            </div>
            <span class="pill neutral">${needsPayment ? "Draft" : "Published"}</span>
          </div>
          <p class="case-card-summary">${entry.summary}</p>
          <div class="case-meta">
            <span class="pill neutral">${entry.region}</span>
            <span class="pill neutral">${entry.quoteMode}</span>
            <span class="pill neutral">${needsPayment ? "Ready for checkout" : entry.status}</span>
          </div>
          <div class="case-card-actions">
            <button class="button secondary" type="button" data-case-action="edit" data-case-id="${entry.id}">Edit</button>
            <button class="button ghost" type="button" data-case-action="delete" data-case-id="${entry.id}" ${entry.status === "engaged" || entry.acceptedBidId ? "disabled" : ""}>Delete</button>
            ${needsPayment ? `<button class="button primary" type="button" data-case-action="publish" data-case-id="${entry.id}">Add to cart</button>` : ""}
          </div>
        </article>
      `;
    })
    .join("");

  if (elements.dashboardCaseStatusPill) {
    elements.dashboardCaseStatusPill.textContent = needsPayment ? "Draft" : matter.status;
  }

  elements.caseDetails.innerHTML = `
    <p><strong>${matter.caseName || getPracticeArea(matter.practiceAreaId).label}</strong></p>
    <p class="eyebrow">${getPracticeArea(matter.practiceAreaId).label}</p>
    <p>${matter.summary}</p>
    <div class="case-meta">
      <span class="pill neutral">${getCountry(matter.countryCode).name}</span>
      <span class="pill neutral">${matter.region}</span>
      <span class="pill neutral">${matter.quoteMode}</span>
      <span class="pill neutral">${matter.status}</span>
      <span class="pill neutral">${matter.paymentStatus}</span>
    </div>
    <div class="case-primary-actions">
      <button class="button secondary" type="button" data-case-action="edit" data-case-id="${matter.id}">Edit</button>
      <button class="button ghost" type="button" data-case-action="delete" data-case-id="${matter.id}" ${canDelete ? "" : "disabled"}>Delete</button>
      ${needsPayment ? `<button class="button primary" type="button" data-case-action="publish" data-case-id="${matter.id}">Add to cart</button>` : ""}
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

async function handleClientCaseAction(event) {
  const control = event.target.closest("[data-case-action]");
  if (!control || state.currentUser?.role !== "client") {
    return;
  }
  if (typeof control.matches === "function" && control.matches(":disabled")) {
    return;
  }

  const action = control.dataset.caseAction;
  const caseId = control.dataset.caseId;

  if (action === "create") {
    openMatterComposer();
    return;
  }

  if (action === "select") {
    state.selectedCaseId = caseId;
    renderClientBoard();
    return;
  }

  if (action === "edit") {
    openMatterComposer(caseId);
    return;
  }

  if (action === "publish") {
    await continueCaseCheckout(caseId);
    return;
  }

  if (action === "delete") {
    const matter = state.cases.find((entry) => entry.id === caseId);
    if (!matter) {
      return;
    }
    const confirmed = window.confirm(`Delete this case: ${getPracticeArea(matter.practiceAreaId).label}?`);
    if (!confirmed) {
      return;
    }
    try {
      const response = await request("/api/cases", {
        method: "DELETE",
        body: JSON.stringify({ caseId }),
      });
      showToast(response.message);
      if (state.selectedCaseId === caseId) {
        state.selectedCaseId = null;
      }
      state.engagementLetter = null;
      state.clientView = "dashboard";
      state.editingCaseId = null;
      await refreshApp();
    } catch (error) {
      showToast(error.message);
    }
  }
}

async function continueCaseCheckout(caseId) {
  try {
    const checkout = await request("/api/payments", {
      method: "POST",
      body: JSON.stringify({
        action: "create-checkout",
        caseId,
        returnPath: "/client",
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
  const firstName = normalizeNamePart(formData.get("firstName"));
  const lastName = normalizeNamePart(formData.get("lastName"));
  await performSignup({
    firstName,
    lastName,
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
}

async function submitHotSignup() {
  const payload = buildDummySignupPayload();
  if (elements.signupFirstName) {
    elements.signupFirstName.value = payload.firstName;
  }
  if (elements.signupLastName) {
    elements.signupLastName.value = payload.lastName;
  }
  const signupEmail = document.getElementById("signupEmail");
  const signupPassword = document.getElementById("signupPassword");
  if (signupEmail) {
    signupEmail.value = payload.email;
  }
  if (signupPassword) {
    signupPassword.value = payload.password;
  }
  if (elements.signupRole) {
    elements.signupRole.value = payload.role;
  }
  await performSignup(payload);
}

async function performSignup({ firstName, lastName, email, password, role }) {
  try {
    if (elements.signupFirstName) {
      elements.signupFirstName.value = firstName;
    }
    if (elements.signupLastName) {
      elements.signupLastName.value = lastName;
    }
    const response = await request("/api/auth", {
      method: "POST",
      body: JSON.stringify({
        action: "signup",
        name: [firstName, lastName].filter(Boolean).join(" "),
        email,
        password,
        role,
      }),
    });
    showToast(response.message);
    storeUser(response.user);
    elements.signupForm.reset();
    if (redirectAfterAuth(response.user, role)) {
      return;
    }
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
    storeUser(response.user);
    elements.loginForm.reset();
    if (redirectAfterAuth(response.user)) {
      return;
    }
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
    state.clientView = "marketing";
    state.editingCaseId = null;
    clearStoredUser();
    showToast(response.message);
    await refreshApp();
  } catch (error) {
    showToast(error.message);
  }
}

async function submitMatter(event) {
  event.preventDefault();
  if (state.currentUser?.role !== "client") {
    showToast("Client login required to save a draft.");
    return;
  }

  const template = getTemplate(elements.countrySelect.value, elements.practiceAreaSelect.value);
  const formData = new FormData(elements.matterForm);
  const customAnswers = {};
  template.prompts.forEach((prompt) => {
    customAnswers[prompt] = formData.get(`prompt:${prompt}`) || "";
  });

  try {
    const payload = {
      caseId: state.editingCaseId,
      caseName: formData.get("caseName"),
      countryCode: formData.get("countryCode"),
      region: formData.get("region"),
      practiceAreaId: formData.get("practiceAreaId"),
      quoteMode: formData.get("quoteMode"),
      summary: formData.get("summary"),
      budget: formData.get("budget"),
      documents: splitList(formData.get("documents")),
      customAnswers,
    };
    const response = await request("/api/cases", {
      method: state.editingCaseId ? "PUT" : "POST",
      body: JSON.stringify({
        ...payload,
      }),
    });
    const matter = response.case;
    state.selectedCaseId = matter.id;
    state.editingCaseId = null;
    state.clientView = "dashboard";
    showToast(response.message);
    await refreshApp();
    elements.clientDashboard?.scrollIntoView({ behavior: "smooth", block: "start" });
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

function normalizeNamePart(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s'-])\p{L}/gu, (match) => match.toUpperCase());
}

function buildCaseNamePlaceholder(clientName) {
  const plaintiff = String(clientName || "").trim() || "Taylor Shaw";
  return `e.g. ${plaintiff} -v- John Smith`;
}

function handleSignupNameInput(event) {
  if (!event?.target) {
    return;
  }
  const normalized = normalizeNamePart(event.target.value);
  if (event.target.value !== normalized) {
    event.target.value = normalized;
  }
}

function buildDummySignupPayload() {
  const token = Date.now().toString(36);
  return {
    firstName: "Demo",
    lastName: `Client ${token.slice(-4).toUpperCase()}`,
    email: `demo.client.${token}@kamieno.local`,
    password: "DemoClient2026!",
    role: "client",
  };
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

function redirectAfterAuth(user, preferredRole) {
  const target = getPostAuthPath(user, preferredRole);
  if (!target || target === window.location.pathname) {
    return false;
  }
  window.location.assign(target);
  return true;
}

function getPostAuthPath(user, preferredRole) {
  const params = new URLSearchParams(window.location.search);
  const returnTo = normalizeInternalPath(params.get("returnTo"));
  if (returnTo) {
    return returnTo === "/client" ? "/client?view=dashboard" : returnTo;
  }

  const role = preferredRole || user?.role;
  if (role === "client") {
    return "/client?view=dashboard";
  }
  if (role === "lawyer") {
    return "/lawyer";
  }
  return "/account";
}

function getDashboardPath(user) {
  if (user?.role === "client") {
    return "/client?view=dashboard";
  }
  if (user?.role === "lawyer") {
    return "/lawyer";
  }
  return "/account";
}

function getPublicPrimaryNavMarkup(pathname) {
  const clientCurrent = pathname === "/client" ? ' aria-current="page"' : "";
  const aboutCurrent = pathname === "/about" ? ' aria-current="page"' : "";
  const contactCurrent = pathname === "/contact" ? ' aria-current="page"' : "";
  const accountCurrent = pathname === "/account" ? ' aria-current="page"' : "";
  return `
    <a class="main-nav-cta" href="/client"${clientCurrent}>Post a new case</a>
    <a href="/about"${aboutCurrent}>About us</a>
    <a href="/contact"${contactCurrent}>Contact us</a>
    <a href="/account"${accountCurrent}>Sign in</a>
  `;
}

function getPublicSecondaryNavMarkup(pathname) {
  const lawyerCurrent = pathname === "/lawyer" ? ' aria-current="page"' : "";
  return `
    <a href="/account?role=lawyer"${lawyerCurrent}>Register as a lawyer</a>
    <span class="header-jurisdiction-chip" data-region-badge>Detected region: <strong></strong></span>
  `;
}

function normalizeInternalPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value.replace(/[\r\n]/g, "") || null;
}

function getStoredUser() {
  try {
    const raw = window.localStorage.getItem(STORED_USER_KEY);
    if (!raw) {
      return null;
    }
    const user = JSON.parse(raw);
    return user && typeof user === "object" ? user : null;
  } catch (_error) {
    return null;
  }
}

function storeUser(user) {
  if (!user) {
    return;
  }
  try {
    window.localStorage.setItem(STORED_USER_KEY, JSON.stringify({
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      status: user.status,
      jurisdictions: user.jurisdictions || [],
    }));
  } catch (_error) {
    // Ignore storage failures.
  }
}

function clearStoredUser() {
  try {
    window.localStorage.removeItem(STORED_USER_KEY);
  } catch (_error) {
    // Ignore storage failures.
  }
}

function filterCasesForStoredUser(cases, user) {
  if (!user || user.role !== "client") {
    return [];
  }
  return (cases || []).filter((matter) => matter.clientUserId === user.id);
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
