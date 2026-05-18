const STORAGE = {
  company: "willpaint.company",
  current: "willpaint.currentQuote",
  history: "willpaint.history",
  counter: "willpaint.counter",
  counters: "willpaint.counters",
  draftCounter: "willpaint.draftCounter"
};

const DEFAULT_COMPANY = {
  name: "Will'Paint",
  email: "willpaint@outlook.fr",
  phone: "06 50 80 80 83",
  address: "6 rue des Pautes\n38430 Moirans",
  siret: "10338965600010",
  logo: ""
};

const AVAILABLE_SERVICES = [
  "Lessivage",
  "Peinture murs",
  "Peinture plafond",
  "Sous-couche",
  "Préparation support",
  "Rebouchage léger",
  "Rebouchage important",
  "Ponçage",
  "Protection des sols",
  "Protection des meubles",
  "Dépose papier peint",
  "Pose toile de verre",
  "Peinture boiseries",
  "Peinture portes",
  "Peinture fenêtres",
  "Peinture radiateurs",
  "Nettoyage fin de chantier",
  "Déplacement",
  "Main-d’œuvre",
  "Forfait chantier",
  "Autre / Ligne libre"
];

const ROOM_TYPES = [
  "Salon",
  "Salle à manger",
  "Chambre",
  "Cuisine",
  "Salle de bain",
  "WC",
  "Couloir",
  "Entrée",
  "Bureau",
  "Escalier",
  "Garage",
  "Cave",
  "Buanderie",
  "Extérieur",
  "Autre / Libre"
];

const quoteFields = [
  "documentId",
  "clientName",
  "clientPhone",
  "clientEmail",
  "clientAddress",
  "quoteDate",
  "quoteNumber",
  "documentType",
  "documentStatus",
  "siteAddress",
  "roomType",
  "roomTypeCustom",
  "wallSurface",
  "ceilingSurface",
  "coatCount",
  "supportState",
  "prepNeeded",
  "vatRate",
  "quoteObservations",
  "conditions"
];

const companyFields = ["companyName", "companyPhone", "companyEmail", "companyAddress", "companySiret"];

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const QUANTITY_ERROR = "Veuillez entrer un nombre entier.";
let currentPhotos = [];

const form = document.querySelector("#quoteForm");
const companyForm = document.querySelector("#companyForm");
const linesBody = document.querySelector("#linesBody");
const mobileLinesBody = document.querySelector("#mobileLinesBody");
const serviceSelect = document.querySelector("#serviceSelect");
const addSelectedServiceBtn = document.querySelector("#addSelectedServiceBtn");
const lineTemplate = document.querySelector("#lineTemplate");
const preview = document.querySelector("#quotePreview");
const mobileStepLabels = ["Client", "Chantier", "Prestations", "Photos", "Résumé / PDF"];
let currentMobileStep = 1;

document.addEventListener("DOMContentLoaded", init);

function init() {
  ensureCompany();
  fillCompanyForm(loadCompany());
  startQuote(loadCurrentQuote());
  renderServiceSelect();
  bindEvents();
  refreshHistory();
  updateMobileStep();
  calculateAndRender();

  disableServiceWorkerCache();
}

function bindEvents() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  form.addEventListener("input", (event) => {
    if (["wallSurface", "ceilingSurface", "coatCount"].includes(event.target.id)) {
      syncSurfaceLines();
      renderMobileLineCards();
    }
    calculateAndRender();
    saveCurrentQuietly();
  });

  form.addEventListener("change", () => {
    calculateAndRender();
    saveCurrentQuietly();
  });

  document.querySelector("#saveQuoteBtn").addEventListener("click", saveQuote);
  document.querySelector("#newQuoteBtn").addEventListener("click", newQuote);
  document.querySelector("#clearCurrentBtn").addEventListener("click", clearCurrentQuote);
  document.querySelector("#pdfBtn").addEventListener("click", generatePdf);
  document.querySelector("#mailBtn").addEventListener("click", sendMail);
  document.querySelector("#libreOfficeBtn").addEventListener("click", exportLibreOfficeHtml);
  document.querySelector("#jsonBtn").addEventListener("click", exportJson);
  document.querySelector("#csvBtn").addEventListener("click", exportCsv);
  document.querySelector("#photoInput").addEventListener("change", handlePhotoInput);
  document.querySelector("#documentType").addEventListener("change", updateDocumentNumberForStatus);
  document.querySelector("#documentStatus").addEventListener("change", () => {
    calculateAndRender();
    saveCurrentQuietly();
  });
  document.querySelector("#roomType").addEventListener("change", updateRoomTypeCustomVisibility);
  addSelectedServiceBtn.addEventListener("click", addSelectedService);
  document.querySelector("#validateOfficialBtn").addEventListener("click", validateOfficialDocument);
  document.querySelector("#markPaidBtn").addEventListener("click", markInvoicePaid);
  document.querySelector("#cancelDocumentBtn").addEventListener("click", cancelOfficialDocument);
  document.querySelector("#exportBackupBtn").addEventListener("click", exportBackup);
  document.querySelector("#importBackupInput").addEventListener("change", importBackup);
  document.querySelector("#saveCompanyBtn").addEventListener("click", saveCompanySettings);
  document.querySelector("#resetCompanyBtn").addEventListener("click", resetCompanySettings);
  document.querySelector("#companyLogo").addEventListener("change", handleCompanyLogo);
  document.querySelector("#prevStepBtn").addEventListener("click", previousMobileStep);
  document.querySelector("#nextStepBtn").addEventListener("click", nextMobileStep);
}

function renderServiceSelect() {
  serviceSelect.innerHTML = [
    `<option value="">Choisir une prestation</option>`,
    ...AVAILABLE_SERVICES.map((service) => {
      return `<option value="${escapeAttribute(service)}">${escapeHtml(service)}</option>`;
    })
  ].join("");
}

function addSelectedService() {
  const service = serviceSelect.value;
  if (!service) {
    alert("Choisissez une prestation avant d'ajouter une ligne.");
    return;
  }

  const description = service === "Autre / Ligne libre" ? "" : service;
  addLine({ kind: "service", description, quantity: 1, unit: "forfait", unitPrice: 0 });
  serviceSelect.value = "";
  calculateAndRender();
  saveCurrentQuietly();
}

function previousMobileStep() {
  currentMobileStep = Math.max(1, currentMobileStep - 1);
  updateMobileStep();
}

function nextMobileStep() {
  currentMobileStep = Math.min(mobileStepLabels.length, currentMobileStep + 1);
  updateMobileStep();
}

