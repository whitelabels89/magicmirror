const firebaseConfig = {
  apiKey: "AIzaSyCvLriVVfoe3iVGHGnC8oK0s9i0ovLi3xs",
  authDomain: "queens-academy-icoding.firebaseapp.com",
  projectId: "queens-academy-icoding",
};

const COLLECTION_NAME = "aftercare_records";
const STATUS_FIELD = "status";
const BEFORE_FIELD = "before";
const AFTER_FIELD = "after";
const CONSENT_FIELD = "consent";
const MANUAL_SENT_FIELD = "manualEducationSent";
const MANUAL_SENT_AT_FIELD = "manualEducationSentAt";
const MANUAL_SENT_BY_FIELD = "manualEducationSentBy";
const MANUAL_SENT_CHANNEL = "aftercare";

const dom = {
  totalBadge: document.getElementById("totalBadge"),
  searchInput: document.getElementById("searchInput"),
  filterTreatment: document.getElementById("filterTreatment"),
  filterStatus: document.getElementById("filterStatus"),
  tableBody: document.getElementById("recordsBody"),
  emptyState: document.getElementById("emptyStateRow"),
  toast: document.getElementById("toast"),
};

let db;
let records = [];
let manualSendLocks = new Map();
let treatmentFilterOptions = new Set();

if (typeof firebase !== "undefined") {
  initFirebase();
} else {
  window.addEventListener("load", () => {
    if (typeof firebase !== "undefined") {
      initFirebase();
    } else {
      console.error("Firebase SDK belum termuat untuk halaman aftercare.");
      if (dom.emptyState) {
        dom.emptyState.textContent = "⚠️ Firebase belum siap. Muat ulang halaman.";
      }
    }
  }, { once: true });
}

function initFirebase() {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
  attachListeners();
  fetchRecords();
}

function attachListeners() {
  dom.searchInput?.addEventListener("input", renderFiltered);
  dom.filterTreatment?.addEventListener("change", renderFiltered);
  dom.filterStatus?.addEventListener("change", renderFiltered);
}

function fetchRecords() {
  dom.emptyState.textContent = "Memuat data aftercare...";
  db.collection(COLLECTION_NAME)
    .orderBy("createdAt", "desc")
    .onSnapshot(handleSnapshot, handleError);
}

function handleSnapshot(snapshot) {
  records = snapshot.docs.map(doc => {
    const data = doc.data();
    return normalizeRecord(doc.id, data);
  });
  rebuildTreatmentFilter();
  buildManualLocks();
  renderFiltered();
}

function handleError(err) {
  console.error("Gagal memuat data aftercare", err);
  dom.emptyState.textContent = "⚠️ Tidak dapat memuat data aftercare.";
}

function normalizeRecord(id, data) {
  const status = data?.[STATUS_FIELD] || {};
  const invoiceId = data.invoiceId || data.invoiceNumber || data.invoiceCode || "";
  const treatmentCode = data.treatmentCode || data.treatmentId || data.treatment || data.treatmentName || "";
  const treatmentName = data.treatmentName || data.treatment || treatmentCode;
  const customerName = data.customerName || data.clientName || data.customer || "Tanpa nama";
  const phone = normalizePhone(data.customerPhone || data.phone || data.telephone || "");
  const contributors = Array.isArray(data.contributors)
    ? data.contributors
    : Array.isArray(data.staff)
      ? data.staff
      : [];
  const sent = Boolean(data[MANUAL_SENT_FIELD] || data.manualEducation || data.educationSent);
  const sentAt = data[MANUAL_SENT_AT_FIELD] || data.manualEducationSentAt || data.educationSentAt || null;
  const sentBy = data[MANUAL_SENT_BY_FIELD] || data.manualEducationSentBy || data.educationSentBy || "";

  return {
    id,
    invoiceId,
    invoiceDisplay: data.invoiceNumber || data.invoiceCode || invoiceId || "-",
    treatmentCode,
    treatmentName,
    treatmentVariant: data.variant || "",
    customerName,
    phone,
    contributors,
    status: {
      before: Boolean(status[BEFORE_FIELD] ?? data.before ?? false),
      after: Boolean(status[AFTER_FIELD] ?? data.after ?? false),
      consent: Boolean(status[CONSENT_FIELD] ?? data.consent ?? false),
    },
    manual: {
      sent,
      sentAt: sentAt ? formatTimestamp(sentAt) : null,
      sentBy,
    },
    raw: data,
  };
}

