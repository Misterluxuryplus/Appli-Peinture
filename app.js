const STORAGE = {
  company: "willpaint.company",
  current: "willpaint.currentQuote",
  history: "willpaint.history",
  counter: "willpaint.counter"
};

const DEFAULT_COMPANY = {
  name: "Will'Paint",
  email: "willpaint@outlook.fr",
  phone: "06 50 80 80 83",
  address: "6 rue des Pautes\n38430 Moirans",
  siret: "10338965600010",
  logo: ""
};

const DEFAULT_LINES = [
  { kind: "service", description: "Peinture murs", quantity: 0, unit: "m²", unitPrice: 18, note: "" },
  { kind: "service", description: "Peinture plafond", quantity: 0, unit: "m²", unitPrice: 22, note: "" },
  { kind: "service", description: "Sous-couche", quantity: 0, unit: "m²", unitPrice: 8, note: "" },
  { kind: "service", description: "Préparation support", quantity: 1, unit: "forfait", unitPrice: 120, note: "" },
  { kind: "service", description: "Rebouchage", quantity: 1, unit: "forfait", unitPrice: 80, note: "" },
  { kind: "service", description: "Ponçage", quantity: 1, unit: "forfait", unitPrice: 90, note: "" },
  { kind: "service", description: "Protection chantier", quantity: 1, unit: "forfait", unitPrice: 75, note: "" },
  { kind: "service", description: "Nettoyage fin de chantier", quantity: 1, unit: "forfait", unitPrice: 60, note: "" },
  { kind: "service", description: "Déplacement", quantity: 1, unit: "forfait", unitPrice: 45, note: "" },
  { kind: "service", description: "Main-d'œuvre", quantity: 1, unit: "forfait", unitPrice: 250, note: "" }
];

const quoteFields = [
  "clientName",
  "clientPhone",
  "clientEmail",
  "clientAddress",
  "quoteDate",
  "quoteNumber",
  "siteAddress",
  "roomType",
  "wallSurface",
  "ceilingSurface",
  "coatCount",
  "supportState",
  "prepNeeded",
  "vatRate",
  "conditions"
];

const companyFields = ["companyName", "companyPhone", "companyEmail", "companyAddress", "companySiret"];

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
let currentPhotos = [];

const form = document.querySelector("#quoteForm");
const companyForm = document.querySelector("#companyForm");
const linesBody = document.querySelector("#linesBody");
const lineTemplate = document.querySelector("#lineTemplate");
const preview = document.querySelector("#quotePreview");

document.addEventListener("DOMContentLoaded", init);

function init() {
  ensureCompany();
  fillCompanyForm(loadCompany());
  startQuote(loadCurrentQuote());
  bindEvents();
  refreshHistory();
  calculateAndRender();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function bindEvents() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  form.addEventListener("input", (event) => {
    if (["wallSurface", "ceilingSurface", "coatCount"].includes(event.target.id)) {
      syncSurfaceLines();
    }
    calculateAndRender();
    saveCurrentQuietly();
  });

  form.addEventListener("change", () => {
    calculateAndRender();
    saveCurrentQuietly();
  });

  document.querySelector("#addLineBtn").addEventListener("click", () => {
    addLine({ kind: "service", description: "Nouvelle prestation", quantity: 1, unit: "forfait", unitPrice: 0, note: "" });
    calculateAndRender();
    saveCurrentQuietly();
  });

  document.querySelector("#addTextBtn").addEventListener("click", () => {
    addLine({ kind: "text", description: "Texte libre", quantity: 0, unit: "", unitPrice: 0, note: "Remarque chantier, condition particulière ou précision technique." });
    calculateAndRender();
    saveCurrentQuietly();
  });

  document.querySelector("#calculateBtn").addEventListener("click", calculateAndRender);
  document.querySelector("#saveQuoteBtn").addEventListener("click", saveQuote);
  document.querySelector("#newQuoteBtn").addEventListener("click", newQuote);
  document.querySelector("#clearCurrentBtn").addEventListener("click", clearCurrentQuote);
  document.querySelector("#pdfBtn").addEventListener("click", generatePdf);
  document.querySelector("#mailBtn").addEventListener("click", sendMail);
  document.querySelector("#libreOfficeBtn").addEventListener("click", exportLibreOfficeHtml);
  document.querySelector("#jsonBtn").addEventListener("click", exportJson);
  document.querySelector("#csvBtn").addEventListener("click", exportCsv);
  document.querySelector("#photoInput").addEventListener("change", handlePhotoInput);
  document.querySelector("#saveCompanyBtn").addEventListener("click", saveCompanySettings);
  document.querySelector("#resetCompanyBtn").addEventListener("click", resetCompanySettings);
  document.querySelector("#companyLogo").addEventListener("change", handleCompanyLogo);
}

