/*
  Milomatic v1
  - Stores all data in localStorage for offline/private use
  - No external dependencies
  - Calculates trip distance in km and provides reports + exports
*/
(() => {
  const STORAGE_KEY = "milomatic_v1";
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
    notes: document.getElementById("notes"),
    saveTripBtn: document.getElementById("saveTripBtn"),
    cancelEditBtn: document.getElementById("cancelEditBtn"),
    useVehicleOdoBtn: document.getElementById("useVehicleOdoBtn"),

    monthTotal: document.getElementById("monthTotal"),
    yearTotal: document.getElementById("yearTotal"),
    categoryTotals: document.getElementById("categoryTotals"),
    vehicleTotals: document.getElementById("vehicleTotals"),

    tripList: document.getElementById("tripList"),

    exportCsvBtn: document.getElementById("exportCsvBtn"),
    exportJsonBtn: document.getElementById("exportJsonBtn"),
    importJsonInput: document.getElementById("importJsonInput")
  };

  const state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { vehicles: [], trips: [], categories: [...DEFAULT_CATEGORIES] };
      }
      const parsed = JSON.parse(raw);
      return {
        vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [],
        trips: Array.isArray(parsed.trips) ? parsed.trips : [],
        categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : [...DEFAULT_CATEGORIES]
      };
    } catch {
      return { vehicles: [], trips: [], categories: [...DEFAULT_CATEGORIES] };
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

  function addVehicle() {
    const name = els.vehicleName.value.trim();
    const odometer = Number(els.vehicleOdometer.value);
    if (!name) return alert("Please enter a vehicle name.");
    if (!Number.isFinite(odometer) || odometer < 0) return alert("Please enter a valid odometer in km.");
    state.vehicles.push({ id: uid("veh"), name, currentOdometer: roundKm(odometer) });
    saveState();
    els.vehicleName.value = "";
    els.vehicleOdometer.value = "";
    renderAll();
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

    const vehicle = getVehicle(trip.vehicleId);
    if (vehicle && trip.endOdometer > vehicle.currentOdometer) {
      vehicle.currentOdometer = trip.endOdometer;
    }

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
    state.trips = state.trips.filter((t) => t.id !== id);
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

  function renderReports() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let yearTotal = 0;
    let monthTotal = 0;
    const byCategory = new Map();
    const byVehicle = new Map();

    for (const t of state.trips) {
      const d = new Date(`${t.date}T00:00:00`);
      const km = Number(t.distanceKm || 0);
      if (d.getFullYear() === currentYear) yearTotal += km;
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) monthTotal += km;
      byCategory.set(t.category, (byCategory.get(t.category) || 0) + km);
      const vehicleName = getVehicle(t.vehicleId)?.name || "Unknown vehicle";
      byVehicle.set(vehicleName, (byVehicle.get(vehicleName) || 0) + km);
    }

    els.monthTotal.textContent = formatKm(monthTotal);
    els.yearTotal.textContent = formatKm(yearTotal);

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
    vehicle.currentOdometer = roundKm(val);
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
        state.vehicles = imported.vehicles;
        state.trips = imported.trips;
        state.categories = Array.isArray(imported.categories) && imported.categories.length ? imported.categories : [...DEFAULT_CATEGORIES];
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
    bindEvents();
    renderAll();
    resetTripForm();
    registerServiceWorker();
  }

  init();
})();