function normalizePhone(phone) {
  if (!phone) return "";
  let num = String(phone).replace(/[^0-9+]/g, "");
  if (num.startsWith("+")) num = num.slice(1);
  if (num.startsWith("08")) num = "62" + num.slice(1);
  if (num.startsWith("8")) num = "62" + num;
  if (!num.startsWith("62")) num = "62" + num.replace(/^0+/, "");
  return num;
}

function formatTimestamp(value) {
  if (!value) return null;
  try {
    if (value.toDate) {
      return value.toDate();
    }
    if (typeof value === "number") {
      return new Date(value);
    }
    if (value.seconds) {
      return new Date(value.seconds * 1000);
    }
    return new Date(value);
  } catch (err) {
    console.warn("Tidak bisa parsing timestamp", value, err);
    return null;
  }
}

function buildManualLocks() {
  manualSendLocks.clear();
  for (const record of records) {
    const key = manualKey(record);
    if (record.manual.sent && !manualSendLocks.has(key)) {
      manualSendLocks.set(key, true);
    }
  }
}

function rebuildTreatmentFilter() {
  treatmentFilterOptions = new Set([""]);
  records.forEach(rec => {
    if (rec.treatmentName) {
      treatmentFilterOptions.add(rec.treatmentName);
    }
  });
  if (dom.filterTreatment) {
    dom.filterTreatment.innerHTML = "";
    for (const option of treatmentFilterOptions) {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = option || "Semua treatment";
      dom.filterTreatment.appendChild(opt);
    }
  }
}

function renderFiltered() {
  if (!dom.tableBody) return;
  const query = dom.searchInput?.value.trim().toLowerCase() || "";
  const treatmentFilter = dom.filterTreatment?.value || "";
  const statusFilter = dom.filterStatus?.value || "";

  const filtered = records.filter(record => {
    const matchesQuery = !query || [
      record.customerName,
      record.invoiceDisplay,
      record.treatmentName,
      record.phone,
    ].some(value => String(value || "").toLowerCase().includes(query));

    const matchesTreatment = !treatmentFilter || record.treatmentName === treatmentFilter;

    const matchesStatus = !statusFilter || (statusFilter === "sent" && record.manual.sent) || (statusFilter === "pending" && !record.manual.sent);

    return matchesQuery && matchesTreatment && matchesStatus;
  });

  dom.totalBadge.textContent = `${filtered.length} data tampil`;

  dom.tableBody.innerHTML = "";
  if (!filtered.length) {
    const emptyRow = document.createElement("tr");
    emptyRow.className = "empty-state";
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.textContent = query ? "Tidak ada data sesuai pencarian." : "Belum ada data aftercare.";
    emptyRow.appendChild(cell);
    dom.tableBody.appendChild(emptyRow);
    return;
  }

  const seenKey = new Map();

  filtered.forEach((record, index) => {
    const key = manualKey(record);
    const allowSend = !manualSendLocks.get(key) && !seenKey.has(key);
    if (!seenKey.has(key)) {
      seenKey.set(key, { allowSend: allowSend });
    }

    const row = buildRow(record, allowSend);
    dom.tableBody.appendChild(row);
  });
}

function manualKey(record) {
  return [record.invoiceId || record.invoiceDisplay, record.treatmentCode || record.treatmentName, record.phone].join("::");
}

function buildRow(record, allowSend) {
  const row = document.createElement("tr");
  row.dataset.invoice = record.invoiceId;
  row.dataset.treatment = record.treatmentCode || record.treatmentName;
  row.dataset.phone = record.phone;

  row.appendChild(buildCustomerCell(record));
  row.appendChild(buildTextCell(record.invoiceDisplay || "-"));
  row.appendChild(buildTextCell(record.treatmentVariant ? `${record.treatmentName} • ${record.treatmentVariant}` : record.treatmentName || "-"));
  row.appendChild(buildContributorsCell(record.contributors));
  row.appendChild(buildCheckboxCell(record, "before"));
  row.appendChild(buildCheckboxCell(record, "after"));
  row.appendChild(buildCheckboxCell(record, "consent"));
  row.appendChild(buildManualCell(record, allowSend));

  return row;
}

function buildCustomerCell(record) {
  const cell = document.createElement("td");
  const name = document.createElement("div");
  name.textContent = record.customerName;
  name.style.fontWeight = "600";
  const phone = document.createElement("div");
  phone.className = "status-chip";
  phone.textContent = record.phone || "-";
  cell.append(name, phone);
  return cell;
}

function buildTextCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text || "-";
  return cell;
}