function updateMobileStep() {
  document.querySelectorAll("[data-mobile-step]").forEach((element) => {
    element.classList.toggle("mobile-step-active", Number(element.dataset.mobileStep) === currentMobileStep);
  });

  document.querySelector("#stepCounter").textContent = `Étape ${currentMobileStep}/${mobileStepLabels.length}`;
  document.querySelector("#stepTitle").textContent = mobileStepLabels[currentMobileStep - 1];
  document.querySelectorAll(".step-dot").forEach((dot, index) => {
    dot.classList.toggle("active", index === currentMobileStep - 1);
    dot.classList.toggle("done", index < currentMobileStep - 1);
  });

  const previousButton = document.querySelector("#prevStepBtn");
  const nextButton = document.querySelector("#nextStepBtn");
  previousButton.disabled = currentMobileStep === 1;
  nextButton.textContent = currentMobileStep === mobileStepLabels.length ? "Résumé affiché" : "Suivant";
  nextButton.disabled = currentMobileStep === mobileStepLabels.length;
}

function disableServiceWorkerCache() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => registrations.forEach((registration) => registration.unregister()))
    .catch(() => {});
}

function showView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
  document.querySelector(`#${viewId}`).classList.add("active-view");
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
  if (viewId === "historyView") refreshHistory();
  if (viewId === "quoteView") updateMobileStep();
}

function ensureCompany() {
  if (!localStorage.getItem(STORAGE.company)) {
    localStorage.setItem(STORAGE.company, JSON.stringify(DEFAULT_COMPANY));
  }
}

function loadCompany() {
  return { ...DEFAULT_COMPANY, ...readJson(STORAGE.company, DEFAULT_COMPANY) };
}

function fillCompanyForm(company) {
  document.querySelector("#companyName").value = company.name;
  document.querySelector("#companyPhone").value = company.phone;
  document.querySelector("#companyEmail").value = company.email;
  document.querySelector("#companyAddress").value = company.address;
  document.querySelector("#companySiret").value = company.siret;
  renderHeaderLogo(company);
}

function saveCompanySettings() {
  const previous = loadCompany();
  const company = {
    name: document.querySelector("#companyName").value.trim() || DEFAULT_COMPANY.name,
    phone: document.querySelector("#companyPhone").value.trim(),
    email: document.querySelector("#companyEmail").value.trim(),
    address: document.querySelector("#companyAddress").value.trim(),
    siret: document.querySelector("#companySiret").value.trim(),
    logo: previous.logo || ""
  };
  localStorage.setItem(STORAGE.company, JSON.stringify(company));
  renderHeaderLogo(company);
  calculateAndRender();
  alert("Paramètres entreprise enregistrés.");
}

function resetCompanySettings() {
  if (!confirm("Réinitialiser les informations entreprise avec les données Will'Paint ?")) return;
  localStorage.setItem(STORAGE.company, JSON.stringify(DEFAULT_COMPANY));
  fillCompanyForm(DEFAULT_COMPANY);
  calculateAndRender();
}

async function handleCompanyLogo(event) {
  const file = event.target.files[0];
  if (!file) return;
  const company = loadCompany();
  company.logo = await imageToDataUrl(file, 500);
  localStorage.setItem(STORAGE.company, JSON.stringify(company));
  renderHeaderLogo(company);
  calculateAndRender();
}

function renderHeaderLogo(company) {
  const headerLogo = document.querySelector("#headerLogo");
  headerLogo.innerHTML = company.logo ? `<img src="${company.logo}" alt="Logo Will'Paint">` : initials(company.name);
}

function startQuote(savedQuote) {
  const quote = savedQuote || createBlankQuote();
  normalizeDocumentState(quote);
  quote.roomTypeCustom = quote.roomTypeCustom || "";
  preserveCustomRoomType(quote);
  quoteFields.forEach((id) => {
    const field = document.querySelector(`#${id}`);
    if (!field || quote[id] === undefined) return;
    if (field.type === "checkbox") field.checked = Boolean(quote[id]);
    else field.value = quote[id];
  });
  updateRoomTypeCustomVisibility();
  updateDocumentUi();
  currentPhotos = quote.photos || [];
  linesBody.innerHTML = "";
  (quote.lines || []).forEach(addLine);
  syncSurfaceLines();
  renderPhotos();
  saveCurrentQuietly();
}

function createBlankQuote() {
  return {
    quoteDate: new Date().toISOString().slice(0, 10),
    documentId: createDraftId(),
    quoteNumber: "DEVIS BROUILLON",
    documentType: "devis",
    documentStatus: "brouillon",
    isOfficial: false,
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    clientAddress: "",
    siteAddress: "",
    roomType: "",
    roomTypeCustom: "",
    wallSurface: 0,
    ceilingSurface: 0,
    coatCount: 2,
    supportState: "Bon",
    prepNeeded: "Oui",
    vatRate: "0.212",
    quoteObservations: "",
    conditions: "Devis valable 30 jours. Acompte de 30 % à la commande. Solde à la réception des travaux.",
    lines: [],
    photos: []
  };
}

function preserveCustomRoomType(quote) {
  if (!quote.roomType || ROOM_TYPES.includes(quote.roomType) || quote.roomTypeCustom) return;
  quote.roomTypeCustom = quote.roomType;
  quote.roomType = "Autre / Libre";
}

function normalizeDocumentState(quote) {
  const state = normalizedDocumentState(quote);
  quote.documentType = state.documentType;
  quote.documentStatus = state.documentStatus;
  quote.documentKind = documentKindFromType(state.documentType);
  quote.documentTitle = documentTitle(quote);
  quote.isOfficial = state.documentStatus !== "brouillon" && isOfficialNumber(quote.quoteNumber);
  if (!quote.documentId) quote.documentId = createDraftId();
  if (!quote.quoteNumber || !isOfficialNumber(quote.quoteNumber)) quote.quoteNumber = "DEVIS BROUILLON";
}