function showView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
  document.querySelector(`#${viewId}`).classList.add("active-view");
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
  if (viewId === "historyView") refreshHistory();
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
  quoteFields.forEach((id) => {
    if (quote[id] !== undefined) document.querySelector(`#${id}`).value = quote[id];
  });
  currentPhotos = quote.photos || [];
  linesBody.innerHTML = "";
  (quote.lines || DEFAULT_LINES).forEach(addLine);
  syncSurfaceLines();
  renderPhotos();
}

function createBlankQuote() {
  return {
    quoteDate: new Date().toISOString().slice(0, 10),
    quoteNumber: nextQuoteNumber(false),
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    clientAddress: "",
    siteAddress: "",
    roomType: "",
    wallSurface: 0,
    ceilingSurface: 0,
    coatCount: 2,
    supportState: "Bon",
    prepNeeded: "Oui",
    vatRate: "0.212",
    conditions: "Devis valable 30 jours. Acompte de 30 % à la commande. Solde à la réception des travaux.",
    lines: DEFAULT_LINES,
    photos: []
  };
}

function addLine(line) {
  const row = lineTemplate.content.firstElementChild.cloneNode(true);
  row.dataset.kind = line.kind || "service";
  row.classList.toggle("text-row", row.dataset.kind === "text");
  row.querySelector(".line-description").value = line.description || "";
  row.querySelector(".line-quantity").value = line.quantity || 0;
  row.querySelector(".line-unit").value = line.unit || "";
  row.querySelector(".line-price").value = line.unitPrice || 0;
  row.querySelector(".line-note").value = line.note || "";
  if (row.dataset.kind === "text") {
    row.querySelector(".line-quantity").value = 0;
    row.querySelector(".line-unit").value = "";
    row.querySelector(".line-price").value = 0;
  }
  row.querySelector(".remove-line").addEventListener("click", () => {
    row.remove();
    calculateAndRender();
    saveCurrentQuietly();
  });
  row.querySelectorAll("input, textarea").forEach((input) => {
    input.addEventListener("input", () => {
      calculateAndRender();
      saveCurrentQuietly();
    });
  });
  linesBody.appendChild(row);
}

function syncSurfaceLines() {
  const walls = numberValue("wallSurface") * Math.max(1, numberValue("coatCount"));
  const ceiling = numberValue("ceilingSurface") * Math.max(1, numberValue("coatCount"));
  const totalSurface = walls + ceiling;

  getLineRows().forEach((row) => {
    const description = row.querySelector(".line-description").value.trim();
    if (description === "Peinture murs") row.querySelector(".line-quantity").value = round(walls);
    if (description === "Peinture plafond") row.querySelector(".line-quantity").value = round(ceiling);
    if (description === "Sous-couche") row.querySelector(".line-quantity").value = round(totalSurface);
  });
}