function buildContributorsCell(contributors) {
  const cell = document.createElement("td");
  if (!contributors?.length) {
    cell.textContent = "-";
    return cell;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "contributors";
  contributors.forEach(entry => {
    const chip = document.createElement("span");
    if (typeof entry === "string") {
      chip.textContent = entry;
    } else if (entry) {
      const role = entry.role || entry.job || entry.type || "";
      chip.textContent = role ? `${entry.name || entry.fullName || "Staff"} • ${role}` : (entry.name || entry.fullName || "Staff");
    }
    wrapper.appendChild(chip);
  });
  cell.appendChild(wrapper);
  return cell;
}

function buildCheckboxCell(record, field) {
  const cell = document.createElement("td");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  const id = `${field}-${record.id}`;
  checkbox.id = id;
  checkbox.checked = Boolean(record.status[field]);
  checkbox.dataset.recordId = record.id;
  checkbox.dataset.field = field;
  checkbox.addEventListener("change", onStatusToggle);
  cell.appendChild(checkbox);
  return cell;
}

async function onStatusToggle(event) {
  const checkbox = event.currentTarget;
  const recordId = checkbox.dataset.recordId;
  const field = checkbox.dataset.field;
  const value = checkbox.checked;

  const record = records.find(r => r.id === recordId);
  if (!record) return;

  try {
    const path = `${STATUS_FIELD}.${field}`;
    const updatePayload = {
      [path]: value,
    };
    updatePayload[field] = value; // fallback jika field utama dipakai langsung
    await db.collection(COLLECTION_NAME).doc(recordId).set(updatePayload, { merge: true });
    record.status[field] = value;
    showToast("Status diperbarui", "success");
  } catch (err) {
    console.error("Gagal memperbarui status aftercare", err);
    checkbox.checked = !value;
    showToast("Gagal menyimpan status. Coba lagi.", "error");
  }
}

function buildManualCell(record, allowSend) {
  const cell = document.createElement("td");
  cell.className = "actions";

  const info = document.createElement("div");
  info.className = "status-chip";
  if (record.manual.sent) {
    const formatted = record.manual.sentAt ? formatDateTime(record.manual.sentAt) : "Sudah dikirim";
    info.textContent = `${formatted}${record.manual.sentBy ? ` • ${record.manual.sentBy}` : ""}`;
    info.style.color = "var(--success)";
  } else {
    info.textContent = "Belum dikirim";
  }

  if (allowSend) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn-send";
    button.textContent = record.manual.sent ? "Kirim Ulang" : "Kirim Pesan Edukasi";
    button.addEventListener("click", () => sendManualEducation(record, button, info));
    button.disabled = record.manual.sent;
    cell.append(button, info);
  } else {
    cell.append(info);
  }

  return cell;
}

function formatDateTime(date) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d?.getTime?.())) return "";
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

async function sendManualEducation(record, button, infoEl) {
  if (!record.phone) {
    showToast("Nomor WhatsApp tidak valid", "error");
    return;
  }
  const payload = buildEducationPayload(record);
  button.disabled = true;
  button.textContent = "Mengirim...";

  try {
    const response = await fetch("/send-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || result.ok === false) {
      throw new Error(result.error || "Gagal mengirim pesan");
    }

    const now = new Date();
    await db.collection(COLLECTION_NAME).doc(record.id).set({
      [MANUAL_SENT_FIELD]: true,
      [MANUAL_SENT_AT_FIELD]: now,
      [MANUAL_SENT_BY_FIELD]: payload.sender || "manual",
    }, { merge: true });

    manualSendLocks.set(manualKey(record), true);
    record.manual.sent = true;
    record.manual.sentAt = now;
    record.manual.sentBy = payload.sender || "manual";

    button.textContent = "Sudah Dikirim";
    infoEl.textContent = `${formatDateTime(now)} • ${record.manual.sentBy}`;
    infoEl.style.color = "var(--success)";
    showToast("Pesan edukasi berhasil dikirim", "success");
    renderFiltered();
  } catch (err) {
    console.error("Gagal kirim edukasi aftercare", err);
    button.disabled = false;
    button.textContent = record.manual.sent ? "Kirim Ulang" : "Kirim Pesan Edukasi";
    showToast("Gagal mengirim edukasi. Coba lagi.", "error");
  }
}

function buildEducationPayload(record) {
  const template = record.raw?.educationTemplate || `Halo ${record.customerName}! Terima kasih sudah melakukan treatment ${record.treatmentName} di Queen Care. Ini tips aftercare untuk menjaga hasil tetap maksimal.`;
  return {
    number: record.phone,
    message: template,
    channel: MANUAL_SENT_CHANNEL,
    sender: record.raw?.lastUpdatedBy || record.raw?.staffSender || "Manual",
  };
}

let toastTimer;
function showToast(message, type = "success") {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  dom.toast.style.background = type === "error" ? "#991b1b" : "#0f172a";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast?.classList.remove("show"), 3200);
}
