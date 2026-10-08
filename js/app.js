// ==============================================================================
// MAIN APPLICATION COORDINATOR (APP.JS) - ALL ENGLISH UI
// ==============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // 1. Populate UI metadata from config.js
  applyConfiguration(APP_CONFIG);

  // 2. Initialize subsystems
  const metricsEngine = new MetricsEngine(APP_CONFIG);
  const chartsManager = new DashboardCharts(APP_CONFIG);
  chartsManager.init(metricsEngine.apps);

  const keyboardListener = new KeyboardListener((appId, action) => {
    metricsEngine.setState(appId, action);
  });

  const terminalConsole = new TerminalConsole(metricsEngine);

  // 3. Subscribe to real-time telemetry stream
  metricsEngine.subscribe((apps, incidents) => {
    updateAppCard("app1", apps.app1);
    updateAppCard("app2", apps.app2);
    chartsManager.update(apps);
    updateIncidentsTable(incidents);
  });

  // 4. Start topbar live clock
  initRealtimeClock();

  // 5. Start telemetry simulation loop
  metricsEngine.start();

  // 6. Setup cheat sheet modal and manual triggers
  setupModalAndControls(metricsEngine);

  // 7. Handle window resize for canvas redraws
  window.addEventListener("resize", () => {
    chartsManager.renderDefragCanvas(metricsEngine.apps);
  });
});

// ------------------------------------------------------------------------------
// Dynamic Config Loader
// ------------------------------------------------------------------------------
function applyConfiguration(config) {
  document.getElementById("dashboard-title-text").textContent = config.dashboard.title;
  document.getElementById("cluster-tag").textContent = config.dashboard.cluster;
  document.getElementById("env-tag").textContent = config.dashboard.environment;

  // App 1
  document.getElementById("app1-title").textContent = config.app1.name;
  document.getElementById("app1-badge").textContent = config.app1.shortCode;
  document.getElementById("app1-desc").textContent = config.app1.description;
  document.getElementById("app1-host").textContent = `host: ${config.app1.host}`;
  document.getElementById("app1-ip").textContent = `endpoint: ${config.app1.ip}`;

  // App 2
  document.getElementById("app2-title").textContent = config.app2.name;
  document.getElementById("app2-badge").textContent = config.app2.shortCode;
  document.getElementById("app2-desc").textContent = config.app2.description;
  document.getElementById("app2-host").textContent = `host: ${config.app2.host}`;
  document.getElementById("app2-ip").textContent = `endpoint: ${config.app2.ip}`;
}

// ------------------------------------------------------------------------------
// Update App Summary Cards with Highlighted Anomaly Alert States
// ------------------------------------------------------------------------------
function updateAppCard(appKey, appData) {
  const card = document.getElementById(`${appKey}-card`);
  const statusBadge = document.getElementById(`${appKey}-status-badge`);
  const cpuVal = document.getElementById(`${appKey}-cpu-val`);
  const memVal = document.getElementById(`${appKey}-mem-val`);
  const latencyVal = document.getElementById(`${appKey}-latency-val`);
  const rpsVal = document.getElementById(`${appKey}-rps-val`);
  const errorVal = document.getElementById(`${appKey}-error-val`);

  if (!card) return;

  const state = appData.state; // HEALTHY | WARNING | CRITICAL
  const curr = appData.current;

  // Visual card state classes
  card.className = `app-card status-${state.toLowerCase()}`;

  // Status Badge
  statusBadge.className = `status-badge ${state.toLowerCase()}`;
  if (state === "HEALTHY") {
    statusBadge.innerHTML = `<span class="pulse-dot"></span> OPERATIONAL`;
  } else if (state === "WARNING") {
    statusBadge.innerHTML = `⚠️ DEGRADED`;
  } else {
    statusBadge.innerHTML = `🚨 CRITICAL OUTAGE`;
  }

  // CPU Color threshold
  cpuVal.textContent = `${curr.cpu}%`;
  cpuVal.className = `metric-val ${curr.cpu > 90 ? "red" : curr.cpu > 70 ? "orange" : "green"}`;

  // Memory Color threshold
  memVal.textContent = `${curr.memory}%`;
  memVal.className = `metric-val ${curr.memory > 90 ? "red" : curr.memory > 70 ? "orange" : "green"}`;

  // Latency Color threshold
  latencyVal.textContent = `${curr.latency}ms`;
  latencyVal.className = `metric-val ${curr.latency > 1500 ? "red" : curr.latency > 500 ? "orange" : "green"}`;

  // RPS
  rpsVal.textContent = curr.rps.toLocaleString();

  // 5xx Error Rate
  errorVal.textContent = `${curr.errorRate}%`;
  errorVal.className = `metric-val ${curr.errorRate > 10 ? "red" : curr.errorRate > 1.5 ? "orange" : "green"}`;
}

// ------------------------------------------------------------------------------
// Incident & Alertmanager Table
// ------------------------------------------------------------------------------
function updateIncidentsTable(incidents) {
  const tbody = document.getElementById("incidents-tbody");
  if (!tbody) return;

  tbody.innerHTML = incidents.map(item => {
    let pillClass = "info";
    if (item.severity === "CRITICAL") pillClass = "critical";
    else if (item.severity === "WARNING") pillClass = "warning";
    else if (item.severity === "RESOLVED") pillClass = "resolved";

    return `
      <tr>
        <td style="font-family: var(--font-mono); color: var(--text-muted);">${item.time}</td>
        <td><span class="severity-pill ${pillClass}">${item.severity}</span></td>
        <td style="font-weight: 500; color: #fff;">${item.appName}</td>
        <td>${item.message}</td>
      </tr>
    `;
  }).join("");
}

// ------------------------------------------------------------------------------
// Topbar Live Clock
// ------------------------------------------------------------------------------
function initRealtimeClock() {
  const clockEl = document.getElementById("realtime-clock");
  if (!clockEl) return;

  const updateClock = () => {
    const now = new Date();
    clockEl.textContent = now.toTimeString().split(" ")[0];
  };

  updateClock();
  setInterval(updateClock, 1000);
}

// ------------------------------------------------------------------------------
// Cheat Sheet Modal & Manual Triggers
// ------------------------------------------------------------------------------
function setupModalAndControls(metricsEngine) {
  const modal = document.getElementById("cheat-modal");
  const btnHelp = document.getElementById("btn-help-toggle");
  const btnClose = document.getElementById("modal-close");

  const openModal = () => modal.classList.add("open");
  const closeModal = () => modal.classList.remove("open");

  if (btnHelp) btnHelp.addEventListener("click", openModal);
  if (btnClose) btnClose.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  window.addEventListener("toggle-cheat-modal", () => {
    modal.classList.toggle("open");
  });

  window.addEventListener("close-cheat-modal", closeModal);

  // Quick Action Buttons inside modal
  document.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const app = btn.dataset.app;
      const action = btn.dataset.action;
      metricsEngine.setState(app, action);
    });
  });

  const btnOpenTerm = document.getElementById("btn-open-term-modal");
  if (btnOpenTerm) {
    btnOpenTerm.addEventListener("click", () => {
      closeModal();
      window.dispatchEvent(new CustomEvent("toggle-terminal"));
    });
  }
}
