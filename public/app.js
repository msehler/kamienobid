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
  accountEditMode: false,
  intakeReason: "",
  matterDocuments: [],
  singleTaskDetails: [],
};

const elements = {};
const STORED_USER_KEY = "kamieno.rememberedUser";
const MAX_MATTER_DOCUMENTS = 10;
const MAX_MATTER_DOCUMENT_BYTES_PER_FILE = 2 * 1024 * 1024;
const MAX_MATTER_DOCUMENT_BYTES_TOTAL = 3 * 1024 * 1024;
const INTAKE_REASON_KEY = "__intakeReason";
const SINGLE_TASK_DETAIL_KEY = "__singleTaskDetail";
const SINGLE_TASK_DETAILS_KEY = "__singleTaskDetails";

const INTAKE_REASON_OPTIONS = [
  {
    id: "legal-advice",
    label: "I need legal advice",
    summary: "Use this when you want advice first. You can then choose the practice area you want advice on, like family, criminal, employment, or commercial.",
    prompts: ["What has happened so far?", "What advice or outcome are you looking for?", "Is there any urgent deadline?"],
  },
  {
    id: "document-drafting-review",
    label: "I need a document drafted or reviewed",
    summary: "Use this when you need help preparing, reviewing, or negotiating a document.",
    prompts: ["What document do you need help with?", "Do you already have a draft or received version?", "When do you need it reviewed or prepared by?"],
  },
  {
    id: "defending-claim",
    label: "Someone is making a claim against me",
    summary: "Use this when you have received a claim, allegation, charge, complaint, or legal demand and need to respond.",
    prompts: ["Who is making the claim or allegation?", "What documents or notices have you received?", "When do you need to respond by?"],
  },
  {
    id: "making-claim",
    label: "I want to make a claim against someone",
    summary: "Use this when you want to take legal action, recover money, or pursue a formal complaint or claim.",
    prompts: ["Who is the claim against?", "What outcome are you seeking?", "What key evidence or documents do you already have?"],
  },
  {
    id: "court-tribunal-process",
    label: "I need help with a court, tribunal, or government process",
    summary: "Use this when you already have a formal process underway or need help preparing for one.",
    prompts: ["Which court, tribunal, or agency is involved?", "What stage is the matter at?", "What is the next hearing date or deadline?"],
  },
  {
    id: "personal-situation",
    label: "I need help with a personal situation",
    summary: "Use this for private-client matters affecting you or your family, even if you are not yet sure of the legal category.",
    practiceAreaIds: [
      "family-divorce",
      "child-custody",
      "personal-injury",
      "medical-negligence",
      "criminal-defence",
      "traffic",
      "wills-probate",
      "estate-litigation",
      "consumer",
      "immigration",
      "retirement",
      "elder-law",
      "neighbourhood",
      "other",
    ],
    prompts: ["What is happening in plain language?", "What result are you hoping for?", "Is anything urgent right now?"],
  },
  {
    id: "business-issue",
    label: "I need help with a business issue",
    summary: "Use this when the matter involves your company, commercial dealings, contracts, staff, or a regulator.",
    practiceAreaIds: [
      "employment",
      "property",
      "commercial",
      "contract-disputes",
      "ip",
      "consumer",
      "debt-insolvency",
      "tax",
      "construction",
      "environmental",
      "administrative",
      "other",
    ],
    prompts: ["What is the business issue?", "Who is the other side or decision-maker?", "What commercial outcome do you need?"],
  },
  {
    id: "not-sure",
    label: "I'm not sure",
    summary: "Use this if you want to describe the problem first and then choose the closest practice area.",
    prompts: ["What happened?", "What help do you think you need?", "Is there any deadline or urgency?"],
  },
];

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  applyNavigationFocus();
  applySignupRolePrefill();
  applyAccountPageMode();
  bindEvents();
  initMobileNav();
  observeReveals();
  try {
    await refreshApp();
    await handleCheckoutReturn();
  } finally {
    document.body.classList.remove("app-shell-pending");
    document.body.classList.add("app-ready");
  }
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
    "accountWorkspaceGrid",
    "signupPanelTitle",
    "signupPanelPill",
    "signupSubmitLabel",
    "signupHotButton",
    "signupSwitchLink",
    "loginSwitchLink",
    "accountInsightEyebrow",
    "accountInsightBody",
    "accountPrimaryColumn",
    "accountSignedInPanel",
    "accountStatusPanelTitle",
    "accountInsightPanel",
    "countryInsights",
    "clientMarketingHero",
    "clientMarketingDetails",
    "clientDashboard",
    "clientCreateCaseButton",
    "clientComposer",
    "clientCheckout",
    "matterForm",
    "matterFormTitle",
    "matterFormPill",
    "matterAccessNote",
    "matterCancelButton",
    "matterSubmitButton",
    "caseName",
    "countrySelect",
    "regionSelect",
    "regionLabel",
    "intakeReasonSelect",
    "intakeReasonGuide",
    "practiceAreaField",
    "practiceAreaSelect",
    "scopeOfWorkField",
    "scopeOfWork",
    "singleTaskDetailField",
    "singleTaskList",
    "addSingleTaskButton",
    "promptFields",
    "requiredUploads",
    "templateSummary",
    "paymentFlowSummary",
    "clientCheckoutForm",
    "checkoutAccessNote",
    "checkoutCaseSummary",
    "checkoutAccountName",
    "checkoutAccountEmail",
    "checkoutPhone",
    "checkoutAddress",
    "checkoutBackButton",
    "checkoutSubmitButton",
    "checkoutFeeSummary",
    "matterSummary",
    "budgetInput",
    "matterDocumentUploader",
    "matterDocumentInput",
    "matterDocumentList",
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
    "bidMatterBrief",
    "bidForm",
    "bidAccessNote",
    "feeType",
    "totalFee",
    "disbursements",
    "strategyPosition",
    "strategyNextSteps",
    "strategyRisks",
    "strategyTimeline",
    "strategyPriceFactors",
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

  if (elements.intakeReasonSelect) {
    elements.intakeReasonSelect.addEventListener("change", () => {
      state.intakeReason = elements.intakeReasonSelect.value;
      state.selectedPracticeAreaId = "";
      state.singleTaskDetails = [];
      if (elements.scopeOfWork) {
        elements.scopeOfWork.value = "";
      }
      renderMatterComposer();
    });
  }

  if (elements.countrySelect) {
    elements.countrySelect.addEventListener("change", () => {
      state.selectedCountryCode = elements.countrySelect.value;
      renderMatterComposer();
    });
  }

  if (elements.practiceAreaSelect) {
    elements.practiceAreaSelect.addEventListener("change", () => {
      const previousPracticeAreaId = state.selectedPracticeAreaId;
      state.selectedPracticeAreaId = elements.practiceAreaSelect.value;
      if (elements.scopeOfWork && previousPracticeAreaId !== state.selectedPracticeAreaId) {
        elements.scopeOfWork.value = "";
      }
      if (previousPracticeAreaId !== state.selectedPracticeAreaId) {
        state.singleTaskDetails = [];
      }
      renderMatterComposer();
    });
  }

  if (elements.scopeOfWork) {
    elements.scopeOfWork.addEventListener("change", () => {
      if (!isSingleTaskScope(elements.scopeOfWork.value)) {
        state.singleTaskDetails = [];
      }
      renderMatterComposer();
    });
  }

  if (elements.addSingleTaskButton) {
    elements.addSingleTaskButton.addEventListener("click", addSingleTaskField);
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
  [elements.strategyPosition, elements.strategyNextSteps, elements.strategyRisks, elements.strategyTimeline, elements.strategyPriceFactors]
    .filter(Boolean)
    .forEach((field) => field.addEventListener("input", renderCompliancePreview));
  if (elements.clientCreateCaseButton) {
    elements.clientCreateCaseButton.addEventListener("click", () => openMatterComposer());
  }
  if (elements.matterDocumentUploader) {
    elements.matterDocumentUploader.addEventListener("click", handleMatterDocumentUploaderClick);
    elements.matterDocumentUploader.addEventListener("keydown", handleMatterDocumentUploaderKeydown);
    elements.matterDocumentUploader.addEventListener("dragenter", handleMatterDocumentDragEnter);
    elements.matterDocumentUploader.addEventListener("dragover", handleMatterDocumentDragEnter);
    elements.matterDocumentUploader.addEventListener("dragleave", handleMatterDocumentDragLeave);
    elements.matterDocumentUploader.addEventListener("drop", handleMatterDocumentDrop);
  }
  if (elements.matterDocumentInput) {
    elements.matterDocumentInput.addEventListener("change", handleMatterDocumentInputChange);
  }
  if (elements.matterDocumentList) {
    elements.matterDocumentList.addEventListener("click", handleMatterDocumentListClick);
    elements.matterDocumentList.addEventListener("input", handleMatterDocumentListInput);
    elements.matterDocumentList.addEventListener("change", handleMatterDocumentListInput);
  }
  if (elements.matterCancelButton) {
    elements.matterCancelButton.addEventListener("click", closeMatterComposer);
  }
  if (elements.clientCheckoutForm) {
    elements.clientCheckoutForm.addEventListener("submit", submitClientCheckout);
  }
  if (elements.checkoutBackButton) {
    elements.checkoutBackButton.addEventListener("click", closeClientCheckout);
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

function getAccountAuthConfig() {
  const params = new URLSearchParams(window.location.search);
  return {
    role: params.get("role") === "lawyer" ? "lawyer" : "client",
    mode: params.get("mode") === "signup" ? "signup" : "signin",
  };
}

function applyAccountPageMode() {
  const { role, mode } = getAccountAuthConfig();
  const signupHref = role === "lawyer" ? "/account?role=lawyer&mode=signup" : "/account?mode=signup";
  const signinHref = "/account?mode=signin";

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
      elements.accountWorkspaceTitle.textContent = mode === "signup"
        ? "Create your lawyer account to start the verification and bidding workflow."
        : "Sign in to continue your lawyer profile and jurisdiction workflow.";
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
  } else if (mode === "signin") {
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
      elements.accountWorkspaceTitle.textContent = "Sign in to open your client dashboard.";
    }
  } else {
    if (elements.accountHeroEyebrow) {
      elements.accountHeroEyebrow.textContent = "Client sign up";
    }
    if (elements.accountHeroTitle) {
      elements.accountHeroTitle.innerHTML = 'Create your client account <span>and start your first case.</span>';
    }
    if (elements.accountHeroSummary) {
      elements.accountHeroSummary.textContent = "Create your Kamieno client account to save drafts, manage cases, and continue through checkout when you are ready.";
    }
    if (elements.accountWorkspaceEyebrow) {
      elements.accountWorkspaceEyebrow.textContent = "Client sign up";
    }
    if (elements.accountWorkspaceTitle) {
      elements.accountWorkspaceTitle.textContent = "Create your account to open your client dashboard.";
    }
  }

  if (elements.signupSwitchLink) {
    elements.signupSwitchLink.href = signinHref;
    elements.signupSwitchLink.textContent = "Already have an account? Sign in";
  }
  if (elements.loginSwitchLink) {
    elements.loginSwitchLink.href = signupHref;
    elements.loginSwitchLink.textContent = role === "lawyer" ? "Need a lawyer account? Sign up" : "Need an account? Sign up";
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
  state.selectedPracticeAreaId = state.bootstrap.practiceAreas.some((area) => area.id === state.selectedPracticeAreaId)
    ? state.selectedPracticeAreaId
    : "";
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
  renderFooter();
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

function renderFooter() {
  document.querySelectorAll(".site-footer").forEach((footer) => {
    footer.innerHTML = getFooterMarkup();
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
  const { role, mode } = getAccountAuthConfig();
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
      elements.accountStatusPanelTitle.textContent = "Account guidance";
    }
    elements.stripeStatus.style.display = "none";
    elements.accountSignedInPanel.hidden = false;
    const accountName = escapeHtml(user.name || "");
    const accountEmail = escapeHtml(user.email || "");
    const accountPhone = escapeHtml(user.phone || "");
    const accountAddress = escapeHtml(user.address || "");
    const roleLabel = formatLabel(user.role);
    const statusLabel = formatLabel(user.status);
    const hasJurisdictions = Array.isArray(user.jurisdictions) && user.jurisdictions.length;
    const phoneDisplay = accountPhone || "Add your best contact number";
    const addressDisplay = accountAddress ? accountAddress.replace(/\n/g, "<br />") : "Add your address for engagement and billing records";
    elements.accountSignedInPanel.innerHTML = `
      ${
        state.accountEditMode
          ? `
            <form class="panel account-settings-panel" id="accountSettingsForm">
              <div class="panel-header">
                <div class="account-panel-heading">
                  <h3>My account</h3>
                  <p>Update your contact details here, then save when you are ready.</p>
                </div>
                <div class="panel-badges">
                  <span class="pill neutral">${escapeHtml(roleLabel)}</span>
                  <span class="pill neutral">${escapeHtml(statusLabel)}</span>
                </div>
              </div>
              <div class="account-settings-grid">
                <label class="account-field">
                  <span>Full name</span>
                  <input name="name" type="text" value="${accountName}" required />
                </label>
                <label class="account-field">
                  <span>Email</span>
                  <input name="email" type="email" value="${accountEmail}" required />
                </label>
                <label class="account-field">
                  <span>Phone number</span>
                  <input name="phone" type="tel" value="${accountPhone}" placeholder="Add your best contact number" />
                </label>
                <label class="account-field account-field-full">
                  <span>Address</span>
                  <textarea name="address" rows="3" placeholder="Add your address for engagement and billing records">${accountAddress}</textarea>
                </label>
                <div class="account-security-card account-field-full">
                  <div class="account-password-row">
                    <div class="account-password-copy">
                      <p class="account-field-title">Password</p>
                      <p class="account-field-hint">Change your password here if you want to rotate it now.</p>
                    </div>
                    <button class="button ghost account-password-toggle" type="button" data-account-toggle-password>Change password</button>
                  </div>
                  <input type="password" value="Password protected" disabled />
                  <div class="account-password-fields" data-account-password-fields hidden>
                    <label class="account-field">
                      <span>Current password</span>
                      <input name="currentPassword" type="password" placeholder="Enter your current password" />
                    </label>
                    <label class="account-field">
                      <span>New password</span>
                      <input name="newPassword" type="password" placeholder="Use at least 10 characters" />
                    </label>
                    <label class="account-field">
                      <span>Confirm new password</span>
                      <input name="confirmPassword" type="password" placeholder="Re-enter the new password" />
                    </label>
                    <p class="account-password-note">
                      Security recommendation: use 10 or more characters, avoid reusing an old password, and prefer a memorable passphrase with numbers or symbols.
                    </p>
                  </div>
                </div>
              </div>
              <div class="account-actions">
                <button class="button primary" type="submit">Save changes</button>
                <button class="button secondary" type="button" data-account-cancel>Cancel</button>
              </div>
            </form>
          `
          : `
            <article class="panel account-settings-panel account-settings-panel-readonly">
              <div class="panel-header">
                <div class="account-panel-heading">
                  <h3>My account</h3>
                  <p>Review the details currently attached to your Kamieno account.</p>
                </div>
                <div class="panel-badges">
                  <span class="pill neutral">${escapeHtml(roleLabel)}</span>
                  <span class="pill neutral">${escapeHtml(statusLabel)}</span>
                </div>
              </div>
              <div class="account-readonly-grid">
                <article class="account-readonly-item">
                  <p class="account-readonly-label">Full name</p>
                  <p class="account-readonly-value">${accountName}</p>
                </article>
                <article class="account-readonly-item">
                  <p class="account-readonly-label">Email</p>
                  <p class="account-readonly-value">${accountEmail}</p>
                </article>
                <article class="account-readonly-item">
                  <p class="account-readonly-label">Phone number</p>
                  <p class="account-readonly-value ${accountPhone ? "" : "is-muted"}">${phoneDisplay}</p>
                </article>
                <article class="account-readonly-item account-readonly-item-full">
                  <p class="account-readonly-label">Address</p>
                  <p class="account-readonly-value ${accountAddress ? "" : "is-muted"}">${addressDisplay}</p>
                </article>
                <article class="account-readonly-item account-readonly-item-full">
                  <div class="account-password-row">
                    <div class="account-password-copy">
                      <p class="account-readonly-label">Password</p>
                      <p class="account-field-hint">Your password is hidden. Switch into edit mode if you want to change it securely.</p>
                    </div>
                    <span class="pill neutral">Protected</span>
                  </div>
                  <p class="account-security-display">••••••••••••</p>
                </article>
              </div>
              <div class="account-actions">
                <button class="button primary" type="button" data-account-edit>Edit details</button>
              </div>
            </article>
          `
      }
    `;
    elements.sessionCard.innerHTML = `
      <p><strong>Use this page to manage the contact details tied to your Kamieno account.</strong></p>
      <p>Name and email control your signed-in identity. Phone and address help keep engagement and billing details current once you start working with a lawyer.</p>
      <p>${hasJurisdictions
        ? `Jurisdictions on file: ${escapeHtml(user.jurisdictions.join(", "))}.`
        : user.role === "lawyer"
          ? "No jurisdictions are on file yet. Add them from the lawyer workspace when you are ready."
          : "Clients do not need jurisdictions on file to manage cases."}</p>
    `;
    if (elements.accountInsightEyebrow) {
      elements.accountInsightEyebrow.textContent = "Security and next steps";
    }
    if (elements.accountInsightBody) {
      elements.accountInsightBody.textContent = user.role === "client"
        ? "Keep your details current here, then use the signed-in menu to return to your dashboard and manage your cases."
        : "Keep your identity details current here, and change your password here whenever you need to tighten account security.";
    }
    bindAccountSettingsPanel();
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
    state.accountEditMode = false;
    elements.sessionCard.innerHTML = `
      <p><strong>Public preview</strong></p>
      <p>Create a client or lawyer account to use the workflow. Admin access is provisioned separately.</p>
    `;
  }

  if (isAccountPage && !user) {
    if (elements.accountHeroSection) {
      elements.accountHeroSection.hidden = true;
    }
    if (elements.accountInsightPanel) {
      elements.accountInsightPanel.hidden = true;
    }
    if (elements.accountWorkspaceGrid) {
      elements.accountWorkspaceGrid.classList.add("auth-simple");
    }
    if (elements.accountWorkspaceEyebrow) {
      elements.accountWorkspaceEyebrow.textContent = role === "lawyer" ? "Lawyer account" : "Client account";
    }
    if (elements.accountStatusPanelTitle) {
      elements.accountStatusPanelTitle.textContent = mode === "signup" ? "Create your account" : "Sign in";
    }
  } else {
    if (elements.accountInsightPanel) {
      elements.accountInsightPanel.hidden = Boolean(!user && isAccountPage);
    }
    if (elements.accountWorkspaceGrid) {
      elements.accountWorkspaceGrid.classList.remove("auth-simple");
    }
  }

  elements.signupForm.style.display = user && isAccountPage ? "none" : isAccountPage && mode !== "signup" ? "none" : "";
  elements.loginForm.style.display = user && isAccountPage ? "none" : isAccountPage && mode !== "signin" ? "none" : "";
  elements.logoutButton.style.display = user && isAccountPage ? "none" : user ? "" : "none";
}

function bindAccountSettingsPanel() {
  if (!elements.accountSignedInPanel) {
    return;
  }

  const form = elements.accountSignedInPanel.querySelector("#accountSettingsForm");

  const editButton = elements.accountSignedInPanel.querySelector("[data-account-edit]");
  if (editButton) {
    editButton.addEventListener("click", () => {
      state.accountEditMode = true;
      renderAuth();
    });
  }

  const cancelButton = elements.accountSignedInPanel.querySelector("[data-account-cancel]");
  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      state.accountEditMode = false;
      renderAuth();
    });
  }

  if (!form) {
    return;
  }

  const passwordToggle = form.querySelector("[data-account-toggle-password]");
  const passwordFields = form.querySelector("[data-account-password-fields]");
  if (passwordToggle && passwordFields) {
    passwordToggle.addEventListener("click", () => {
      const shouldShow = passwordFields.hidden;
      passwordFields.hidden = !shouldShow;
      passwordToggle.textContent = shouldShow ? "Hide password fields" : "Change password";
      if (!shouldShow) {
        passwordFields.querySelectorAll("input").forEach((input) => {
          input.value = "";
        });
      }
    });
  }

  form.addEventListener("submit", submitAccountUpdate);
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
  const showCheckout = isClient && state.clientView === "checkout";

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
  if (elements.clientCheckout) {
    elements.clientCheckout.hidden = !showCheckout;
  }

  renderMatterComposer();
  renderClientBoard();
  renderClientCheckout();

  if (isClient && !showDashboard && !showComposer && !showCheckout) {
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
    state.intakeReason = getSavedIntakeReason(matter) || deriveIntakeReasonFromMatter(matter);
  } else {
    state.intakeReason = "";
    state.selectedPracticeAreaId = "";
    setMatterDocuments([]);
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

function openClientCheckout(caseId) {
  if (state.currentUser?.role !== "client") {
    window.location.assign("/account?role=client&returnTo=%2Fclient");
    return;
  }
  const matter = state.cases.find((entry) => entry.id === caseId);
  if (!matter) {
    showToast("That case could not be loaded.");
    return;
  }
  state.selectedCaseId = matter.id;
  state.clientView = "checkout";
  state.editingCaseId = null;
  renderClientExperience();
  elements.clientCheckout?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeClientCheckout() {
  state.clientView = state.currentUser?.role === "client" ? "dashboard" : "marketing";
  renderClientExperience();
  elements.clientDashboard?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function submitClientCheckout(event) {
  event.preventDefault();
  if (state.currentUser?.role !== "client") {
    showToast("Client login required.");
    return;
  }

  const matter = state.cases.find((entry) => entry.id === state.selectedCaseId);
  if (!matter) {
    showToast("Select a draft to continue.");
    return;
  }

  const formData = new FormData(event.currentTarget);
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();

  if (!phone || !address) {
    showToast("Phone number and address are required before payment.");
    return;
  }

  try {
    const accountResponse = await request("/api/auth", {
      method: "POST",
      body: JSON.stringify({
        action: "update-account",
        name: state.currentUser.name,
        email: state.currentUser.email,
        phone,
        address,
      }),
    });
    state.currentUser = accountResponse.user;
    if (state.bootstrap) {
      state.bootstrap.currentUser = accountResponse.user;
    }
    storeUser(accountResponse.user);
    await continueCaseCheckout(matter.id);
  } catch (error) {
    showToast(error.message);
  }
}

function prepareNewMatterForm() {
  if (!elements.matterForm) {
    return;
  }
  elements.matterForm.reset();
  state.editingCaseId = null;
  state.intakeReason = "";
  state.selectedPracticeAreaId = "";
  state.singleTaskDetails = [];
  setMatterDocuments([]);
  renderMatterComposer();
  if (elements.matterSummary) {
    elements.matterSummary.value = "";
  }
  if (elements.budgetInput) {
    elements.budgetInput.value = elements.budgetInput.options[0]?.value || "";
  }
  if (elements.scopeOfWork) {
    elements.scopeOfWork.value = elements.scopeOfWork.options[0]?.value || "";
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
  state.intakeReason = getSavedIntakeReason(matter) || deriveIntakeReasonFromMatter(matter);
  state.selectedPracticeAreaId = matter.practiceAreaId;
  setMatterDocuments(matter.documents || []);
  renderMatterComposer();

  if (elements.regionSelect) {
    elements.regionSelect.value = matter.region;
  }
  if (elements.caseName) {
    elements.caseName.value = matter.caseName || "";
  }
  if (elements.matterSummary) {
    elements.matterSummary.value = matter.summary || "";
  }
  if (elements.budgetInput) {
    populateBudgetOptions(elements.budgetInput, getCountry(matter.countryCode), matter.budget || "");
    elements.budgetInput.value = matter.budget || elements.budgetInput.options[0]?.value || "";
  }
  if (elements.scopeOfWork) {
    populateScopeOfWorkOptions(elements.scopeOfWork, matter.practiceAreaId, matter.scopeOfWork || "");
    elements.scopeOfWork.value = matter.scopeOfWork || elements.scopeOfWork.options[0]?.value || "";
  }
  state.singleTaskDetails = getSingleTaskDetails(matter);

  renderMatterComposer();

  Array.from(elements.promptFields?.querySelectorAll("textarea") || []).forEach((field) => {
    const prompt = field.name.replace(/^prompt:/, "");
    field.value = matter.customAnswers?.[prompt] || "";
  });
}

function renderMatterComposer() {
  if (
    !elements.intakeReasonSelect ||
    !elements.intakeReasonGuide ||
    !elements.countrySelect ||
    !elements.practiceAreaField ||
    !elements.practiceAreaSelect ||
    !elements.regionLabel ||
    !elements.regionSelect ||
    !elements.templateSummary ||
    !elements.paymentFlowSummary ||
    !elements.scopeOfWorkField ||
    !elements.scopeOfWork ||
    !elements.singleTaskDetailField ||
    !elements.singleTaskList ||
    !elements.addSingleTaskButton ||
    !elements.promptFields ||
    !elements.requiredUploads ||
    !elements.matterDocumentUploader ||
    !elements.matterDocumentInput ||
    !elements.matterDocumentList ||
    !elements.matterAccessNote ||
    !elements.matterForm ||
    !elements.matterSubmitButton ||
    !elements.matterFormTitle ||
    !elements.matterFormPill ||
    !elements.matterCancelButton ||
    !elements.clientName ||
    !elements.caseName
  ) {
    return;
  }
  if (state.intakeReason) {
    const allowedPracticeAreaIds = new Set(getPracticeAreasForIntakeReason(state.intakeReason).map((area) => area.id));
    if (state.selectedPracticeAreaId && !allowedPracticeAreaIds.has(state.selectedPracticeAreaId)) {
      state.selectedPracticeAreaId = "";
      state.singleTaskDetails = [];
    }
  }
  populateIntakeReasonOptions(elements.intakeReasonSelect, state.intakeReason);
  populateCountrySelect(elements.countrySelect, state.selectedCountryCode);
  populatePracticeAreas();

  const country = getCountry(state.selectedCountryCode);
  const intakeReason = getIntakeReasonConfig(state.intakeReason);
  const hasIntakeReason = Boolean(intakeReason);
  const hasPracticeArea = Boolean(state.selectedPracticeAreaId);
  const template = hasPracticeArea ? getTemplate(state.selectedCountryCode, state.selectedPracticeAreaId) : null;
  const matterPrompts = buildMatterPrompts(state.intakeReason, template);
  const currentBudgetValue = elements.budgetInput?.value || "";
  const currentScopeValue = elements.scopeOfWork?.value || "";
  const currentSingleTaskDetails = readSingleTaskDetailsFromDom();
  if (currentSingleTaskDetails.length) {
    state.singleTaskDetails = currentSingleTaskDetails;
  }
  state.selectedCountryCode = country.code;
  elements.regionLabel.textContent = country.regionLabel;
  populateRegionSelect(elements.regionSelect, country, elements.regionSelect.value);
  populateBudgetOptions(elements.budgetInput, country, currentBudgetValue);
  elements.intakeReasonGuide.hidden = !hasIntakeReason;
  elements.intakeReasonGuide.innerHTML = intakeReason
    ? `<p><strong>${escapeHtml(intakeReason.label)}</strong></p><p>${escapeHtml(intakeReason.summary)}</p>`
    : "";
  elements.practiceAreaField.hidden = !hasIntakeReason;
  elements.practiceAreaSelect.disabled = !hasIntakeReason;
  elements.practiceAreaSelect.required = hasIntakeReason;
  populateScopeOfWorkOptions(elements.scopeOfWork, state.selectedPracticeAreaId, currentScopeValue);
  elements.scopeOfWorkField.hidden = !hasPracticeArea;
  elements.scopeOfWork.disabled = !hasPracticeArea;
  elements.scopeOfWork.required = hasPracticeArea;
  if (!hasPracticeArea) {
    elements.scopeOfWork.value = "";
  }
  const showSingleTaskDetail = hasPracticeArea && isSingleTaskScope(elements.scopeOfWork.value || currentScopeValue);
  elements.singleTaskDetailField.hidden = !showSingleTaskDetail;
  if (!showSingleTaskDetail) {
    state.singleTaskDetails = [];
  } else if (!state.singleTaskDetails.length) {
    state.singleTaskDetails = [""];
  }
  renderSingleTaskFields(state.selectedPracticeAreaId, showSingleTaskDetail);
  elements.templateSummary.innerHTML = template
    ? `
        <p class="eyebrow">${escapeHtml(intakeReason?.label || "Selected intake path")}</p>
        <p><strong>${template.label}</strong></p>
        <p>${template.terminology}</p>
        <p>${template.disclaimer}</p>
        <ul>${matterPrompts.map((prompt) => `<li>${prompt}</li>`).join("")}</ul>
      `
    : hasIntakeReason
      ? `
          <p class="eyebrow">${escapeHtml(intakeReason?.label || "Selected intake path")}</p>
          <p><strong>Select a practice area</strong></p>
          <p>Next, choose the closest practice area so Kamieno can tailor the case brief and suggested uploads.</p>
          <ul>${(intakeReason?.prompts || []).map((prompt) => `<li>${prompt}</li>`).join("")}</ul>
        `
      : `
          <p><strong>Start with the kind of help you need</strong></p>
          <p>Choose what you need a lawyer for first, and Kamieno will narrow the practice areas and intake questions from there.</p>
        `;
  elements.paymentFlowSummary.innerHTML = `
    <p class="eyebrow">Submitting flow</p>
    <p>Save your draft first, then submit it from your dashboard. Before payment, you will review the summary and complete any missing account details.</p>
  `;
  elements.caseName.placeholder = buildCaseNamePlaceholder(state.currentUser?.name);
  elements.promptFields.innerHTML = template
    ? matterPrompts
        .map(
          (prompt) => `
            <label>
              ${prompt}
              <textarea name="prompt:${prompt}" rows="4" placeholder="Provide matter-specific detail"></textarea>
            </label>
          `,
        )
        .join("")
    : "";
  elements.requiredUploads.innerHTML = template
    ? template.uploads.map((entry) => `<li>${entry}</li>`).join("")
    : hasIntakeReason
      ? "<li>Select a practice area to see the suggested uploads.</li>"
      : "<li>Choose what you need help with first to tailor the suggested uploads.</li>";
  renderMatterDocumentList();

  const isClient = state.currentUser?.role === "client";
  const editingMatter = state.cases.find((entry) => entry.id === state.editingCaseId) || null;

  elements.matterFormTitle.textContent = editingMatter ? "Edit your case" : "Create your case";
  elements.matterFormPill.textContent = editingMatter ? "Existing case" : "New draft";
  elements.matterSubmitButton.textContent = editingMatter
    ? String(editingMatter.paymentStatus).startsWith("paid")
      ? "Save case changes"
      : "Save draft changes"
    : "Save draft changes";
  elements.matterAccessNote.hidden = isClient;
  elements.matterAccessNote.innerHTML = isClient ? "" : `<p>Sign in as a client to create and publish a matter.</p>`;
  setFormEnabled(elements.matterForm, isClient);
  elements.matterSubmitButton.disabled = !isClient;
  renderMatterDocumentList();

  if (state.currentUser) {
    elements.clientName.value = state.currentUser.name;
    elements.clientName.readOnly = true;
  } else {
    elements.clientName.readOnly = false;
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
      ? `<p>Your account is verified. You can respond with stage-based estimates on matching paid matters.</p>`
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
  if (!elements.bidCaseSelect || !elements.feeType || !elements.totalFee || !elements.disbursements || !elements.compliancePreview || !elements.bidMatterBrief) {
    return;
  }
  const matter = state.cases.find((entry) => entry.id === elements.bidCaseSelect.value);
  if (!matter) {
    elements.feeType.placeholder = "Select an eligible matter";
    elements.totalFee.placeholder = "Overall range";
    elements.disbursements.placeholder = "Excluded costs / taxes";
    elements.bidMatterBrief.innerHTML = "<p>Select a visible matter to review the requested scope and budget range.</p>";
    elements.compliancePreview.innerHTML = "<li>Select an eligible matter to preview conduct checks.</li>";
    return;
  }
  const country = getCountry(matter.countryCode);
  elements.feeType.placeholder = country.code === "US" ? "Stage-based hourly or capped estimate" : "Stage-based fixed or capped fee estimate";
  elements.totalFee.placeholder = country.code === "US" ? "USD 3,500 - 6,000" : `${country.currencyCode} 4,800 - 7,500`;
  elements.disbursements.placeholder = "Court filing, barrister, expert, GST/VAT if separate";
  elements.bidMatterBrief.innerHTML = `
    <p class="eyebrow">Selected matter brief</p>
    ${renderIntakeReasonSummary(matter)}
    <p><strong>Scope of work:</strong> ${escapeHtml(matter.scopeOfWork || "Not specified")}</p>
    ${renderSingleTaskSummary(matter)}
    <p><strong>Budget range:</strong> ${escapeHtml(matter.budget || "Not specified")}</p>
    <p><strong>Summary:</strong> ${escapeHtml(matter.summary || "Not provided")}</p>
  `;
}

function renderCompliancePreview() {
  if (
    !elements.bidCaseSelect ||
    !elements.strategyPosition ||
    !elements.strategyNextSteps ||
    !elements.strategyRisks ||
    !elements.strategyTimeline ||
    !elements.strategyPriceFactors ||
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
    elements.strategyPriceFactors.value,
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
            ${entry.scopeOfWork ? `<span class="pill neutral">${entry.scopeOfWork}</span>` : ""}
            ${entry.documents?.length ? `<span class="pill neutral">${entry.documents.length} document${entry.documents.length === 1 ? "" : "s"}</span>` : ""}
            <span class="pill neutral">${needsPayment ? "Ready to submit" : entry.status}</span>
          </div>
          <div class="case-card-actions">
            <button class="button secondary" type="button" data-case-action="edit" data-case-id="${entry.id}">Edit</button>
            <button class="button ghost" type="button" data-case-action="delete" data-case-id="${entry.id}" ${entry.status === "engaged" || entry.acceptedBidId ? "disabled" : ""}>Delete</button>
            ${needsPayment ? `<button class="button primary" type="button" data-case-action="publish" data-case-id="${entry.id}">Submit</button>` : ""}
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
    ${renderIntakeReasonSummary(matter)}
    ${matter.scopeOfWork ? `<p><strong>Scope of work:</strong> ${escapeHtml(matter.scopeOfWork)}</p>` : ""}
    ${renderSingleTaskSummary(matter)}
    <p>${matter.summary}</p>
    <div class="case-meta">
      <span class="pill neutral">${getCountry(matter.countryCode).name}</span>
      <span class="pill neutral">${matter.region}</span>
      ${matter.documents?.length ? `<span class="pill neutral">${matter.documents.length} document${matter.documents.length === 1 ? "" : "s"}</span>` : ""}
      <span class="pill neutral">${matter.status}</span>
      <span class="pill neutral">${matter.paymentStatus}</span>
    </div>
    <div class="case-primary-actions">
      <button class="button secondary" type="button" data-case-action="edit" data-case-id="${matter.id}">Edit</button>
      <button class="button ghost" type="button" data-case-action="delete" data-case-id="${matter.id}" ${canDelete ? "" : "disabled"}>Delete</button>
      ${needsPayment ? `<button class="button primary" type="button" data-case-action="publish" data-case-id="${matter.id}">Submit</button>` : ""}
    </div>
    <div class="checklist-card">
      <p class="eyebrow">Dynamic prompts</p>
      <ul>${getVisibleCustomAnswers(matter.customAnswers)
        .map(([key, value]) => `<li><strong>${key}</strong>: ${value || "Not provided"}</li>`)
        .join("")}</ul>
    </div>
    ${
      matter.documents?.length
        ? `<div class="checklist-card">
            <p class="eyebrow">Uploaded documents</p>
            <div class="case-document-list">
              ${matter.documents.map((entry) => renderCaseDocument(entry)).join("")}
            </div>
          </div>`
        : ""
    }
    <p>${template.disclaimer}</p>
  `;

  elements.bidList.innerHTML = matterBids.length
    ? matterBids.map((bid) => renderBidCard(bid, matter)).join("")
    : "<p>No bids yet for this matter.</p>";

  elements.engagementLetter.innerHTML = state.engagementLetter
    ? `<h4>${state.engagementLetter.heading}</h4><p>${state.engagementLetter.body}</p>`
    : "";
}

function renderClientCheckout() {
  if (
    !elements.clientCheckoutForm ||
    !elements.checkoutAccessNote ||
    !elements.checkoutCaseSummary ||
    !elements.checkoutAccountName ||
    !elements.checkoutAccountEmail ||
    !elements.checkoutPhone ||
    !elements.checkoutAddress ||
    !elements.checkoutSubmitButton ||
    !elements.checkoutFeeSummary
  ) {
    return;
  }

  const isClient = state.currentUser?.role === "client";
  const matter = state.cases.find((entry) => entry.id === state.selectedCaseId);

  if (!isClient || !matter) {
    elements.checkoutAccessNote.innerHTML = "<p>Select a draft from your dashboard to continue to payment.</p>";
    elements.checkoutCaseSummary.innerHTML = "<p>No draft selected.</p>";
    elements.checkoutFeeSummary.innerHTML = "<p>Publish a draft from your dashboard to review payment.</p>";
    setFormEnabled(elements.clientCheckoutForm, false);
    return;
  }

  const country = getCountry(matter.countryCode);
  const missing = [];
  if (!String(state.currentUser.phone || "").trim()) {
    missing.push("phone number");
  }
  if (!String(state.currentUser.address || "").trim()) {
    missing.push("address");
  }

  elements.checkoutAccessNote.innerHTML = missing.length
    ? `<p>Add your ${missing.join(" and ")} before payment so your account and billing details are complete.</p>`
    : "<p>Review your draft, confirm your account details, and then continue to payment.</p>";
  elements.checkoutCaseSummary.innerHTML = `
    <p class="eyebrow">Matter summary</p>
    <p><strong>${escapeHtml(matter.caseName || getPracticeArea(matter.practiceAreaId).label)}</strong></p>
    <p>${escapeHtml(matter.summary || "No summary provided.")}</p>
    <div class="case-meta">
      <span class="pill neutral">${getPracticeArea(matter.practiceAreaId).label}</span>
      <span class="pill neutral">${country.name}</span>
      <span class="pill neutral">${matter.region}</span>
      ${matter.scopeOfWork ? `<span class="pill neutral">${escapeHtml(matter.scopeOfWork)}</span>` : ""}
    </div>
    ${renderIntakeReasonSummary(matter)}
    ${renderSingleTaskSummaryPlain(matter)}
    <p class="eyebrow">Included in this submission</p>
    <ul>${getVisibleCustomAnswers(matter.customAnswers)
      .map(([key, value]) => `<li><strong>${key}</strong>: ${escapeHtml(value || "Not provided")}</li>`)
      .join("")}</ul>
  `;
  elements.checkoutAccountName.value = state.currentUser.name || "";
  elements.checkoutAccountEmail.value = state.currentUser.email || "";
  elements.checkoutPhone.value = state.currentUser.phone || "";
  elements.checkoutAddress.value = state.currentUser.address || "";
  elements.checkoutFeeSummary.innerHTML = `
    <p class="eyebrow">Payment summary</p>
    <p><strong>${formatMoney(country.clientFee, country.currencyCode)}</strong> publishing fee</p>
    <p>This payment publishes your matter to matching lawyers so they can submit proposals.</p>
    <p>After payment, the matter moves from draft to live tendering.</p>
  `;
  elements.checkoutSubmitButton.textContent = "Pay and receive proposals";
  setFormEnabled(elements.clientCheckoutForm, isClient);
  elements.checkoutAccountName.disabled = true;
  elements.checkoutAccountEmail.disabled = true;
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
          <span class="pill neutral">${bid.feeType || "Structured estimate"}</span>
          <span class="pill neutral">${bid.totalFee || "Range on request"}</span>
          ${shortlisted ? '<span class="pill">Shortlisted</span>' : ""}
          ${accepted ? '<span class="pill">Accepted</span>' : ""}
        </div>
      </div>
      <p><strong>Excluded costs / taxes:</strong> ${bid.disbursements || "Included in overall range unless otherwise stated."}</p>
      <ul>
        <li><strong>Stage 1 estimate:</strong> ${bid.sections.stageOne || bid.sections.position || "Not provided"}</li>
        <li><strong>Stage 2 estimate:</strong> ${bid.sections.stageTwo || bid.sections.nextSteps || "Not provided"}</li>
        <li><strong>Stage 3 estimate:</strong> ${bid.sections.stageThree || bid.sections.risks || "Not provided"}</li>
        <li><strong>Assumptions and scope:</strong> ${bid.sections.assumptions || bid.sections.timeline || "Not provided"}</li>
        <li><strong>What could change the fee:</strong> ${bid.sections.priceFactors || "Not provided"}</li>
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
    openClientCheckout(caseId);
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
    state.accountEditMode = false;
    clearStoredUser();
    showToast(response.message);
    await refreshApp();
  } catch (error) {
    showToast(error.message);
  }
}

async function submitAccountUpdate(event) {
  event.preventDefault();
  if (!state.currentUser) {
    showToast("Please sign in to continue.");
    return;
  }

  const formData = new FormData(event.currentTarget);
  try {
    const response = await request("/api/auth", {
      method: "POST",
      body: JSON.stringify({
        action: "update-account",
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        address: formData.get("address"),
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
      }),
    });
    state.currentUser = response.user;
    if (state.bootstrap) {
      state.bootstrap.currentUser = response.user;
    }
    state.accountEditMode = false;
    storeUser(response.user);
    showToast(response.message);
    renderAll();
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
  const matterPrompts = buildMatterPrompts(elements.intakeReasonSelect?.value, template);
  const formData = new FormData(elements.matterForm);
  const customAnswers = {};
  matterPrompts.forEach((prompt) => {
    customAnswers[prompt] = formData.get(`prompt:${prompt}`) || "";
  });
  if (elements.intakeReasonSelect?.value) {
    customAnswers[INTAKE_REASON_KEY] = elements.intakeReasonSelect.value;
  }
  const singleTaskDetails = readSingleTaskDetailsFromDom().map((value) => value.trim()).filter(Boolean);
  if (singleTaskDetails.length) {
    customAnswers[SINGLE_TASK_DETAILS_KEY] = singleTaskDetails;
    customAnswers[SINGLE_TASK_DETAIL_KEY] = singleTaskDetails[0];
  }

  try {
    const payload = {
      caseId: state.editingCaseId,
      caseName: formData.get("caseName"),
      countryCode: formData.get("countryCode"),
      region: formData.get("region"),
      practiceAreaId: formData.get("practiceAreaId"),
      scopeOfWork: formData.get("scopeOfWork"),
      summary: formData.get("summary"),
      budget: formData.get("budget"),
      documents: state.matterDocuments.map((entry) => ({
        id: entry.id,
        name: entry.name,
        title: entry.title,
        documentDate: entry.documentDate,
        mimeType: entry.mimeType,
        size: entry.size,
        dataUrl: entry.dataUrl,
      })),
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
          stageOne: elements.strategyPosition.value,
          stageTwo: elements.strategyNextSteps.value,
          stageThree: elements.strategyRisks.value,
          assumptions: elements.strategyTimeline.value,
          priceFactors: elements.strategyPriceFactors.value,
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

function getIntakeReasonConfig(id) {
  return INTAKE_REASON_OPTIONS.find((option) => option.id === id) || null;
}

function populateIntakeReasonOptions(select, selectedValue) {
  if (!select) {
    return;
  }

  select.innerHTML = [
    `<option value="" ${!selectedValue ? "selected" : ""}>Select</option>`,
    ...INTAKE_REASON_OPTIONS.map(
      (option) => `<option value="${option.id}" ${option.id === selectedValue ? "selected" : ""}>${option.label}</option>`,
    ),
  ].join("");
}

function getPracticeAreasForIntakeReason(reasonId) {
  const config = getIntakeReasonConfig(reasonId);
  if (!config?.practiceAreaIds?.length) {
    return [...state.bootstrap.practiceAreas];
  }
  const allowedIds = new Set(config.practiceAreaIds);
  return state.bootstrap.practiceAreas.filter((area) => allowedIds.has(area.id));
}

function populatePracticeAreas() {
  if (!elements.practiceAreaSelect) {
    return;
  }
  const practiceAreas = state.intakeReason ? getPracticeAreasForIntakeReason(state.intakeReason) : [];
  elements.practiceAreaSelect.innerHTML = [
    `<option value="" ${!state.selectedPracticeAreaId ? "selected" : ""}>Select</option>`,
    ...practiceAreas.map(
      (area) => `<option value="${area.id}" ${area.id === state.selectedPracticeAreaId ? "selected" : ""}>${area.label}</option>`,
    ),
  ].join("");
}

function populateRegionSelect(select, country, selectedValue) {
  if (!select) {
    return;
  }
  const fallback = selectedValue && country.regions.includes(selectedValue) ? selectedValue : "";
  select.innerHTML = [
    `<option value="" ${!fallback ? "selected" : ""}>Select</option>`,
    ...country.regions.map((region) => `<option value="${region}" ${region === fallback ? "selected" : ""}>${region}</option>`),
  ].join("");
}

function isSingleTaskScope(scopeValue) {
  return /single task/i.test(String(scopeValue || ""));
}

function getSingleTaskDetails(source) {
  const customAnswers = source?.customAnswers || source || {};
  const storedList = customAnswers?.[SINGLE_TASK_DETAILS_KEY];
  if (Array.isArray(storedList)) {
    return storedList.map((value) => String(value || "").trim()).filter(Boolean);
  }
  const legacy = String(customAnswers?.[SINGLE_TASK_DETAIL_KEY] || "").trim();
  return legacy ? [legacy] : [];
}

function getVisibleCustomAnswers(customAnswers) {
  return Object.entries(customAnswers || {})
    .filter(([key]) => key !== SINGLE_TASK_DETAIL_KEY && key !== SINGLE_TASK_DETAILS_KEY && key !== INTAKE_REASON_KEY);
}

function getSavedIntakeReason(source) {
  const customAnswers = source?.customAnswers || source || {};
  const saved = String(customAnswers?.[INTAKE_REASON_KEY] || "").trim();
  return getIntakeReasonConfig(saved) ? saved : "";
}

function deriveIntakeReasonFromMatter(matter) {
  const scope = String(matter?.scopeOfWork || "").toLowerCase();
  const areaId = String(matter?.practiceAreaId || "");

  if (/single task/.test(scope)) {
    return "document-drafting-review";
  }
  if (["criminal-defence", "traffic"].includes(areaId)) {
    return "defending-claim";
  }
  if (["personal-injury", "medical-negligence", "contract-disputes", "debt-insolvency", "estate-litigation"].includes(areaId)) {
    return "making-claim";
  }
  if (["family-divorce", "child-custody", "wills-probate", "consumer", "immigration", "retirement", "elder-law", "neighbourhood"].includes(areaId)) {
    return "personal-situation";
  }
  if (["commercial", "employment", "property", "ip", "tax", "construction", "environmental", "administrative"].includes(areaId)) {
    return "business-issue";
  }
  return "legal-advice";
}

function readSingleTaskDetailsFromDom() {
  return Array.from(document.querySelectorAll("[data-single-task-input]"))
    .map((field) => field.value)
    .filter((value, index, items) => index < items.length);
}

function getSingleTaskPlaceholder(practiceAreaId) {
  const id = String(practiceAreaId || "");
  if (["family-divorce", "child-custody"].includes(id)) {
    return "For example: draft a parenting plan, review consent orders, or prepare disclosure requests.";
  }
  if (["employment"].includes(id)) {
    return "For example: review an employment contract, draft a workplace response, or assess a settlement deed.";
  }
  if (["criminal-defence", "traffic"].includes(id)) {
    return "For example: prepare a bail application, review a brief of evidence, or give plea advice.";
  }
  if (["personal-injury", "medical-negligence"].includes(id)) {
    return "For example: review medical records, draft a letter to the insurer, or advise on claim prospects.";
  }
  if (["property"].includes(id)) {
    return "For example: review a contract of sale, draft special conditions, or advise on a title issue.";
  }
  if (["commercial", "contract-disputes", "ip", "consumer", "debt-insolvency", "construction", "environmental", "administrative"].includes(id)) {
    return "For example: draft a contract, review terms, prepare a letter of demand, or support a negotiation.";
  }
  if (["wills-probate", "estate-litigation", "elder-law", "retirement"].includes(id)) {
    return "For example: review a will, prepare a probate filing, or draft executor correspondence.";
  }
  if (["immigration"].includes(id)) {
    return "For example: review a visa application, draft submissions, or respond to a request for information.";
  }
  if (["tax"].includes(id)) {
    return "For example: review an objection, draft a response, or advise on a tax notice.";
  }
  return "For example: review an agreement, draft a letter of demand, or give one-off advice on a specific task.";
}

function buildMatterPrompts(intakeReasonId, template) {
  const intakePrompts = getIntakeReasonConfig(intakeReasonId)?.prompts || [];
  const areaPrompts = template?.prompts || [];
  const seen = new Set();
  return [...intakePrompts, ...areaPrompts].filter((prompt) => {
    const normalized = String(prompt || "").trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function renderSingleTaskFields(practiceAreaId, isVisible) {
  if (!elements.singleTaskDetailField || !elements.singleTaskList || !elements.addSingleTaskButton) {
    return;
  }

  elements.singleTaskDetailField.hidden = !isVisible;
  elements.addSingleTaskButton.hidden = !isVisible;
  elements.addSingleTaskButton.disabled = !isVisible;

  if (!isVisible) {
    elements.singleTaskList.innerHTML = "";
    return;
  }

  const placeholder = getSingleTaskPlaceholder(practiceAreaId);
  const values = state.singleTaskDetails.length ? state.singleTaskDetails : [""];
  elements.singleTaskList.innerHTML = values
    .map(
      (value, index) => `
        <label>
          ${values.length > 1 ? `Task ${index + 1}` : "Task"}
          <textarea
            name="singleTaskDetail[]"
            data-single-task-input
            rows="2"
          ></textarea>
        </label>
      `,
    )
    .join("");
  Array.from(elements.singleTaskList.querySelectorAll("[data-single-task-input]")).forEach((field, index) => {
    field.placeholder = placeholder;
    field.value = values[index] || "";
  });
}

function addSingleTaskField() {
  state.singleTaskDetails = [...readSingleTaskDetailsFromDom(), ""];
  renderSingleTaskFields(state.selectedPracticeAreaId, true);
}

function renderSingleTaskSummary(matter) {
  const tasks = getSingleTaskDetails(matter);
  if (!tasks.length) {
    return "";
  }
  if (tasks.length === 1) {
    return `<p><strong>Single task:</strong> ${escapeHtml(tasks[0])}</p>`;
  }
  return `
    <div class="checklist-card">
      <p><strong>Single tasks:</strong></p>
      <ul>${tasks.map((task) => `<li>${escapeHtml(task)}</li>`).join("")}</ul>
    </div>
  `;
}

function renderSingleTaskSummaryPlain(matter) {
  const tasks = getSingleTaskDetails(matter);
  if (!tasks.length) {
    return "";
  }
  if (tasks.length === 1) {
    return `<p><strong>Single task:</strong> ${escapeHtml(tasks[0])}</p>`;
  }
  return `
    <p><strong>Single tasks:</strong></p>
    <ul>${tasks.map((task) => `<li>${escapeHtml(task)}</li>`).join("")}</ul>
  `;
}

function renderIntakeReasonSummary(matter) {
  const label = getIntakeReasonConfig(getSavedIntakeReason(matter))?.label;
  if (!label) {
    return "";
  }
  return `<p><strong>What they need help with:</strong> ${escapeHtml(label)}</p>`;
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

function getBudgetCurrencyPrefix(country) {
  switch (country?.currencyCode) {
    case "AUD":
      return "A$";
    case "NZD":
      return "NZ$";
    case "CAD":
      return "C$";
    case "GBP":
      return "£";
    case "EUR":
      return "EUR ";
    default:
      return "$";
  }
}

function buildBudgetRangeOptions(country) {
  const prefix = getBudgetCurrencyPrefix(country);
  return [
    "Unsure, this is my first time",
    `${prefix}1,000 to ${prefix}5,000`,
    `${prefix}5,000 to ${prefix}10,000`,
    `${prefix}10,000 to ${prefix}20,000`,
    `${prefix}20,000 to ${prefix}30,000`,
    `${prefix}30,000 to ${prefix}50,000`,
    `${prefix}50,000 to ${prefix}75,000`,
    `${prefix}75,000 to ${prefix}100,000`,
    `${prefix}100,000+`,
  ];
}

function buildScopeOfWorkOptions(practiceAreaId) {
  const id = String(practiceAreaId || "");
  if (!id) {
    return [];
  }

  if (["family-divorce", "child-custody"].includes(id)) {
    return [
      "Review and advise on the family matter",
      "Single task only: parenting plan, consent orders, or disclosure review",
      "Advise and represent the family matter through to completion",
    ];
  }
  if (["employment"].includes(id)) {
    return [
      "Review and advise on the workplace issue",
      "Single task only: letter, response, settlement review, or contract review",
      "Advise and act on the matter through to resolution or tribunal",
    ];
  }
  if (["criminal-defence", "traffic"].includes(id)) {
    return [
      "Review and advise on the allegation or charge",
      "Single task only: bail application, plea advice, or document review",
      "Advise and represent the matter through hearings",
    ];
  }
  if (["personal-injury", "medical-negligence"].includes(id)) {
    return [
      "Review and advise on the claim prospects",
      "Single task only: insurer response, demand letter, or evidence review",
      "Advise and run the claim through to settlement or hearing",
    ];
  }
  if (["property"].includes(id)) {
    return [
      "Review and advise on the property matter",
      "Single task only: contract review, special conditions, or title issue",
      "Advise and handle the property matter through to completion",
    ];
  }
  if (["commercial", "contract-disputes", "ip", "consumer", "debt-insolvency", "construction", "environmental", "administrative"].includes(id)) {
    return [
      "Review and advise on the business or dispute matter",
      "Single task only: contract drafting, contract review, negotiation support, or demand letter",
      "Advise and act on the full matter through to completion",
    ];
  }
  if (["wills-probate", "estate-litigation", "elder-law", "retirement"].includes(id)) {
    return [
      "Review and advise on the wills, estate, or elder law matter",
      "Single task only: probate application, will review, or executor correspondence",
      "Advise and manage the matter through to completion",
    ];
  }
  if (["immigration"].includes(id)) {
    return [
      "Review and advise on options and prospects",
      "Single task only: application review, response draft, or submission preparation",
      "Advise and act on the visa or appeal matter through to completion",
    ];
  }
  if (["tax"].includes(id)) {
    return [
      "Review and advise on the tax issue",
      "Single task only: response draft, objection review, or document advice",
      "Advise and act on the tax matter through to completion",
    ];
  }
  if (["neighbourhood", "other"].includes(id)) {
    return [
      "Review and advise on the matter",
      "Single task only: letter, agreement, or one-off advice task",
      "Advise and act on the matter through to completion",
    ];
  }

  return [
    "Review and advise on the matter",
    "Single task only: a defined one-off task",
    "Advise and act on the matter through to completion",
  ];
}

function populateScopeOfWorkOptions(select, practiceAreaId, selectedValue) {
  if (!select) {
    return;
  }

  const options = buildScopeOfWorkOptions(practiceAreaId);
  const normalizedSelected = String(selectedValue || "").trim();
  const selectedExists = normalizedSelected && options.includes(normalizedSelected);
  const renderedOptions = selectedExists || !normalizedSelected ? options : [...options, normalizedSelected];

  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select";
  placeholder.selected = !normalizedSelected;
  select.appendChild(placeholder);
  renderedOptions.forEach((label) => {
    const option = document.createElement("option");
    option.value = label;
    option.textContent = !selectedExists && normalizedSelected && label === normalizedSelected ? `${label} (saved)` : label;
    if (normalizedSelected && label === normalizedSelected) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

function populateBudgetOptions(select, country, selectedValue) {
  if (!select) {
    return;
  }

  const options = buildBudgetRangeOptions(country);
  const normalizedSelected = String(selectedValue || "").trim();
  const selectedExists = normalizedSelected && options.includes(normalizedSelected);
  const renderedOptions = selectedExists || !normalizedSelected ? options : [...options, normalizedSelected];

  select.innerHTML = "";
  renderedOptions.forEach((label) => {
    const option = document.createElement("option");
    option.value = label;
    option.textContent = !selectedExists && normalizedSelected && label === normalizedSelected ? `${label} (saved)` : label;
    if (normalizedSelected ? label === normalizedSelected : label === options[0]) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

function setFormEnabled(form, enabled) {
  if (!form) {
    return;
  }
  Array.from(form.elements).forEach((element) => {
    if (element.id === "privateBid" || element.tagName === "BUTTON" || element.name?.startsWith("prompt:")) {
      return;
    }
    if (element.id === "clientName" || element.id === "lawyerEmail") {
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

function createClientId(prefix) {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function stripFileExtension(value) {
  return String(value || "").replace(/\.[^.]+$/, "");
}

function normalizeDocumentDate(value) {
  const normalized = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function normalizeMatterDocumentEntry(entry) {
  if (!entry) {
    return null;
  }

  if (typeof entry === "string") {
    const name = entry.trim();
    if (!name) {
      return null;
    }
    return {
      id: createClientId("doc"),
      name,
      title: stripFileExtension(name),
      documentDate: "",
      mimeType: "",
      size: 0,
      dataUrl: "",
    };
  }

  if (typeof entry !== "object") {
    return null;
  }

  const name = String(entry.name || entry.fileName || "").trim();
  if (!name) {
    return null;
  }

  return {
    id: String(entry.id || createClientId("doc")),
    name,
    title: String(entry.title || stripFileExtension(name)).trim().slice(0, 120),
    documentDate: normalizeDocumentDate(entry.documentDate),
    mimeType: String(entry.mimeType || entry.type || "").trim(),
    size: Number.isFinite(Number(entry.size)) ? Math.max(0, Number(entry.size)) : 0,
    dataUrl: typeof entry.dataUrl === "string" && entry.dataUrl.startsWith("data:") ? entry.dataUrl : "",
  };
}

function setMatterDocuments(documents) {
  state.matterDocuments = Array.isArray(documents)
    ? documents.map(normalizeMatterDocumentEntry).filter(Boolean).slice(0, MAX_MATTER_DOCUMENTS)
    : [];
  renderMatterDocumentList();
}

function handleMatterDocumentUploaderClick() {
  if (!elements.matterDocumentInput || elements.matterDocumentInput.disabled) {
    return;
  }
  elements.matterDocumentInput.click();
}

function handleMatterDocumentUploaderKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  handleMatterDocumentUploaderClick();
}

function handleMatterDocumentDragEnter(event) {
  event.preventDefault();
  if (!elements.matterDocumentUploader || elements.matterDocumentInput?.disabled) {
    return;
  }
  elements.matterDocumentUploader.classList.add("is-drag-over");
}

function handleMatterDocumentDragLeave(event) {
  if (!elements.matterDocumentUploader) {
    return;
  }
  if (event.currentTarget.contains(event.relatedTarget)) {
    return;
  }
  elements.matterDocumentUploader.classList.remove("is-drag-over");
}

async function handleMatterDocumentDrop(event) {
  event.preventDefault();
  if (!elements.matterDocumentUploader) {
    return;
  }
  elements.matterDocumentUploader.classList.remove("is-drag-over");
  if (elements.matterDocumentInput?.disabled) {
    return;
  }
  await addMatterDocuments(event.dataTransfer?.files);
}

async function handleMatterDocumentInputChange(event) {
  await addMatterDocuments(event.target?.files);
  if (event.target) {
    event.target.value = "";
  }
}

async function addMatterDocuments(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) {
    return;
  }

  if (state.matterDocuments.length + files.length > MAX_MATTER_DOCUMENTS) {
    showToast(`You can attach up to ${MAX_MATTER_DOCUMENTS} documents per case.`);
    return;
  }

  let totalBytes = state.matterDocuments.reduce((sum, entry) => sum + (Number(entry.size) || 0), 0);
  const nextDocuments = [...state.matterDocuments];

  for (const file of files) {
    if (file.size > MAX_MATTER_DOCUMENT_BYTES_PER_FILE) {
      showToast(`${file.name} is too large. Keep each file under 2 MB.`);
      continue;
    }
    if (totalBytes + file.size > MAX_MATTER_DOCUMENT_BYTES_TOTAL) {
      showToast("Uploaded documents are too large together. Keep the total under 3 MB.");
      continue;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      nextDocuments.push({
        id: createClientId("doc"),
        name: file.name,
        title: stripFileExtension(file.name),
        documentDate: "",
        mimeType: file.type || "",
        size: file.size || 0,
        dataUrl,
      });
      totalBytes += file.size || 0;
    } catch (_error) {
      showToast(`Unable to load ${file.name}. Please try again.`);
    }
  }

  state.matterDocuments = nextDocuments;
  renderMatterDocumentList();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

function handleMatterDocumentListClick(event) {
  if (elements.matterDocumentInput?.disabled) {
    return;
  }
  const button = event.target.closest("[data-document-action]");
  if (!button) {
    return;
  }
  const documentId = button.dataset.documentId;
  if (!documentId) {
    return;
  }

  if (button.dataset.documentAction === "delete") {
    state.matterDocuments = state.matterDocuments.filter((entry) => entry.id !== documentId);
    renderMatterDocumentList();
  }
}

function handleMatterDocumentListInput(event) {
  const field = event.target?.dataset?.documentField;
  const documentId = event.target?.dataset?.documentId;
  if (!field || !documentId) {
    return;
  }

  const documentEntry = state.matterDocuments.find((entry) => entry.id === documentId);
  if (!documentEntry) {
    return;
  }

  if (field === "title") {
    documentEntry.title = String(event.target.value || "").trimStart().slice(0, 120);
    return;
  }

  if (field === "documentDate") {
    documentEntry.documentDate = normalizeDocumentDate(event.target.value);
  }
}

function renderMatterDocumentList() {
  if (!elements.matterDocumentList || !elements.matterDocumentUploader) {
    return;
  }

  const disabled = Boolean(elements.matterDocumentInput?.disabled);
  elements.matterDocumentUploader.setAttribute("aria-disabled", String(disabled));

  if (!state.matterDocuments.length) {
    elements.matterDocumentList.innerHTML = '<p class="document-empty">No documents uploaded yet.</p>';
    return;
  }

  elements.matterDocumentList.innerHTML = state.matterDocuments.map(renderMatterDocumentCard).join("");
}

function renderMatterDocumentCard(entry) {
  const disabled = Boolean(elements.matterDocumentInput?.disabled);
  const titleValue = escapeHtml(entry.title || "");
  const id = escapeHtml(entry.id);
  const name = escapeHtml(entry.name || "Document");
  const documentDate = escapeHtml(entry.documentDate || "");
  const meta = [entry.mimeType, formatFileSize(entry.size)].filter(Boolean).join(" · ");

  return `
    <article class="uploaded-document-card">
      <div class="uploaded-document-header">
        <div>
          <strong>${name}</strong>
          <p>${escapeHtml(meta || "Uploaded document")}</p>
        </div>
        <button class="button ghost" type="button" data-document-action="delete" data-document-id="${id}" ${disabled ? "disabled" : ""}>Delete</button>
      </div>
      <div class="form-grid uploaded-document-meta">
        <label>
          Short title
          <input type="text" value="${titleValue}" placeholder="e.g. Parenting plan" data-document-field="title" data-document-id="${id}" />
        </label>
        <label>
          Date of document
          <input type="date" value="${documentDate}" data-document-field="documentDate" data-document-id="${id}" />
        </label>
      </div>
    </article>
  `;
}

function renderCaseDocument(entry) {
  const documentEntry = normalizeMatterDocumentEntry(entry);
  if (!documentEntry) {
    return "";
  }

  const title = escapeHtml(documentEntry.title || stripFileExtension(documentEntry.name) || documentEntry.name);
  const fileName = escapeHtml(documentEntry.name);
  const dateLabel = documentEntry.documentDate ? `<span class="pill neutral">${escapeHtml(documentEntry.documentDate)}</span>` : "";
  const downloadAction = documentEntry.dataUrl
    ? `<a class="document-link" href="${escapeHtml(documentEntry.dataUrl)}" download="${fileName}">Download</a>`
    : "";

  return `
    <div class="case-document-row">
      <div>
        <strong>${title}</strong>
        <p>${fileName}</p>
      </div>
      <div class="case-document-actions">
        ${dateLabel}
        ${downloadAction}
      </div>
    </div>
  `;
}

function formatFileSize(bytes) {
  const value = Number(bytes) || 0;
  if (!value) {
    return "";
  }
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${value} B`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatLabel(value) {
  return String(value || "")
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
  const params = new URLSearchParams(window.location.search);
  const signupCurrent = pathname === "/account" && params.get("mode") === "signup" ? ' aria-current="page"' : "";
  const signinCurrent = pathname === "/account" && params.get("mode") !== "signup" ? ' aria-current="page"' : "";
  return `
    <a class="main-nav-cta" href="/client"${clientCurrent}>Post a new case</a>
    <a href="/account?mode=signup"${signupCurrent}>Sign up</a>
    <a href="/account?mode=signin"${signinCurrent}>Sign in</a>
  `;
}

function getPublicSecondaryNavMarkup(pathname) {
  const lawyerCurrent = pathname === "/lawyer" ? ' aria-current="page"' : "";
  return `
    <a href="/account?role=lawyer"${lawyerCurrent}>Register as a lawyer</a>
    <span class="header-jurisdiction-chip" data-region-badge>Detected region: <strong></strong></span>
  `;
}

function getFooterMarkup() {
  const dashboardPath = getDashboardPath(state.currentUser);
  const existingUserLinks = state.currentUser
    ? `
        <a href="${dashboardPath}">Dashboard</a>
        <a href="/account">My account</a>
        <a href="/account?role=lawyer">Lawyer access</a>
      `
    : `
        <a href="/account?mode=signup">Sign up</a>
        <a href="/account?mode=signin">Sign in</a>
        <a href="/account?role=lawyer">Register as a lawyer</a>
      `;

  return `
    <div class="footer-menu">
      <section class="footer-column">
        <h3>Discover</h3>
        <div class="footer-link-list">
          <a href="/">Home</a>
          <a href="/client">Post a new case</a>
          <a href="/client">How it works</a>
          <a href="/lawyer">For lawyers</a>
        </div>
      </section>
      <section class="footer-column">
        <h3>Company</h3>
        <div class="footer-link-list">
          <a href="/about">About us</a>
          <a href="/contact">Contact us</a>
          <a href="/terms">Terms of Use</a>
        </div>
      </section>
      <section class="footer-column">
        <h3>Existing Users</h3>
        <div class="footer-link-list">
          ${existingUserLinks}
        </div>
      </section>
      <section class="footer-column">
        <h3>Popular Categories</h3>
        <div class="footer-link-list">
          <span>Family law</span>
          <span>Employment</span>
          <span>Commercial</span>
          <span>Property</span>
          <span>Wills and estates</span>
          <span>Criminal</span>
        </div>
      </section>
      <section class="footer-column">
        <h3>Popular Locations</h3>
        <div class="footer-link-list">
          <span>Sydney</span>
          <span>Melbourne</span>
          <span>Brisbane</span>
          <span>Perth</span>
          <span>Adelaide</span>
          <span>Canberra</span>
        </div>
      </section>
    </div>
    <div class="footer-meta">
      <p>&copy; 2026 Kamieno. All rights reserved.</p>
      <p>Clearer case briefs, structured lawyer responses, and a cleaner path to choosing the right legal help.</p>
    </div>
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
      phone: user.phone || "",
      address: user.address || "",
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
