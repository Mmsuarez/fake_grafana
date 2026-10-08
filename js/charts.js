// ==============================================================================
// DASHBOARD CHARTS & VISUALIZATIONS (8 PANELS - GRAFANA & DEFRAG STYLE)
// ==============================================================================

class DashboardCharts {
  constructor(config) {
    this.config = config;
    this.charts = {};
    this._configureDefaults();
  }

  _configureDefaults() {
    if (typeof Chart === "undefined") {
      console.warn("Chart.js not available yet.");
      return;
    }

    Chart.defaults.color = "#8e9aa8";
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.plugins.tooltip.backgroundColor = "rgba(18, 20, 24, 0.95)";
    Chart.defaults.plugins.tooltip.borderColor = "rgba(255, 255, 255, 0.15)";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.titleColor = "#f4f5f6";
    Chart.defaults.plugins.tooltip.bodyColor = "#d8d9da";
    Chart.defaults.plugins.tooltip.padding = 8;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
    Chart.defaults.plugins.legend.labels.color = "#c7d0d9";
  }

  init(initialApps) {
    this._initLatencyChart(initialApps);
    this._initCpuChart(initialApps);
    this._initHttpStatusChart(initialApps);
    this._initRpsChart(initialApps);
    this._initErrorChart(initialApps);
    this._initNetworkChart(initialApps);
    this._initDefragMap(initialApps);
  }

  // ----------------------------------------------------------------------------
  // Helper: Get state-based alert color (Green -> Amber/Yellow -> Red)
  // ----------------------------------------------------------------------------
  _getThemeColor(appState, defaultColor) {
    if (appState === "CRITICAL") return "#f2495c"; // Bright Red
    if (appState === "WARNING") return "#ff9830";  // Amber / Warning Orange
    return defaultColor;
  }

  _getThemeBg(appState, defaultBg) {
    if (appState === "CRITICAL") return "rgba(242, 73, 92, 0.25)";
    if (appState === "WARNING") return "rgba(255, 152, 48, 0.22)";
    return defaultBg;
  }

  // ----------------------------------------------------------------------------
  // PANEL 1: Response Latency (ms) - Time Series
  // ----------------------------------------------------------------------------
  _initLatencyChart(apps) {
    const ctx = document.getElementById("chart-latency")?.getContext("2d");
    if (!ctx) return;

    this.charts.latency = new Chart(ctx, {
      type: "line",
      data: {
        labels: [...apps.app1.history.timestamps],
        datasets: [
          {
            label: apps.app1.config.name,
            data: [...apps.app1.history.latency],
            borderColor: this.config.app1.color,
            backgroundColor: "rgba(87, 148, 242, 0.12)",
            borderWidth: 2.2,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.3,
            fill: true
          },
          {
            label: apps.app2.config.name,
            data: [...apps.app2.history.latency],
            borderColor: this.config.app2.color,
            backgroundColor: "rgba(184, 119, 217, 0.12)",
            borderWidth: 2.2,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        scales: {
          x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { maxTicksLimit: 6 } },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { callback: (val) => `${val}ms` },
            suggestedMin: 0,
            suggestedMax: 120
          }
        }
      }
    });
  }

  // ----------------------------------------------------------------------------
  // PANEL 2: CPU Utilization (%) - Time Series with Dynamic Alert Colors
  // ----------------------------------------------------------------------------
  _initCpuChart(apps) {
    const ctx = document.getElementById("chart-cpu")?.getContext("2d");
    if (!ctx) return;

    this.charts.cpu = new Chart(ctx, {
      type: "line",
      data: {
        labels: [...apps.app1.history.timestamps],
        datasets: [
          {
            label: `${apps.app1.config.name} CPU`,
            data: [...apps.app1.history.cpu],
            borderColor: this.config.app1.color,
            backgroundColor: "rgba(87, 148, 242, 0.08)",
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.35,
            fill: true
          },
          {
            label: `${apps.app2.config.name} CPU`,
            data: [...apps.app2.history.cpu],
            borderColor: this.config.app2.color,
            backgroundColor: "rgba(184, 119, 217, 0.08)",
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        scales: {
          x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { maxTicksLimit: 6 } },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            min: 0,
            max: 100,
            ticks: { callback: (val) => `${val}%` }
          }
        }
      }
    });
  }