function normalizedDocumentState(quote) {
  const rawStatus = quote.documentStatus || "";
  const rawType = quote.documentType || "";
  const kind = documentKindFromNumber(quote.quoteNumber);
  let documentType = rawType || (kind === "FAC" ? "facture" : "devis");
  let documentStatus = rawStatus || "brouillon";

  if (rawStatus === "devis" || rawStatus === "facture") {
    documentType = rawStatus;
    documentStatus = isOfficialNumber(quote.quoteNumber) || quote.isOfficial ? "validé" : "brouillon";
  }

  if (rawStatus === "payé") {
    documentType = "facture";
    documentStatus = "payé";
  }

  if (rawStatus === "annulé") {
    documentType = rawType || (kind === "FAC" ? "facture" : "devis");
    documentStatus = "annulé";
  }

  if (!["devis", "facture"].includes(documentType)) documentType = kind === "FAC" ? "facture" : "devis";
  if (!["brouillon", "en_attente", "validé", "payé", "annulé"].includes(documentStatus)) documentStatus = "brouillon";
  if (documentType === "devis" && documentStatus === "payé") documentStatus = "validé";

  return { documentType, documentStatus };
}

function updateRoomTypeCustomVisibility() {
  const customWrap = document.querySelector("#roomTypeCustomWrap");
  const customInput = document.querySelector("#roomTypeCustom");
  const isCustom = document.querySelector("#roomType").value === "Autre / Libre";
  customWrap.classList.toggle("hidden-field", !isCustom);
  if (!isCustom) customInput.value = "";
}

function updateDocumentNumberForStatus() {
  const numberInput = document.querySelector("#quoteNumber");
  const currentNumber = numberInput.value.trim();
  if (!isOfficialNumber(currentNumber)) {
    numberInput.value = "DEVIS BROUILLON";
  }
  calculateAndRender();
  saveCurrentQuietly();
}

function updateDocumentUi() {
  const quote = collectQuote();
  const isInvoice = quote.documentType === "facture";
  const isValidatedInvoice = isInvoice && quote.documentStatus === "validé" && quote.isOfficial;

  document.querySelector("#statusDisplay").textContent = statusLabel(quote.documentStatus);
  document.querySelector("#saveQuoteBtn").classList.toggle("hidden-field", quote.isOfficial);
  document.querySelector("#validateOfficialBtn").classList.toggle("hidden-field", !["brouillon", "en_attente"].includes(quote.documentStatus) || quote.isOfficial);
  document.querySelector("#markPaidBtn").classList.toggle("hidden-field", !isValidatedInvoice);
  document.querySelector("#cancelDocumentBtn").classList.toggle("hidden-field", quote.documentStatus !== "validé" || !quote.isOfficial);
  document.querySelector("#documentType").disabled = quote.isOfficial;
  document.querySelector("#documentStatus").disabled = quote.isOfficial;
}

function addLine(line) {
  const row = lineTemplate.content.firstElementChild.cloneNode(true);
  row.dataset.kind = line.kind || "service";
  row.querySelector(".line-description").value = line.description || "";
  row.querySelector(".line-quantity").value = normalizeQuantity(line.quantity);
  bindQuantityInput(row.querySelector(".line-quantity"));
  row.querySelector(".line-unit").value = line.unit || "";
  row.querySelector(".line-price").value = line.unitPrice || 0;
  row.querySelector(".remove-line").addEventListener("click", () => {
    row.remove();
    renderMobileLineCards();
    calculateAndRender();
    saveCurrentQuietly();
  });
  row.querySelectorAll("input, textarea, .line-unit").forEach((input) => {
    input.addEventListener("input", () => {
      renderMobileLineCards();
      calculateAndRender();
      saveCurrentQuietly();
    });
    input.addEventListener("change", () => {
      renderMobileLineCards();
      calculateAndRender();
      saveCurrentQuietly();
    });
  });
  linesBody.appendChild(row);
  renderMobileLineCards();
}

function renderMobileLineCards() {
  if (!mobileLinesBody) return;
  mobileLinesBody.innerHTML = "";

  getLineRows().forEach((row, index) => {
    const card = document.createElement("article");
    card.className = "mobile-line-card";
    card.dataset.index = String(index);
    card.innerHTML = `
      <button class="mobile-remove-line" type="button" aria-label="Supprimer la ligne">✕</button>
      <label>Désignation
        <input class="mobile-description" value="${escapeAttribute(row.querySelector(".line-description").value)}">
      </label>
      <div class="mobile-line-grid">
        <label>Quantité
          <input class="mobile-quantity" type="text" inputmode="numeric" pattern="[0-9]*" value="${escapeAttribute(row.querySelector(".line-quantity").value)}">
          <small class="quantity-message" aria-live="polite"></small>
        </label>
        <label>Unité
          <select class="mobile-unit">${unitOptionsHtml(row.querySelector(".line-unit").value)}</select>
        </label>
        <label>Prix HT
          <input class="mobile-price" type="number" inputmode="decimal" min="0" step="0.01" value="${escapeAttribute(row.querySelector(".line-price").value)}">
        </label>
      </div>
      <div class="mobile-line-total"><span>Total HT</span><strong>${row.querySelector(".line-total").textContent}</strong></div>
    `;

    card.querySelector(".mobile-remove-line").addEventListener("click", () => {
      row.remove();
      renderMobileLineCards();
      calculateAndRender();
      saveCurrentQuietly();
    });

    bindQuantityInput(card.querySelector(".mobile-quantity"));

    card.querySelectorAll("input, .mobile-unit").forEach((input) => {
      input.addEventListener("input", () => {
        updateDesktopLineFromMobileCard(row, card);
        calculateAndRender();
        updateMobileCardTotal(row, card);
        saveCurrentQuietly();
      });
      input.addEventListener("change", () => {
        updateDesktopLineFromMobileCard(row, card);
        calculateAndRender();
        updateMobileCardTotal(row, card);
        saveCurrentQuietly();
      });
    });

    mobileLinesBody.appendChild(card);
  });
}

function updateDesktopLineFromMobileCard(row, card) {
  row.querySelector(".line-description").value = card.querySelector(".mobile-description")?.value || "";
  row.querySelector(".line-quantity").value = normalizeQuantity(card.querySelector(".mobile-quantity")?.value);
  row.querySelector(".line-unit").value = card.querySelector(".mobile-unit")?.value || "";
  row.querySelector(".line-price").value = card.querySelector(".mobile-price")?.value || 0;
}

function unitOptionsHtml(selectedUnit) {
  return ["forfait", "m²", "heure", "jour"].map((unit) => {
    return `<option value="${escapeAttribute(unit)}"${unit === selectedUnit ? " selected" : ""}>${escapeHtml(unit)}</option>`;
  }).join("");
}

function updateMobileCardTotal(row, card) {
  const total = card.querySelector(".mobile-line-total strong");
  if (total) total.textContent = row.querySelector(".line-total").textContent;
}