function collectQuote() {
  const quote = {};
  quoteFields.forEach((id) => {
    quote[id] = document.querySelector(`#${id}`).value.trim();
  });

  quote.company = loadCompany();
  quote.lines = getLineRows().map((row) => {
    const kind = row.dataset.kind || "service";
    const quantity = kind === "text" ? 0 : parseFloat(row.querySelector(".line-quantity").value) || 0;
    const unitPrice = kind === "text" ? 0 : parseFloat(row.querySelector(".line-price").value) || 0;
    const total = quantity * unitPrice;
    row.querySelector(".line-total").textContent = kind === "text" ? "Texte" : euros.format(total);
    return {
      kind,
      description: row.querySelector(".line-description").value.trim(),
      quantity,
      unit: row.querySelector(".line-unit").value.trim(),
      unitPrice,
      total,
      note: row.querySelector(".line-note").value.trim()
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

function calculateAndRender() {
  const quote = collectQuote();
  document.querySelector("#totalHt").textContent = euros.format(quote.totalHt);
  document.querySelector("#totalVat").textContent = euros.format(quote.totalVat);
  document.querySelector("#totalTtc").textContent = euros.format(quote.totalTtc);
  renderPreview(quote);
}

function renderPreview(quote) {
  const company = quote.company;
  const logo = company.logo ? `<img src="${company.logo}" alt="Logo Will'Paint">` : initials(company.name);
  const rows = quote.lines.map((line) => {
    if (line.kind === "text") {
      return `<tr><td class="note-cell" colspan="5"><strong>${escapeHtml(line.description)}</strong><br>${nl2br(line.note)}</td></tr>`;
    }
    return `
      <tr>
        <td>${escapeHtml(line.description)}${line.note ? `<br><span class="muted">${escapeHtml(line.note)}</span>` : ""}</td>
        <td class="amount">${formatNumber(line.quantity)}</td>
        <td>${escapeHtml(line.unit)}</td>
        <td class="amount">${euros.format(line.unitPrice)}</td>
        <td class="amount">${euros.format(line.total)}</td>
      </tr>`;
  }).join("");

  const photos = quote.photos.length
    ? `<section class="doc-block"><h3>Photos chantier</h3><div class="doc-photo-grid">${quote.photos.map((photo) => `<img src="${photo.src}" alt="${escapeHtml(photo.caption || "Photo chantier")}">`).join("")}</div></section>`
    : "";

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
        <h2>DEVIS</h2>
        <p><strong>N° ${escapeHtml(quote.quoteNumber)}</strong><br>Date : ${formatDate(quote.quoteDate)}</p>
      </div>
    </div>

    <div class="doc-grid">
      <section class="doc-block">
        <h3>Client</h3>
        <p><strong>${escapeHtml(quote.clientName || "Nom client")}</strong><br>${nl2br(quote.clientAddress)}<br>${escapeHtml(quote.clientPhone)}<br>${escapeHtml(quote.clientEmail)}</p>
      </section>
      <section class="doc-block">
        <h3>Chantier</h3>
        <p>${nl2br(quote.siteAddress)}<br>Type de pièce : ${escapeHtml(quote.roomType)}<br>Murs : ${formatNumber(quote.wallSurface)} m² | Plafond : ${formatNumber(quote.ceilingSurface)} m²<br>Couches : ${escapeHtml(quote.coatCount)} | Support : ${escapeHtml(quote.supportState)} | Préparation : ${escapeHtml(quote.prepNeeded)}</p>
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
  localStorage.setItem(STORAGE.current, JSON.stringify(quote));
  const history = readJson(STORAGE.history, []);
  const existingIndex = history.findIndex((item) => item.quoteNumber === quote.quoteNumber);
  const summary = {
    quoteNumber: quote.quoteNumber,
    quoteDate: quote.quoteDate,
    clientName: quote.clientName,
    totalTtc: quote.totalTtc,
    savedAt: quote.savedAt,
    quote
  };
  if (existingIndex >= 0) history[existingIndex] = summary;
  else history.unshift(summary);
  localStorage.setItem(STORAGE.history, JSON.stringify(history.slice(0, 50)));
  if (existingIndex < 0) nextQuoteNumber(true);
  refreshHistory();
  alert("Devis sauvegardé dans l'historique.");
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
  const history = readJson(STORAGE.history, []);
  const list = document.querySelector("#historyList");
  if (!history.length) {
    list.innerHTML = `<p class="muted">Aucun devis sauvegardé pour le moment.</p>`;
    return;
  }
  list.innerHTML = history.map((item) => `
    <article class="history-item" data-quote-number="${escapeAttribute(item.quoteNumber)}">
      <div>
        <strong>${escapeHtml(item.quoteNumber)} - ${escapeHtml(item.clientName || "Client non renseigné")}</strong>
        <p>${formatDate(item.quoteDate)} · ${euros.format(item.totalTtc || 0)}</p>
      </div>
      <div class="history-actions">
        <button class="secondary load-history" type="button">Ouvrir</button>
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

  list.querySelectorAll(".delete-history").forEach((button) => {
    button.addEventListener("click", () => {
      const number = button.closest(".history-item").dataset.quoteNumber;
      if (!confirm(`Supprimer le devis ${number} de l'historique ?`)) return;
      const nextHistory = readJson(STORAGE.history, []).filter((item) => item.quoteNumber !== number);
      localStorage.setItem(STORAGE.history, JSON.stringify(nextHistory));
      refreshHistory();
    });
  });
}

function findHistoryQuote(button) {
  const number = button.closest(".history-item").dataset.quoteNumber;
  const item = readJson(STORAGE.history, []).find((entry) => entry.quoteNumber === number);
  return item ? item.quote : null;
}

function generatePdf() {
  calculateAndRender();
  alert("Dans la fenêtre d'impression, choisissez 'Enregistrer au format PDF'.");
  window.print();
}

function sendMail() {
  const quote = collectQuote();
  const subject = `Devis ${quote.quoteNumber} - Will'Paint`;
  const body = [
    `Bonjour ${quote.clientName || ""},`,
    "",
    `Veuillez trouver le devis ${quote.quoteNumber} d'un montant de ${euros.format(quote.totalTtc)} TTC.`,
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
  const headers = ["numero_devis", "date_devis", "client", "designation", "quantite", "unite", "prix_unitaire_ht", "total_ligne_ht", "note"];
  const rows = quote.lines.map((line) => [
    quote.quoteNumber,
    quote.quoteDate,
    quote.clientName,
    line.description,
    line.quantity,
    line.unit,
    line.unitPrice,
    line.total,
    line.note
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\n");
  downloadFile(`${quote.quoteNumber}.csv`, csv, "text/csv;charset=utf-8");
}

function exportLibreOfficeHtml() {
  const quote = collectQuote();
  downloadFile(`${quote.quoteNumber}-writer.html`, buildLibreOfficeHtml(quote), "text/html;charset=utf-8");
}

function buildLibreOfficeHtml(quote) {
  const rows = quote.lines.map((line) => {
    if (line.kind === "text") return `<tr><td colspan="5"><strong>${escapeHtml(line.description)}</strong><br>${nl2br(line.note)}</td></tr>`;
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
  <h1>DEVIS ${escapeHtml(quote.quoteNumber)}</h1>
  <p><strong>${escapeHtml(quote.company.name)}</strong><br>${nl2br(quote.company.address)}<br>${escapeHtml(quote.company.phone)}<br>${escapeHtml(quote.company.email)}<br>SIRET : ${escapeHtml(quote.company.siret)}</p>
  <h2>Client</h2>
  <p><strong>${escapeHtml(quote.clientName)}</strong><br>${nl2br(quote.clientAddress)}<br>${escapeHtml(quote.clientPhone)}<br>${escapeHtml(quote.clientEmail)}</p>
  <h2>Chantier</h2>
  <p>${nl2br(quote.siteAddress)}<br>Pièce : ${escapeHtml(quote.roomType)}<br>Support : ${escapeHtml(quote.supportState)} - Préparation : ${escapeHtml(quote.prepNeeded)}</p>
  <h2>Prestations</h2>
  <table><thead><tr><th>Désignation</th><th>Qté</th><th>Unité</th><th>PU HT</th><th>Total HT</th></tr></thead><tbody>${rows}</tbody></table>
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

function nextQuoteNumber(increment) {
  const current = parseInt(localStorage.getItem(STORAGE.counter) || "1", 10);
  if (increment) localStorage.setItem(STORAGE.counter, String(current + 1));
  return `WP-${new Date().getFullYear()}-${String(current).padStart(4, "0")}`;
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