  // ----------------------------------------------------------------------------
  // PANEL 3: HTTP Status Codes Distribution (Bar Chart)
  // ----------------------------------------------------------------------------
  _initHttpStatusChart(apps) {
    const ctx = document.getElementById("chart-status-bars")?.getContext("2d");
    if (!ctx) return;

    this.charts.statusBars = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["2xx (Success)", "4xx (Client)", "5xx (Server Error)"],
        datasets: [
          {
            label: apps.app1.config.shortCode,
            data: [apps.app1.current.http2xx, apps.app1.current.http4xx, apps.app1.current.http5xx],
            backgroundColor: ["#73bf69", "#ff9830", "#f2495c"],
            borderWidth: 0,
            borderRadius: 3
          },
          {
            label: apps.app2.config.shortCode,
            data: [apps.app2.current.http2xx, apps.app2.current.http4xx, apps.app2.current.http5xx],
            backgroundColor: ["#378635", "#d67c1e", "#ba2839"],
            borderWidth: 0,
            borderRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { callback: (val) => `${val} req` },
            suggestedMin: 0
          }
        }
      }
    });
  }

  // ----------------------------------------------------------------------------
  // PANEL 4: Request Throughput (Req/sec) - Area Chart
  // ----------------------------------------------------------------------------
  _initRpsChart(apps) {
    const ctx = document.getElementById("chart-rps")?.getContext("2d");
    if (!ctx) return;

    this.charts.rps = new Chart(ctx, {
      type: "line",
      data: {
        labels: [...apps.app1.history.timestamps],
        datasets: [
          {
            label: apps.app1.config.name,
            data: [...apps.app1.history.rps],
            borderColor: this.config.app1.color,
            backgroundColor: "rgba(87, 148, 242, 0.15)",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.25,
            fill: "origin"
          },
          {
            label: apps.app2.config.name,
            data: [...apps.app2.history.rps],
            borderColor: this.config.app2.color,
            backgroundColor: "rgba(184, 119, 217, 0.15)",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.25,
            fill: "origin"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        scales: {
          x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { maxTicksLimit: 6 } },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { callback: (val) => `${val} r/s` },
            suggestedMin: 0
          }
        }
      }
    });
  }

  // ----------------------------------------------------------------------------
  // PANEL 5: HTTP 5xx Error Rate (%) - Time Series with Threshold Alert
  // ----------------------------------------------------------------------------
  _initErrorChart(apps) {
    const ctx = document.getElementById("chart-errors")?.getContext("2d");
    if (!ctx) return;

    this.charts.errors = new Chart(ctx, {
      type: "line",
      data: {
        labels: [...apps.app1.history.timestamps],
        datasets: [
          {
            label: `${apps.app1.config.name} (5xx)`,
            data: [...apps.app1.history.errorRate],
            borderColor: "#f2495c",
            backgroundColor: "rgba(242, 73, 92, 0.15)",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.2,
            fill: true
          },
          {
            label: `${apps.app2.config.name} (5xx)`,
            data: [...apps.app2.history.errorRate],
            borderColor: "#ff9830",
            backgroundColor: "rgba(255, 152, 48, 0.15)",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.2,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        scales: {
          x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { maxTicksLimit: 6 } },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { callback: (val) => `${val}%` },
            suggestedMin: 0,
            suggestedMax: 5
          }
        }
      }
    });
  }

  // ----------------------------------------------------------------------------
  // PANEL 6: Network I/O Bandwidth (MB/s) - Inbound & Outbound
  // ----------------------------------------------------------------------------
  _initNetworkChart(apps) {
    const ctx = document.getElementById("chart-network")?.getContext("2d");
    if (!ctx) return;

    this.charts.network = new Chart(ctx, {
      type: "line",
      data: {
        labels: [...apps.app1.history.timestamps],
        datasets: [
          {
            label: `${apps.app1.config.shortCode} Inbound`,
            data: [...apps.app1.history.netIn],
            borderColor: "#5794f2",
            borderDash: [4, 4],
            borderWidth: 1.8,
            pointRadius: 0,
            tension: 0.3
          },
          {
            label: `${apps.app1.config.shortCode} Outbound`,
            data: [...apps.app1.history.netOut],
            borderColor: "#73bf69",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3
          },
          {
            label: `${apps.app2.config.shortCode} Inbound`,
            data: [...apps.app2.history.netIn],
            borderColor: "#b877d9",
            borderDash: [4, 4],
            borderWidth: 1.8,
            pointRadius: 0,
            tension: 0.3
          },
          {
            label: `${apps.app2.config.shortCode} Outbound`,
            data: [...apps.app2.history.netOut],
            borderColor: "#ff9830",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        scales: {
          x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { maxTicksLimit: 6 } },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { callback: (val) => `${val} MB/s` },
            suggestedMin: 0
          }
        }
      }
    });
  }

  // ----------------------------------------------------------------------------
  // PANEL 7: Cluster Memory & Storage Fragmentation Map (Smart Defrag Style Canvas)
  // ----------------------------------------------------------------------------
  _initDefragMap(apps) {
    this.renderDefragCanvas(apps);
  }

  renderDefragCanvas(apps) {
    const canvas = document.getElementById("defrag-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.clientWidth || 400;
    const height = rect.height || canvas.clientHeight || 140;

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Combine blocks from App 1 & App 2
    const blocks1 = apps.app1.defragBlocks;
    const blocks2 = apps.app2.defragBlocks;
    const totalBlocks = blocks1.length;

    // Grid configuration: 12 rows x 32 columns
    const cols = 32;
    const rows = 12;
    const pad = 2.5;
    const blockW = (width - (cols - 1) * pad) / cols;
    const blockH = (height - (rows - 1) * pad) / rows;

    // Palette: 0: Idle, 1: Healthy Green, 2: Cache Blue, 3: Purple, 4: Warning Orange, 5: Red Outage
    const colorMap = {
      0: "#1e2229", // Empty / Idle
      1: "#2eb85c", // Healthy green
      2: "#339af0", // Cached blue
      3: "#845ef7", // Metadata purple
      4: "#ff922b", // Degraded / Contention orange
      5: "#fa5252"  // Corrupted / Critical red
    };

    let degradedCount = 0;
    let failedCount = 0;
    let healthyCount = 0;

    for (let i = 0; i < totalBlocks; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (blockW + pad);
      const y = row * (blockH + pad);

      // Prioritize worst state between both apps for the shared cluster block
      const val1 = blocks1[i] || 0;
      const val2 = blocks2[i] || 0;
      const stateVal = Math.max(val1, val2);

      if (stateVal === 5) failedCount++;
      else if (stateVal === 4) degradedCount++;
      else if (stateVal >= 1) healthyCount++;

      ctx.fillStyle = colorMap[stateVal] || "#1e2229";

      // Subtle rounded rectangle
      this._roundRect(ctx, x, y, blockW, blockH, 1.5);
      ctx.fill();
    }

    ctx.restore();

    // Update defrag stats in the header
    const fragRate = ((degradedCount + failedCount * 2) / (totalBlocks || 1) * 100).toFixed(1);
    const fragEl = document.getElementById("defrag-frag-rate");
    const healthyEl = document.getElementById("defrag-healthy-count");
    const warnEl = document.getElementById("defrag-warn-count");
    const critEl = document.getElementById("defrag-crit-count");

    if (fragEl) {
      fragEl.textContent = `${fragRate}%`;
      fragEl.style.color = +fragRate > 35 ? "#f2495c" : +fragRate > 10 ? "#ff9830" : "#73bf69";
    }
    if (healthyEl) healthyEl.textContent = healthyCount;
    if (warnEl) warnEl.textContent = degradedCount;
    if (critEl) critEl.textContent = failedCount;
  }

  _roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // ----------------------------------------------------------------------------
  // Update All 7 Visual Panels
  // ----------------------------------------------------------------------------
  update(apps) {
    const labels = apps.app1.history.timestamps;

    // Update Panel 1: Latency (Color changes when degraded/critical)
    if (this.charts.latency) {
      this.charts.latency.data.labels = labels;
      this.charts.latency.data.datasets[0].data = apps.app1.history.latency;
      this.charts.latency.data.datasets[0].borderColor = this._getThemeColor(apps.app1.state, this.config.app1.color);
      this.charts.latency.data.datasets[0].backgroundColor = this._getThemeBg(apps.app1.state, "rgba(87, 148, 242, 0.12)");

      this.charts.latency.data.datasets[1].data = apps.app2.history.latency;
      this.charts.latency.data.datasets[1].borderColor = this._getThemeColor(apps.app2.state, this.config.app2.color);
      this.charts.latency.data.datasets[1].backgroundColor = this._getThemeBg(apps.app2.state, "rgba(184, 119, 217, 0.12)");
      this.charts.latency.update("none");
    }

    // Update Panel 2: CPU (Color changes when degraded/critical)
    if (this.charts.cpu) {
      this.charts.cpu.data.labels = labels;
      this.charts.cpu.data.datasets[0].data = apps.app1.history.cpu;
      this.charts.cpu.data.datasets[0].borderColor = this._getThemeColor(apps.app1.state, this.config.app1.color);

      this.charts.cpu.data.datasets[1].data = apps.app2.history.cpu;
      this.charts.cpu.data.datasets[1].borderColor = this._getThemeColor(apps.app2.state, this.config.app2.color);
      this.charts.cpu.update("none");
    }

    // Update Panel 3: HTTP Status Bars
    if (this.charts.statusBars) {
      this.charts.statusBars.data.datasets[0].data = [
        apps.app1.current.http2xx,
        apps.app1.current.http4xx,
        apps.app1.current.http5xx
      ];
      this.charts.statusBars.data.datasets[1].data = [
        apps.app2.current.http2xx,
        apps.app2.current.http4xx,
        apps.app2.current.http5xx
      ];
      this.charts.statusBars.update("none");
    }

    // Update Panel 4: RPS
    if (this.charts.rps) {
      this.charts.rps.data.labels = labels;
      this.charts.rps.data.datasets[0].data = apps.app1.history.rps;
      this.charts.rps.data.datasets[1].data = apps.app2.history.rps;
      this.charts.rps.update("none");
    }

    // Update Panel 5: Errors
    if (this.charts.errors) {
      this.charts.errors.data.labels = labels;
      this.charts.errors.data.datasets[0].data = apps.app1.history.errorRate;
      this.charts.errors.data.datasets[1].data = apps.app2.history.errorRate;
      this.charts.errors.update("none");
    }

    // Update Panel 6: Network I/O
    if (this.charts.network) {
      this.charts.network.data.labels = labels;
      this.charts.network.data.datasets[0].data = apps.app1.history.netIn;
      this.charts.network.data.datasets[1].data = apps.app1.history.netOut;
      this.charts.network.data.datasets[2].data = apps.app2.history.netIn;
      this.charts.network.data.datasets[3].data = apps.app2.history.netOut;
      this.charts.network.update("none");
    }

    // Update Panel 7: Defrag Canvas
    this.renderDefragCanvas(apps);
  }
}