function bindQuantityInput(input) {
  if (!input || input.dataset.quantityBound === "true") return;
  input.dataset.quantityBound = "true";

  input.addEventListener("beforeinput", (event) => {
    if (event.data && /[.,\D]/.test(event.data)) {
      event.preventDefault();
      showQuantityMessage(input);
    }
  });

  input.addEventListener("paste", (event) => {
    const text = event.clipboardData?.getData("text") || "";
    if (!/^[1-9]\d*$/.test(text.trim())) {
      event.preventDefault();
      showQuantityMessage(input);
    }
  });

  input.addEventListener("input", () => {
    const original = input.value;
    const hasDecimal = /[.,]/.test(original);
    const integerPart = hasDecimal ? original.split(/[.,]/)[0] : original;
    const cleaned = integerPart.replace(/\D/g, "");
    input.value = cleaned;

    if (input.value !== original) showQuantityMessage(input);
    if (input.value && !/^[1-9]\d*$/.test(input.value)) {
      input.value = String(normalizeQuantity(input.value));
      showQuantityMessage(input);
    }
  });

  input.addEventListener("blur", () => {
    input.value = normalizeQuantity(input.value);
  });
}

function normalizeQuantity(value) {
  const text = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(text)) return 1;
  return Math.max(1, parseInt(text, 10));
}

function showQuantityMessage(input) {
  const message = input.closest("td, label")?.querySelector(".quantity-message");
  if (!message) return;
  message.textContent = QUANTITY_ERROR;
  window.clearTimeout(input.quantityMessageTimer);
  input.quantityMessageTimer = window.setTimeout(() => {
    message.textContent = "";
  }, 2200);
}

function syncSurfaceLines() {
  const walls = numberValue("wallSurface") * Math.max(1, numberValue("coatCount"));
  const ceiling = numberValue("ceilingSurface") * Math.max(1, numberValue("coatCount"));
  const totalSurface = walls + ceiling;

  getLineRows().forEach((row) => {
    const description = row.querySelector(".line-description").value.trim();
    if (description === "Peinture murs") row.querySelector(".line-quantity").value = normalizeQuantity(Math.ceil(walls));
    if (description === "Peinture plafond") row.querySelector(".line-quantity").value = normalizeQuantity(Math.ceil(ceiling));
    if (description === "Sous-couche") row.querySelector(".line-quantity").value = normalizeQuantity(Math.ceil(totalSurface));
  });
}

function collectQuote() {
  const quote = {};
  quoteFields.forEach((id) => {
    const field = document.querySelector(`#${id}`);
    quote[id] = field.type === "checkbox" ? field.checked : field.value.trim();
  });

  quote.company = loadCompany();
  quote.roomTypeLabel = displayRoomType(quote);
  quote.documentKind = isOfficialNumber(quote.quoteNumber) ? documentKindFromNumber(quote.quoteNumber) : documentKindFromType(quote.documentType);
  quote.documentTitle = documentTitle(quote);
  quote.isOfficial = isOfficialNumber(quote.quoteNumber) && quote.documentStatus !== "brouillon";
  quote.lines = getLineRows().map((row) => {
    const quantityInput = row.querySelector(".line-quantity");
    const quantity = normalizeQuantity(quantityInput.value);
    quantityInput.value = quantity;
    const unitPrice = parseFloat(row.querySelector(".line-price").value) || 0;
    const total = quantity * unitPrice;
    row.querySelector(".line-total").textContent = euros.format(total);
    return {
      kind: "service",
      description: row.querySelector(".line-description").value.trim(),
      quantity,
      unit: row.querySelector(".line-unit").value.trim(),
      unitPrice,
      total
    };
  });

  quote.photos = currentPhotos;
  quote.totalHt = quote.lines.reduce((sum, line) => sum + line.total, 0);
  quote.vatRate = parseFloat(quote.vatRate) || 0;
  quote.totalVat = quote.totalHt * quote.vatRate;
  quote.totalTtc = quote.totalHt + quote.totalVat;
  quote.savedAt = new Date().toISOString();
  return quote;
}

function displayRoomType(quote) {
  if (quote.roomType === "Autre / Libre") return quote.roomTypeCustom || "";
  return quote.roomType || "";
}

function documentKindFromStatus(status) {
  return status === "payé" ? "FAC" : "DEV";
}

function documentKindFromType(type) {
  return type === "facture" ? "FAC" : "DEV";
}

function documentKindFromNumber(number) {
  const match = String(number || "").match(/^(DEV|FAC)-\d{4}-\d+$/);
  return match ? match[1] : "DEV";
}

function documentTitle(quote) {
  return (quote.documentKind || documentKindFromType(quote.documentType)) === "FAC" ? "FACTURE" : "DEVIS";
}

function documentStatusBanner(quote) {
  if (quote.documentStatus === "en_attente") {
    return `<div class="doc-draft-banner">DEVIS EN ATTENTE CLIENT / NON OFFICIEL</div>`;
  }

  if (!quote.isOfficial || quote.documentStatus === "brouillon") {
    return `<div class="doc-draft-banner">DEVIS BROUILLON / NON OFFICIEL</div>`;
  }

  if (quote.documentStatus === "payé" && quote.documentTitle === "FACTURE") {
    return `<div class="doc-paid-banner">FACTURE PAYÉE</div>`;
  }

  if (quote.documentStatus === "annulé") {
    return `<div class="doc-cancelled-banner">${escapeHtml(quote.documentTitle)} ANNULÉ${quote.documentTitle === "FACTURE" ? "E" : ""}</div>`;
  }

  return `<div class="doc-official-banner">Statut : Validé</div>`;
}

function statusLabel(status) {
  const labels = {
    brouillon: "Brouillon",
    en_attente: "En attente client",
    validé: "Validé",
    payé: "Payé",
    annulé: "Annulé"
  };
  return labels[status] || "Brouillon";
}

function typeLabel(type) {
  return type === "facture" ? "Facture" : "Devis";
}

function isOfficialNumber(number) {
  return /^(DEV|FAC)-\d{4}-\d{4,}$/.test(String(number || ""));
}

function calculateAndRender() {
  const quote = collectQuote();
  document.querySelector("#totalHt").textContent = euros.format(quote.totalHt);
  document.querySelector("#totalVat").textContent = euros.format(quote.totalVat);
  document.querySelector("#totalTtc").textContent = euros.format(quote.totalTtc);
  updateAllMobileCardTotals();
  renderPreview(quote);
  updateDocumentUi();
}

