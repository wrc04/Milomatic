/*
  Milomatic v1
  - Stores all data in localStorage for offline/private use
  - No external dependencies
  - Calculates trip distance in km and provides reports + exports
*/
(() => {
  const STORAGE_KEY = "milomatic_v1";
  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  const DEFAULT_CATEGORIES = [
    "Repairs",
    "Inspection",
    "Supply Pickup",
    "Showing",
    "Tenant Visit",
    "Property Trip",
    "Administration",
    "Other"
  ];

  const els = {
    vehicleFields: document.getElementById("vehicleFields"),
    vehicleName: document.getElementById("vehicleName"),
    vehicleOdometer: document.getElementById("vehicleOdometer"),
    addVehicleBtn: document.getElementById("addVehicleBtn"),
    vehicleList: document.getElementById("vehicleList"),

    tripForm: document.getElementById("tripForm"),
    tripFormTitle: document.getElementById("tripFormTitle"),
    tripId: document.getElementById("tripId"),
    tripDate: document.getElementById("tripDate"),
    tripVehicle: document.getElementById("tripVehicle"),
    startOdometer: document.getElementById("startOdometer"),
    endOdometer: document.getElementById("endOdometer"),
    distanceKm: document.getElementById("distanceKm"),
    tripCategory: document.getElementById("tripCategory"),
    businessPurpose: document.getElementById("businessPurpose"),
    startLocation: document.getElementById("startLocation"),
    destination: document.getElementById("destination"),
    recentLocations: document.getElementById("recentLocations"),
    notes: document.getElementById("notes"),
    saveTripBtn: document.getElementById("saveTripBtn"),
    cancelEditBtn: document.getElementById("cancelEditBtn"),
    useVehicleOdoBtn: document.getElementById("useVehicleOdoBtn"),

    monthTotal: document.getElementById("monthTotal"),
    yearTotal: document.getElementById("yearTotal"),
    reportYear: document.getElementById("reportYear"),
    reportMonth: document.getElementById("reportMonth"),
    reportPeriodLabel: document.getElementById("reportPeriodLabel"),
    reportPeriodTotal: document.getElementById("reportPeriodTotal"),
    categoryTotals: document.getElementById("categoryTotals"),
    vehicleTotals: document.getElementById("vehicleTotals"),

    tripList: document.getElementById("tripList"),

    exportCsvBtn: document.getElementById("exportCsvBtn"),
    exportJsonBtn: document.getElementById("exportJsonBtn"),
    importJsonInput: document.getElementById("importJsonInput")
  };

  const state = loadState();
  let vehicleFieldsVisible = false;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { vehicles: [], trips: [], categories: [...DEFAULT_CATEGORIES], recentLocations: [] };
      }
      const parsed = JSON.parse(raw);
      return {
        vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles.map(normalizeVehicle) : [],
        trips: Array.isArray(parsed.trips) ? parsed.trips : [],
        categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : [...DEFAULT_CATEGORIES],
        recentLocations: Array.isArray(parsed.recentLocations) ? parsed.recentLocations : []
      };
    } catch {
      return { vehicles: [], trips: [], categories: [...DEFAULT_CATEGORIES], recentLocations: [] };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function uid(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function roundKm(n) {
    return Math.round(n * 10) / 10;
  }

  function getLocalDateInputValue(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatKm(n) {
    return `${roundKm(Number(n || 0)).toFixed(1)} km`;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getVehicle(vehicleId) {
    return state.vehicles.find((v) => v.id === vehicleId);
  }

  // Vehicles keep a manual `odometerBaseline` (creation value or a manual
  // update). The `currentOdometer` shown everywhere is derived: the higher of
  // that baseline and the highest trip end odometer. Deriving it means adding,
  // editing, or deleting trips always keeps the reading consistent.
  function normalizeVehicle(v) {
    const baseline = Number.isFinite(Number(v.odometerBaseline))
      ? Number(v.odometerBaseline)
      : Number(v.currentOdometer) || 0;
    return {
      id: v.id,
      name: v.name,
      odometerBaseline: roundKm(baseline),
      currentOdometer: roundKm(Number(v.currentOdometer) || baseline)
    };
  }

  function recomputeVehicleOdometer(vehicleId) {
    const vehicle = getVehicle(vehicleId);
    if (!vehicle) return;
    let highestTripEnd = 0;
    for (const t of state.trips) {
      if (t.vehicleId === vehicleId) {
        highestTripEnd = Math.max(highestTripEnd, Number(t.endOdometer) || 0);
      }
    }
    vehicle.currentOdometer = roundKm(Math.max(Number(vehicle.odometerBaseline) || 0, highestTripEnd));
  }

  function recomputeAllVehicleOdometers() {
    for (const v of state.vehicles) recomputeVehicleOdometer(v.id);
  }

  function renderVehicleSelect() {
    const options = state.vehicles
      .map((v) => `<option value="${v.id}">${escapeHtml(v.name)} (${formatKm(v.currentOdometer)})</option>`)
      .join("");
    els.tripVehicle.innerHTML = state.vehicles.length
      ? options
      : '<option value="">No vehicles yet - add one first</option>';
  }

  function renderCategorySelect() {
    els.tripCategory.innerHTML = state.categories
      .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
      .join("");
  }

  function renderVehicles() {
    if (!state.vehicles.length) {
      els.vehicleList.innerHTML = '<p class="empty">No vehicles added yet.</p>';
      return;
    }
    els.vehicleList.innerHTML = state.vehicles
      .map((v) => {
        const tripCount = state.trips.filter((t) => t.vehicleId === v.id).length;
        return `
          <article class="vehicle-item">
            <strong>${escapeHtml(v.name)}</strong>
            <div class="meta">Current odometer: ${formatKm(v.currentOdometer)} · Trips: ${tripCount}</div>
            <div class="row" style="margin-top:8px;">
              <button data-action="edit-vehicle" data-id="${v.id}" class="btn btn-secondary">Update Odometer</button>
              <button data-action="delete-vehicle" data-id="${v.id}" class="btn btn-danger">Delete Vehicle</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function calculateDistance() {
    const start = Number(els.startOdometer.value);
    const end = Number(els.endOdometer.value);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      els.distanceKm.value = roundKm(end - start).toFixed(1);
    } else {
      els.distanceKm.value = "";
    }
  }

  function resetTripForm() {
    els.tripForm.reset();
    els.tripId.value = "";
    els.tripFormTitle.textContent = "Add Trip";
    els.saveTripBtn.textContent = "Save Trip";
    els.tripDate.value = getLocalDateInputValue();
    calculateDistance();
  }

  function setVehicleFieldsVisibility(isVisible) {
    vehicleFieldsVisible = isVisible;
    els.vehicleFields.classList.toggle("hidden", !isVisible);
  }

  function addVehicle() {
    if (!vehicleFieldsVisible) {
      setVehicleFieldsVisibility(true);
      els.vehicleName.focus();
      return;
    }

    const name = els.vehicleName.value.trim();
    const odometer = Number(els.vehicleOdometer.value);
    if (!name) return alert("Please enter a vehicle name.");
    if (!Number.isFinite(odometer) || odometer < 0) return alert("Please enter a valid odometer in km.");
    const rounded = roundKm(odometer);
    state.vehicles.push({ id: uid("veh"), name, odometerBaseline: rounded, currentOdometer: rounded });
    saveState();
    els.vehicleName.value = "";
    els.vehicleOdometer.value = "";
    setVehicleFieldsVisibility(false);
    renderAll();
  }

  function rememberLocation(value) {
    const cleaned = value.trim();
    if (!cleaned) return;
    const index = state.recentLocations.findIndex((item) => item.toLowerCase() === cleaned.toLowerCase());
    if (index >= 0) state.recentLocations.splice(index, 1);
    state.recentLocations.unshift(cleaned);
    if (state.recentLocations.length > 20) state.recentLocations.length = 20;
  }

  function renderRecentLocations() {
    els.recentLocations.innerHTML = state.recentLocations
      .map((location) => `<option value="${escapeHtml(location)}"></option>`)
      .join("");
  }

  function saveTrip(evt) {
    evt.preventDefault();
    if (!state.vehicles.length) return alert("Add a vehicle first.");

    const id = els.tripId.value || uid("trip");
    const start = Number(els.startOdometer.value);
    const end = Number(els.endOdometer.value);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      return alert("End odometer must be greater than or equal to start odometer.");
    }

    const existingIndex = state.trips.findIndex((t) => t.id === id);
    const existingTrip = existingIndex >= 0 ? state.trips[existingIndex] : null;
    const businessPurpose = els.businessPurpose.value.trim();
    const startLocation = els.startLocation.value.trim();
    const destination = els.destination.value.trim();
    const createdAt = existingTrip?.createdAt || new Date().toISOString();
    const updatedAt = new Date().toISOString();

    const trip = {
      id,
      date: els.tripDate.value,
      vehicleId: els.tripVehicle.value,
      startOdometer: roundKm(start),
      endOdometer: roundKm(end),
      distanceKm: roundKm(end - start),
      category: els.tripCategory.value,
      businessPurpose,
      startLocation,
      destination,
      notes: els.notes.value.trim(),
      createdAt,
      updatedAt
    };

    if (!trip.date || !trip.vehicleId || !trip.category || !businessPurpose || !startLocation || !destination) {
      return alert("Please fill all required fields.");
    }

    if (existingIndex >= 0) {
      state.trips[existingIndex] = trip;
    } else {
      state.trips.push(trip);
    }

    rememberLocation(startLocation);
    rememberLocation(destination);

    const previousVehicleId = existingTrip?.vehicleId;
    if (previousVehicleId && previousVehicleId !== trip.vehicleId) {
      recomputeVehicleOdometer(previousVehicleId);
    }
    recomputeVehicleOdometer(trip.vehicleId);

    saveState();
    resetTripForm();
    renderAll();
  }

  function editTrip(id) {
    const trip = state.trips.find((t) => t.id === id);
    if (!trip) return;
    els.tripFormTitle.textContent = "Edit Trip";
    els.saveTripBtn.textContent = "Save Changes";
    els.tripId.value = trip.id;
    els.tripDate.value = trip.date;
    els.tripVehicle.value = trip.vehicleId;
    els.startOdometer.value = trip.startOdometer;
    els.endOdometer.value = trip.endOdometer;
    els.distanceKm.value = trip.distanceKm;
    els.tripCategory.value = trip.category || "Other";
    els.businessPurpose.value = trip.businessPurpose || "";
    els.startLocation.value = trip.startLocation || "";
    els.destination.value = trip.destination || "";
    els.notes.value = trip.notes || "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteTrip(id) {
    const trip = state.trips.find((t) => t.id === id);
    if (!trip) return;
    if (!confirm(`Delete this trip from ${trip.date} (${formatKm(trip.distanceKm)})?`)) return;
    const affectedVehicleId = trip.vehicleId;
    state.trips = state.trips.filter((t) => t.id !== id);
    recomputeVehicleOdometer(affectedVehicleId);
    saveState();
    renderAll();
  }

  function renderTrips() {
    if (!state.trips.length) {
      els.tripList.innerHTML = '<p class="empty">No trips saved yet.</p>';
      return;
    }

    const sorted = [...state.trips].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });

    els.tripList.innerHTML = sorted
      .map((t) => {
        const vehicle = getVehicle(t.vehicleId);
        const notes = String(t.notes ?? "");
        const category = String(t.category ?? "Other");
        const startLocation = String(t.startLocation ?? "");
        const destination = String(t.destination ?? "");
        const businessPurpose = String(t.businessPurpose ?? "");
        const notePreview = notes.length > 60 ? `${notes.slice(0, 60)}…` : notes;
        return `
          <article class="trip-item">
            <div class="trip-head">
              <strong>${escapeHtml(t.date)}</strong>
              <span class="pill">${formatKm(t.distanceKm)}</span>
            </div>
            <div class="meta">
              ${escapeHtml(vehicle ? vehicle.name : "Unknown vehicle")} · ${escapeHtml(category)}
            </div>
            <div>${escapeHtml(startLocation)} → ${escapeHtml(destination)}</div>
            <div class="meta">${escapeHtml(businessPurpose)}</div>
            <div class="meta">${escapeHtml(notePreview)}</div>
            <div class="row" style="margin-top:8px;">
              <button data-action="edit-trip" data-id="${t.id}" class="btn btn-secondary">Edit</button>
              <button data-action="delete-trip" data-id="${t.id}" class="btn btn-danger">Delete</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function getTripYears() {
    const years = new Set();
    for (const t of state.trips) {
      const year = Number(String(t.date || "").slice(0, 4));
      if (year) years.add(year);
    }
    years.add(new Date().getFullYear());
    return [...years].sort((a, b) => b - a);
  }

  function populateReportFilters() {
    const years = getTripYears();
    const previous = els.reportYear.value;
    const fallback = String(new Date().getFullYear());
    els.reportYear.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join("");
    els.reportYear.value = years.map(String).includes(previous) ? previous : fallback;

    if (!els.reportMonth.options.length) {
      els.reportMonth.innerHTML = ['<option value="">Full year</option>']
        .concat(MONTH_NAMES.map((name, i) => `<option value="${i + 1}">${name}</option>`))
        .join("");
    }
  }

  function renderReports() {
    const now = new Date();
    const currentYear = String(now.getFullYear());
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

    populateReportFilters();

    const selectedYear = els.reportYear.value;
    const selectedMonth = els.reportMonth.value; // "" (full year) or "1".."12"
    const selectedMonthPadded = selectedMonth ? selectedMonth.padStart(2, "0") : "";

    let thisMonthTotal = 0;
    let thisYearTotal = 0;
    let periodTotal = 0;
    const byCategory = new Map();
    const byVehicle = new Map();

    for (const t of state.trips) {
      const date = String(t.date || "");
      const year = date.slice(0, 4);
      const month = date.slice(5, 7);
      const km = Number(t.distanceKm || 0);

      if (year === currentYear) {
        thisYearTotal += km;
        if (month === currentMonth) thisMonthTotal += km;
      }

      const inPeriod = year === selectedYear && (!selectedMonthPadded || month === selectedMonthPadded);
      if (inPeriod) {
        periodTotal += km;
        byCategory.set(t.category, (byCategory.get(t.category) || 0) + km);
        const vehicleName = getVehicle(t.vehicleId)?.name || "Unknown vehicle";
        byVehicle.set(vehicleName, (byVehicle.get(vehicleName) || 0) + km);
      }
    }

    els.monthTotal.textContent = formatKm(thisMonthTotal);
    els.yearTotal.textContent = formatKm(thisYearTotal);

    els.reportPeriodLabel.textContent = selectedMonthPadded
      ? `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedYear} total`
      : `${selectedYear} total`;
    els.reportPeriodTotal.textContent = formatKm(periodTotal);

    els.categoryTotals.innerHTML = renderTotalList(byCategory);
    els.vehicleTotals.innerHTML = renderTotalList(byVehicle);
  }

  function renderTotalList(map) {
    if (!map.size) return '<p class="empty">No data yet.</p>';
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<div>${escapeHtml(k)}: <strong>${formatKm(v)}</strong></div>`)
      .join("");
  }

  function updateVehicleOdometer(vehicleId) {
    const vehicle = getVehicle(vehicleId);
    if (!vehicle) return;
    const input = prompt(`Set current odometer for ${vehicle.name} (km):`, String(vehicle.currentOdometer));
    if (input === null) return;
    const val = Number(input);
    if (!Number.isFinite(val) || val < 0) return alert("Invalid odometer value.");
    vehicle.odometerBaseline = roundKm(val);
    recomputeVehicleOdometer(vehicleId);
    saveState();
    renderAll();
  }

  function deleteVehicle(vehicleId) {
    const vehicle = getVehicle(vehicleId);
    if (!vehicle) return;
    const attachedTrips = state.trips.filter((t) => t.vehicleId === vehicleId).length;
    if (attachedTrips > 0) {
      alert(`Cannot delete ${vehicle.name}. It has ${attachedTrips} attached trip(s).`);
      return;
    }
    if (!confirm(`Delete vehicle ${vehicle.name}?`)) return;
    state.vehicles = state.vehicles.filter((v) => v.id !== vehicleId);
    saveState();
    renderAll();
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  }

  function exportCsv() {
    const headers = [
      "Date",
      "Vehicle",
      "Start Odometer",
      "End Odometer",
      "Distance KM",
      "Category",
      "Business Purpose",
      "Start Location",
      "Destination",
      "Notes"
    ];

    const rows = state.trips
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => {
        const vehicleName = getVehicle(t.vehicleId)?.name || "";
        return [
          t.date,
          vehicleName,
          t.startOdometer,
          t.endOdometer,
          t.distanceKm,
          t.category ?? "",
          t.businessPurpose ?? "",
          t.startLocation ?? "",
          t.destination ?? "",
          t.notes ?? ""
        ];
      });

    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    downloadFile(csv, `milomatic-trips-${getLocalDateInputValue()}.csv`, "text/csv;charset=utf-8;");
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      data: state
    };
    downloadFile(JSON.stringify(payload, null, 2), `milomatic-backup-${getLocalDateInputValue()}.json`, "application/json");
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const imported = parsed?.data;
        if (!imported || !Array.isArray(imported.vehicles) || !Array.isArray(imported.trips)) {
          alert("Invalid backup file format.");
          return;
        }
        if (!confirm("Importing will overwrite existing local data. Continue?")) return;
        state.vehicles = imported.vehicles.map(normalizeVehicle);
        state.trips = imported.trips;
        state.categories = Array.isArray(imported.categories) && imported.categories.length ? imported.categories : [...DEFAULT_CATEGORIES];
        state.recentLocations = Array.isArray(imported.recentLocations) ? imported.recentLocations : [];
        recomputeAllVehicleOdometers();
        saveState();
        resetTripForm();
        renderAll();
        alert("Backup imported successfully.");
      } catch {
        alert("Failed to read backup file.");
      }
    };
    reader.readAsText(file);
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    els.addVehicleBtn.addEventListener("click", addVehicle);
    els.tripForm.addEventListener("submit", saveTrip);
    els.cancelEditBtn.addEventListener("click", resetTripForm);

    els.startOdometer.addEventListener("input", calculateDistance);
    els.endOdometer.addEventListener("input", calculateDistance);

    els.useVehicleOdoBtn.addEventListener("click", () => {
      const vehicle = getVehicle(els.tripVehicle.value);
      if (!vehicle) return alert("Select a vehicle first.");
      els.startOdometer.value = vehicle.currentOdometer;
      calculateDistance();
    });

    els.vehicleList.addEventListener("click", (evt) => {
      const target = evt.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.getAttribute("data-action");
      const id = target.getAttribute("data-id");
      if (!action || !id) return;
      if (action === "edit-vehicle") updateVehicleOdometer(id);
      if (action === "delete-vehicle") deleteVehicle(id);
    });

    els.tripList.addEventListener("click", (evt) => {
      const target = evt.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.getAttribute("data-action");
      const id = target.getAttribute("data-id");
      if (!action || !id) return;
      if (action === "edit-trip") editTrip(id);
      if (action === "delete-trip") deleteTrip(id);
    });

    els.reportYear.addEventListener("change", renderReports);
    els.reportMonth.addEventListener("change", renderReports);

    els.exportCsvBtn.addEventListener("click", exportCsv);
    els.exportJsonBtn.addEventListener("click", exportJson);
    els.importJsonInput.addEventListener("change", (evt) => {
      const input = evt.target;
      const file = input.files?.[0];
      if (file) importJson(file);
      input.value = "";
    });
  }

  function renderAll() {
    renderVehicleSelect();
    renderCategorySelect();
    renderRecentLocations();
    renderVehicles();
    renderTrips();
    renderReports();
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js").catch(() => {
        // Silent fail for local file preview or unsupported contexts.
      });
    }
  }

  function init() {
    recomputeAllVehicleOdometers();
    setVehicleFieldsVisibility(false);
    bindEvents();
    renderAll();
    resetTripForm();
    registerServiceWorker();
  }

  init();
})();