function updateAllMobileCardTotals() {
  if (!mobileLinesBody) return;
  getLineRows().forEach((row, index) => {
    const card = mobileLinesBody.querySelector(`.mobile-line-card[data-index="${index}"]`);
    if (card) updateMobileCardTotal(row, card);
  });
}

function renderPreview(quote) {
  const company = quote.company;
  const logo = company.logo ? `<img src="${company.logo}" alt="Logo Will'Paint">` : initials(company.name);
  const rows = quote.lines.map((line) => {
    return `
      <tr>
        <td>${escapeHtml(line.description)}</td>
        <td class="amount">${formatNumber(line.quantity)}</td>
        <td>${escapeHtml(line.unit)}</td>
        <td class="amount">${euros.format(line.unitPrice)}</td>
        <td class="amount">${euros.format(line.total)}</td>
      </tr>`;
  }).join("");

  const photos = quote.photos.length
    ? `<section class="doc-block"><h3>Photos chantier</h3><div class="doc-photo-grid">${quote.photos.map((photo) => `<img src="${photo.src}" alt="${escapeHtml(photo.caption || "Photo chantier")}">`).join("")}</div></section>`
    : "";
  const modeBanner = documentStatusBanner(quote);

  preview.innerHTML = `
    <div class="doc-header">
      <div class="brand-row">
        <div class="logo-box">${logo}</div>
        <div>
          <h2>${escapeHtml(company.name)}</h2>
          <p>${nl2br(company.address)}<br>${escapeHtml(company.phone)}<br>${escapeHtml(company.email)}<br>SIRET : ${escapeHtml(company.siret)}</p>
        </div>
      </div>
      <div class="quote-title">
        <h2>${escapeHtml(quote.documentTitle)}</h2>
        <p><strong>N° ${escapeHtml(quote.quoteNumber)}</strong><br>Date : ${formatDate(quote.quoteDate)}</p>
      </div>
    </div>

    ${modeBanner}
    <div class="doc-grid">
      <section class="doc-block">
        <h3>Client</h3>
        <p><strong>${escapeHtml(quote.clientName || "Nom client")}</strong><br>${nl2br(quote.clientAddress)}<br>${escapeHtml(quote.clientPhone)}<br>${escapeHtml(quote.clientEmail)}</p>
      </section>
      <section class="doc-block">
        <h3>Chantier</h3>
        <p>${nl2br(quote.siteAddress)}<br>Type de pièce : ${escapeHtml(quote.roomTypeLabel)}<br>Murs : ${formatNumber(quote.wallSurface)} m² | Plafond : ${formatNumber(quote.ceilingSurface)} m²<br>Couches : ${escapeHtml(quote.coatCount)} | Support : ${escapeHtml(quote.supportState)} | Préparation : ${escapeHtml(quote.prepNeeded)}</p>
      </section>
    </div>

    <section class="doc-block">
      <h3>Prestations</h3>
      <table class="quote-table">
        <thead><tr><th>Désignation</th><th>Qté</th><th>Unité</th><th>PU HT</th><th>Total HT</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="doc-totals">
        <div class="doc-total-line"><span>Total HT</span><strong>${euros.format(quote.totalHt)}</strong></div>
        <div class="doc-total-line"><span>TVA ${formatPercent(quote.vatRate)}</span><strong>${euros.format(quote.totalVat)}</strong></div>
        <div class="doc-total-line final"><span>Total TTC</span><strong>${euros.format(quote.totalTtc)}</strong></div>
      </div>
    </section>
    ${photos}
    ${quote.quoteObservations ? `<section class="doc-block"><h3>Observations</h3><p>${nl2br(quote.quoteObservations)}</p></section>` : ""}
    <section class="doc-block"><h3>Conditions</h3><p>${nl2br(quote.conditions)}</p></section>
    <div class="signature-zone">
      <div class="signature-box"><strong>${escapeHtml(company.name)}</strong></div>
      <div class="signature-box"><strong>Client</strong><p class="muted">Bon pour accord, date et signature</p></div>
    </div>`;
}

async function handlePhotoInput(event) {
  const files = Array.from(event.target.files || []);
  for (const file of files) {
    currentPhotos.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      src: await imageToDataUrl(file, 1200),
      caption: file.name.replace(/\.[^.]+$/, "")
    });
  }
  event.target.value = "";
  renderPhotos();
  calculateAndRender();
  saveCurrentQuietly();
}

function renderPhotos() {
  const photoGrid = document.querySelector("#photoGrid");
  photoGrid.innerHTML = currentPhotos.map((photo) => `
    <div class="photo-card" data-photo-id="${photo.id}">
      <img src="${photo.src}" alt="${escapeHtml(photo.caption)}">
      <button class="icon-button remove-photo" type="button" title="Supprimer la photo">×</button>
      <input class="photo-caption" value="${escapeAttribute(photo.caption)}" aria-label="Légende photo">
    </div>`).join("");

  photoGrid.querySelectorAll(".remove-photo").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.closest(".photo-card").dataset.photoId;
      currentPhotos = currentPhotos.filter((photo) => photo.id !== id);
      renderPhotos();
      calculateAndRender();
      saveCurrentQuietly();
    });
  });

  photoGrid.querySelectorAll(".photo-caption").forEach((input) => {
    input.addEventListener("input", () => {
      const id = input.closest(".photo-card").dataset.photoId;
      const photo = currentPhotos.find((item) => item.id === id);
      if (photo) photo.caption = input.value;
      calculateAndRender();
      saveCurrentQuietly();
    });
  });
}

function saveQuote() {
  const quote = collectQuote();
  saveHistoryDocument(quote);
  alert("Devis enregistré en brouillon dans l'historique. Aucun numéro officiel n'a été utilisé.");
}

function validateOfficialDocument() {
  let quote = collectQuote();
  if (!["brouillon", "en_attente"].includes(quote.documentStatus) || quote.isOfficial) return;
  if (!confirm("Le client accepte ce devis ? Voulez-vous le transformer en facture officielle ?")) return;
  const kind = "FAC";

  if (!isOfficialNumber(quote.quoteNumber) || documentKindFromNumber(quote.quoteNumber) !== "FAC") {
    document.querySelector("#quoteNumber").value = generateDocumentNumber(kind);
    document.querySelector("#documentType").value = "facture";
    document.querySelector("#documentStatus").value = "validé";
    quote = collectQuote();
  }

  quote.isOfficial = true;
  saveHistoryDocument(quote);
  updateDocumentUi();
  calculateAndRender();
  if (confirm(`Facture ${quote.quoteNumber} créée officiellement. Voulez-vous télécharger le PDF maintenant ?`)) {
    generatePdf();
  } else {
    alert("Pensez à exporter une sauvegarde régulièrement. Le PDF reste la vraie trace à conserver.");
  }
}

function markInvoicePaid() {
  let quote = collectQuote();
  if (quote.documentType !== "facture" || quote.documentStatus !== "validé" || !quote.isOfficial) return;
  if (!confirm("Marquer cette facture comme payée ?")) return;
  document.querySelector("#documentStatus").value = "payé";
  quote = collectQuote();
  saveHistoryDocument(quote);
  calculateAndRender();
  alert("Statut : Payé");
}

function cancelOfficialDocument() {
  let quote = collectQuote();
  if (quote.documentStatus !== "validé" || !quote.isOfficial) return;
  if (!confirm(`Annuler ce ${typeLabel(quote.documentType).toLowerCase()} ?`)) return;
  document.querySelector("#documentStatus").value = "annulé";
  quote = collectQuote();
  saveHistoryDocument(quote);
  calculateAndRender();
}

function saveHistoryDocument(quote) {
  localStorage.setItem(STORAGE.current, JSON.stringify(quote));
  const history = readJson(STORAGE.history, []);
  const key = historyKey({ quote });
  const existingIndex = history.findIndex((item) => {
    const itemQuote = item.quote || item;
    return historyKey(item) === key || (quote.documentId && itemQuote.documentId === quote.documentId);
  });
  const summary = {
    documentId: quote.documentId,
    quoteNumber: quote.quoteNumber,
    quoteDate: quote.quoteDate,
    clientName: quote.clientName,
    totalTtc: quote.totalTtc,
    documentStatus: quote.documentStatus,
    documentKind: quote.documentKind,
    isOfficial: quote.isOfficial,
    savedAt: quote.savedAt,
    quote
  };
  if (existingIndex >= 0) history[existingIndex] = summary;
  else history.unshift(summary);
  localStorage.setItem(STORAGE.history, JSON.stringify(history));
  refreshHistory();
}

function saveCurrentQuietly() {
  localStorage.setItem(STORAGE.current, JSON.stringify(collectQuote()));
}

function loadCurrentQuote() {
  return readJson(STORAGE.current, null);
}

function newQuote() {
  if (!confirm("Créer un nouveau devis ? Pensez à sauvegarder le devis actuel si besoin.")) return;
  localStorage.removeItem(STORAGE.current);
  startQuote(createBlankQuote());
  calculateAndRender();
}

function clearCurrentQuote() {
  if (!confirm("Vider le devis courant ?")) return;
  localStorage.removeItem(STORAGE.current);
  startQuote(createBlankQuote());
  showView("quoteView");
  calculateAndRender();
}

function refreshHistory() {
  const history = readJson(STORAGE.history, []).map(normalizeHistoryItem);
  const list = document.querySelector("#historyList");
  if (!history.length) {
    list.innerHTML = `<p class="muted">Aucun devis ou facture sauvegardé pour le moment.</p>`;
    return;
  }
  list.innerHTML = history.map((item) => `
    <article class="history-item" data-history-key="${escapeAttribute(historyKey(item))}">
      <div>
        <strong>${escapeHtml(item.quoteNumber)} - ${escapeHtml(item.clientName || "Client non renseigné")}</strong>
        <p class="history-meta">${formatDate(item.quoteDate)} · ${escapeHtml(historyTypeLabel(item))} · ${escapeHtml(item.quote?.roomTypeLabel || displayRoomType(item.quote || item) || "Pièce non renseignée")} · ${euros.format(item.totalTtc || 0)} · <span class="status-badge">Statut : ${escapeHtml(historyStatusLabel(item))}</span></p>
      </div>
      <div class="history-actions">
        <button class="secondary load-history" type="button">Voir / Modifier</button>
        ${canValidateHistoryItem(item) ? `<button class="primary validate-history" type="button">Valider officiellement</button>` : ""}
        <button class="secondary export-history" type="button">JSON</button>
        <button class="secondary delete-history" type="button">Supprimer</button>
      </div>
    </article>`).join("");

  list.querySelectorAll(".load-history").forEach((button) => {
    button.addEventListener("click", () => {
      const quote = findHistoryQuote(button);
      if (!quote) return;
      localStorage.setItem(STORAGE.current, JSON.stringify(quote));
      startQuote(quote);
      showView("quoteView");
      calculateAndRender();
    });
  });

  list.querySelectorAll(".export-history").forEach((button) => {
    button.addEventListener("click", () => {
      const quote = findHistoryQuote(button);
      if (quote) downloadFile(`${quote.quoteNumber}.json`, JSON.stringify(quote, null, 2), "application/json");
    });
  });

  list.querySelectorAll(".validate-history").forEach((button) => {
    button.addEventListener("click", () => {
      const quote = findHistoryQuote(button);
      if (!quote) return;
      localStorage.setItem(STORAGE.current, JSON.stringify(quote));
      startQuote(quote);
      showView("quoteView");
      calculateAndRender();
      validateOfficialDocument();
    });
  });

  list.querySelectorAll(".delete-history").forEach((button) => {
    button.addEventListener("click", () => {
      const quote = findHistoryQuote(button);
      const key = button.closest(".history-item").dataset.historyKey;
      const isOfficialInvoice = quote?.documentType === "facture" && quote?.isOfficial;
      const warning = isOfficialInvoice
        ? `Cette facture est officielle. Son numéro restera réservé. Supprimer ${quote.quoteNumber} de l'affichage ?`
        : `Supprimer ce devis de l'historique ?`;
      if (!confirm(warning)) return;
      const nextHistory = readJson(STORAGE.history, []).filter((item) => historyKey(item) !== key);
      localStorage.setItem(STORAGE.history, JSON.stringify(nextHistory));
      refreshHistory();
    });
  });
}

function findHistoryQuote(button) {
  const key = button.closest(".history-item").dataset.historyKey;
  const item = readJson(STORAGE.history, []).find((entry) => historyKey(entry) === key);
  return item ? item.quote : null;
}

function historyKey(item) {
  const quote = item.quote || item;
  return isOfficialNumber(quote.quoteNumber) ? quote.quoteNumber : (quote.documentId || item.documentId || quote.quoteNumber);
}

function canValidateHistoryItem(item) {
  const quote = item.quote || item;
  return quote.documentType === "devis" && ["brouillon", "en_attente"].includes(quote.documentStatus) && !quote.isOfficial;
}

function historyStatusLabel(item) {
  return statusLabel(item.documentStatus || item.quote?.documentStatus || "brouillon");
}

function historyTypeLabel(item) {
  const kind = item.documentKind || item.quote?.documentKind || documentKindFromType(item.quote?.documentType);
  return kind === "FAC" ? "Facture" : "Devis";
}

function generatePdf() {
  calculateAndRender();
  const quote = collectQuote();
  const traceText = quote.isOfficial
    ? "Conservez ce PDF comme trace officielle du devis ou de la facture."
    : "Ce PDF est un brouillon : il n'a pas de numéro officiel.";
  alert(`Dans la fenêtre d'impression, choisissez 'Enregistrer au format PDF'. ${traceText}`);
  window.print();
}

function sendMail() {
  const quote = collectQuote();
  const title = quote.documentTitle === "FACTURE" ? "Facture" : "Devis";
  const subject = `${title} ${quote.quoteNumber} - Will'Paint`;
  const body = [
    `Bonjour ${quote.clientName || ""},`,
    "",
    `Veuillez trouver le ${title.toLowerCase()} ${quote.quoteNumber} d'un montant de ${euros.format(quote.totalTtc)} TTC.`,
    "",
    "Vous pouvez répondre à ce message pour toute question.",
    "",
    "Cordialement,",
    "Will'Paint",
    "06 50 80 80 83"
  ].join("\n");

  alert("Votre application mail va s'ouvrir avec le sujet et le message. Pour joindre le PDF, générez d'abord le PDF puis ajoutez-le en pièce jointe dans le mail. Un navigateur local ne peut pas attacher automatiquement un fichier à un email sans logiciel serveur.");
  window.location.href = `mailto:${encodeURIComponent(quote.clientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function exportJson() {
  const quote = collectQuote();
  downloadFile(`${quote.quoteNumber}.json`, JSON.stringify(quote, null, 2), "application/json");
}

function exportCsv() {
  const quote = collectQuote();
  const headers = ["numero_devis", "date_devis", "client", "designation", "quantite", "unite", "prix_unitaire_ht", "total_ligne_ht", "observations_devis"];
  const rows = quote.lines.map((line) => [
    quote.quoteNumber,
    quote.quoteDate,
    quote.clientName,
    line.description,
    line.quantity,
    line.unit,
    line.unitPrice,
    line.total,
    quote.quoteObservations
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\n");
  downloadFile(`${quote.quoteNumber}.csv`, csv, "text/csv;charset=utf-8");
}

function exportBackup() {
  const history = readJson(STORAGE.history, []).map(normalizeHistoryItem);
  const devis = history
    .filter((item) => (item.documentKind || item.quote?.documentKind) === "DEV")
    .map((item) => item.quote || item);
  const factures = history
    .filter((item) => (item.documentKind || item.quote?.documentKind) === "FAC")
    .map((item) => item.quote || item);
  const backup = {
    version: "2.2",
    exportedAt: new Date().toISOString(),
    devis,
    factures,
    clients: extractClients(history),
    entreprise: loadCompany(),
    historique: history,
    history,
    numerosDejaUtilises: usedNumbersFromHistory(history),
    dernierNumeroUtilise: loadCounters(),
    dernierBrouillonInterne: parseInt(localStorage.getItem(STORAGE.draftCounter) || "0", 10),
    currentQuote: loadCurrentQuote()
  };

  const date = new Date().toISOString().slice(0, 10);
  downloadFile(`willpaint-sauvegarde-${date}.json`, JSON.stringify(backup, null, 2), "application/json");
}

async function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const backup = JSON.parse(await file.text());
    const importedHistory = historyFromBackup(backup);
    if (!importedHistory.length) {
      alert("Aucun devis ou facture trouvé dans cette sauvegarde.");
      return;
    }

    if (!confirm(`Importer ${importedHistory.length} document(s) depuis cette sauvegarde ? Les données de l'historique local seront remplacées.`)) return;

    const importedCounters = maxCounters(
      backup.dernierNumeroUtilise,
      backup.lastNumbers,
      countersFromHistory(importedHistory)
    );
    const protectedCounters = maxCounters(loadCounters(), importedCounters);
    localStorage.setItem(STORAGE.history, JSON.stringify(importedHistory));
    saveCounters(protectedCounters);
    const importedDraftCounter = Math.max(
      parseInt(localStorage.getItem(STORAGE.draftCounter) || "0", 10),
      parseInt(backup.dernierBrouillonInterne || 0, 10),
      draftCounterFromHistory(importedHistory)
    );
    localStorage.setItem(STORAGE.draftCounter, String(importedDraftCounter));
    if (backup.currentQuote) localStorage.setItem(STORAGE.current, JSON.stringify(backup.currentQuote));
    refreshHistory();
    alert("Sauvegarde importée. Les compteurs ont été protégés pour ne jamais revenir en arrière.");
  } catch {
    alert("Impossible d'importer cette sauvegarde. Vérifiez que le fichier est bien un JSON Will'Paint.");
  } finally {
    event.target.value = "";
  }
}

function historyFromBackup(backup) {
  if (Array.isArray(backup.history)) return backup.history.map(normalizeHistoryItem);
  if (Array.isArray(backup.historique)) return backup.historique.map(normalizeHistoryItem);
  return [...(backup.devis || []), ...(backup.factures || [])].map((quote) => normalizeHistoryItem({ quote }));
}

function normalizeHistoryItem(item) {
  const quote = item.quote || item;
  normalizeDocumentState(quote);
  const status = quote.documentStatus || item.documentStatus || "brouillon";
  quote.documentStatus = status;
  quote.documentKind = isOfficialNumber(quote.quoteNumber) ? documentKindFromNumber(quote.quoteNumber) : documentKindFromType(quote.documentType);
  quote.documentTitle = documentTitle(quote);
  quote.roomTypeLabel = displayRoomType(quote);
  quote.isOfficial = Boolean(quote.isOfficial || item.isOfficial || (isOfficialNumber(quote.quoteNumber) && quote.documentStatus !== "brouillon"));
  return {
    documentId: quote.documentId,
    quoteNumber: quote.quoteNumber,
    quoteDate: quote.quoteDate,
    clientName: quote.clientName,
    totalTtc: quote.totalTtc || 0,
    documentStatus: status,
    documentKind: quote.documentKind,
    isOfficial: quote.isOfficial,
    savedAt: item.savedAt || quote.savedAt || new Date().toISOString(),
    quote
  };
}

function extractClients(history) {
  const clients = new Map();
  history.forEach((item) => {
    const quote = item.quote || item;
    const key = [quote.clientName, quote.clientEmail, quote.clientPhone].join("|");
    if (!quote.clientName || clients.has(key)) return;
    clients.set(key, {
      name: quote.clientName,
      address: quote.clientAddress,
      phone: quote.clientPhone,
      email: quote.clientEmail
    });
  });
  return Array.from(clients.values());
}

function usedNumbersFromHistory(history) {
  return history
    .map((item) => item.quoteNumber || item.quote?.quoteNumber)
    .filter((number) => isOfficialNumber(number));
}

function draftCounterFromHistory(history) {
  return history.reduce((max, item) => {
    const id = String(item.documentId || item.quote?.documentId || "");
    const match = id.match(/^DRAFT-\d{4}-(\d+)$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
}

function exportLibreOfficeHtml() {
  const quote = collectQuote();
  downloadFile(`${quote.quoteNumber}-writer.html`, buildLibreOfficeHtml(quote), "text/html;charset=utf-8");
}

function buildLibreOfficeHtml(quote) {
  const rows = quote.lines.map((line) => {
    return `<tr><td>${escapeHtml(line.description)}</td><td>${formatNumber(line.quantity)}</td><td>${escapeHtml(line.unit)}</td><td>${euros.format(line.unitPrice)}</td><td>${euros.format(line.total)}</td></tr>`;
  }).join("");

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(quote.quoteNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #162126; }
    h1 { color: #1f6570; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #d9d9d9; padding: 8px; vertical-align: top; }
    th { background: #eef3f1; }
    .totaux { width: 45%; margin-left: auto; }
    .final { background: #1f6570; color: white; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${escapeHtml(quote.documentTitle || documentTitle(quote))} ${escapeHtml(quote.quoteNumber)}</h1>
  <p><strong>${escapeHtml(quote.company.name)}</strong><br>${nl2br(quote.company.address)}<br>${escapeHtml(quote.company.phone)}<br>${escapeHtml(quote.company.email)}<br>SIRET : ${escapeHtml(quote.company.siret)}</p>
  <h2>Client</h2>
  <p><strong>${escapeHtml(quote.clientName)}</strong><br>${nl2br(quote.clientAddress)}<br>${escapeHtml(quote.clientPhone)}<br>${escapeHtml(quote.clientEmail)}</p>
  <h2>Chantier</h2>
  <p>${nl2br(quote.siteAddress)}<br>Pièce : ${escapeHtml(displayRoomType(quote))}<br>Support : ${escapeHtml(quote.supportState)} - Préparation : ${escapeHtml(quote.prepNeeded)}</p>
  <h2>Prestations</h2>
  <table><thead><tr><th>Désignation</th><th>Qté</th><th>Unité</th><th>PU HT</th><th>Total HT</th></tr></thead><tbody>${rows}</tbody></table>
  ${quote.quoteObservations ? `<h2>Observations</h2><p>${nl2br(quote.quoteObservations)}</p>` : ""}
  <table class="totaux">
    <tr><td>Total HT</td><td>${euros.format(quote.totalHt)}</td></tr>
    <tr><td>TVA ${formatPercent(quote.vatRate)}</td><td>${euros.format(quote.totalVat)}</td></tr>
    <tr class="final"><td>Total TTC</td><td>${euros.format(quote.totalTtc)}</td></tr>
  </table>
  <h2>Conditions</h2>
  <p>${nl2br(quote.conditions)}</p>
  <p style="margin-top: 48px;"><strong>Bon pour accord</strong></p>
</body>
</html>`;
}

function generateDocumentNumber(kind) {
  const counters = loadCounters();
  const key = kind === "FAC" ? "FAC" : "DEV";
  counters[key] = Math.max(0, parseInt(counters[key] || 0, 10)) + 1;
  saveCounters(counters);
  return `${key}-${new Date().getFullYear()}-${String(counters[key]).padStart(4, "0")}`;
}

function createDraftId() {
  const current = parseInt(localStorage.getItem(STORAGE.draftCounter) || "0", 10) + 1;
  localStorage.setItem(STORAGE.draftCounter, String(current));
  return `DRAFT-${new Date().getFullYear()}-${String(current).padStart(4, "0")}`;
}

function loadCounters() {
  const oldCounter = parseInt(localStorage.getItem(STORAGE.counter) || "0", 10);
  const migrated = oldCounter > 0 ? { DEV: Math.max(0, oldCounter - 1), FAC: 0 } : { DEV: 0, FAC: 0 };
  return maxCounters(
    { DEV: 0, FAC: 0 },
    migrated,
    readJson(STORAGE.counters, { DEV: 0, FAC: 0 }),
    countersFromHistory(readJson(STORAGE.history, []))
  );
}

function saveCounters(counters) {
  localStorage.setItem(STORAGE.counters, JSON.stringify({
    DEV: Math.max(0, parseInt(counters.DEV || 0, 10)),
    FAC: Math.max(0, parseInt(counters.FAC || 0, 10))
  }));
}

function maxCounters(...sources) {
  return sources.reduce((result, source) => ({
    DEV: Math.max(result.DEV, parseInt(source?.DEV || 0, 10)),
    FAC: Math.max(result.FAC, parseInt(source?.FAC || 0, 10))
  }), { DEV: 0, FAC: 0 });
}

function countersFromHistory(history) {
  return (history || []).reduce((counters, item) => {
    const match = String(item.quoteNumber || item.quote?.quoteNumber || "").match(/^(DEV|FAC)-\d{4}-(\d+)$/);
    if (match) counters[match[1]] = Math.max(counters[match[1]], parseInt(match[2], 10));
    return counters;
  }, { DEV: 0, FAC: 0 });
}

function isHistoryNumber(number) {
  return readJson(STORAGE.history, []).some((item) => item.quoteNumber === number);
}

function getLineRows() {
  return Array.from(linesBody.querySelectorAll("tr"));
}

function numberValue(id) {
  return parseFloat(document.querySelector(`#${id}`).value) || 0;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(parseFloat(value) || 0);
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("fr-FR");
}

function formatPercent(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(parseFloat(value) || 0);
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function imageToDataUrl(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function initials(name) {
  const text = (name || "WP")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return escapeHtml(text || "WP");
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function nl2br(value) {
  return escapeHtml(value || "").replaceAll("\n", "<br>");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
