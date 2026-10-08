// ==============================================================================
// REAL-TIME TELEMETRY & SIMULATION ENGINE (PROMETHEUS NODE EXPORTER SIMULATOR)
// ==============================================================================

class MetricsEngine {
  constructor(config) {
    this.config = config;
    this.subscribers = [];
    this.historyLength = config.dashboard.historyDataPoints || 22;

    // Block matrix size for Defrag-style Heatmap (12 rows x 32 cols = 384 blocks)
    this.totalDefragBlocks = 384;

    // Internal state for each application
    this.apps = {
      app1: this._createAppState(config.app1),
      app2: this._createAppState(config.app2)
    };

    // Incident log history (Alertmanager style)
    this.incidentLogs = [
      {
        id: 1,
        time: this._getTimeString(),
        appId: "system",
        appName: "Prometheus Agent",
        severity: "INFO",
        message: "Scraping telemetry targets active. All workloads reporting OK (200 OK)."
      }
    ];

    this.timer = null;
  }

  _createAppState(appConfig) {
    const base = appConfig.baseline;
    const now = new Date();

    const timestamps = [];
    const cpuHistory = [];
    const memHistory = [];
    const latencyHistory = [];
    const rpsHistory = [];
    const errorHistory = [];
    const netInHistory = [];
    const netOutHistory = [];

    // Pre-populate initial time-series data with natural micro-fluctuations
    for (let i = this.historyLength - 1; i >= 0; i--) {
      const pastTime = new Date(now.getTime() - i * this.config.dashboard.refreshIntervalMs);
      timestamps.push(this._formatTime(pastTime));
      cpuHistory.push(Math.max(5, +(base.cpu + (Math.random() * 4 - 2)).toFixed(1)));
      memHistory.push(Math.max(10, +(base.memory + (Math.random() * 2 - 1)).toFixed(1)));
      latencyHistory.push(Math.max(10, Math.round(base.latency + (Math.random() * 6 - 3))));
      rpsHistory.push(Math.max(100, Math.round(base.rps + (Math.random() * 30 - 15))));
      errorHistory.push(Math.max(0, +(base.errorRate + (Math.random() * 0.04)).toFixed(2)));
      netInHistory.push(Math.max(5, +(base.netIn + (Math.random() * 3 - 1.5)).toFixed(1)));
      netOutHistory.push(Math.max(10, +(base.netOut + (Math.random() * 6 - 3)).toFixed(1)));
    }

    return {
      config: appConfig,
      state: "HEALTHY", // 'HEALTHY' | 'WARNING' | 'CRITICAL'
      current: {
        cpu: base.cpu,
        memory: base.memory,
        latency: base.latency,
        rps: base.rps,
        errorRate: base.errorRate,
        netIn: base.netIn,
        netOut: base.netOut,
        sloScore: base.sloScore,
        // Status codes breakdown
        http2xx: Math.round(base.rps * 0.98),
        http4xx: Math.round(base.rps * 0.019),
        http5xx: Math.round(base.rps * 0.001)
      },
      target: {
        cpu: base.cpu,
        memory: base.memory,
        latency: base.latency,
        rps: base.rps,
        errorRate: base.errorRate,
        netIn: base.netIn,
        netOut: base.netOut,
        sloScore: base.sloScore,
        http2xx: Math.round(base.rps * 0.98),
        http4xx: Math.round(base.rps * 0.019),
        http5xx: Math.round(base.rps * 0.001)
      },
      history: {
        timestamps,
        cpu: cpuHistory,
        memory: memHistory,
        latency: latencyHistory,
        rps: rpsHistory,
        errorRate: errorHistory,
        netIn: netInHistory,
        netOut: netOutHistory
      },
      uptimeSeconds: 168400 + Math.floor(Math.random() * 5000),
      // Array of block states for the Defrag-style matrix
      defragBlocks: this._generateInitialBlocks()
    };
  }

  // Generate initial block states for defrag map
  // 0: Empty/Free (gray), 1: Healthy/Allocated (green), 2: Cached (blue), 3: Metadata (purple)
  _generateInitialBlocks() {
    const blocks = [];
    for (let i = 0; i < this.totalDefragBlocks; i++) {
      const rand = Math.random();
      if (rand < 0.12) blocks.push(0);      // Gray
      else if (rand < 0.65) blocks.push(1); // Green
      else if (rand < 0.88) blocks.push(2); // Blue
      else blocks.push(3);                  // Purple
    }
    return blocks;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this._tick();
    }, this.config.dashboard.refreshIntervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Triggered by keyboard shortcuts or UI action buttons
  setState(appId, newState) {
    const app = this.apps[appId];
    if (!app) return;
    if (app.state === newState) return;

    app.state = newState;
    const base = app.config.baseline;

    if (newState === "HEALTHY") {
      app.target.cpu = base.cpu;
      app.target.memory = base.memory;
      app.target.latency = base.latency;
      app.target.rps = base.rps;
      app.target.errorRate = base.errorRate;
      app.target.netIn = base.netIn;
      app.target.netOut = base.netOut;
      app.target.sloScore = 99.98;
      app.target.http2xx = Math.round(base.rps * 0.98);
      app.target.http4xx = Math.round(base.rps * 0.018);
      app.target.http5xx = Math.round(base.rps * 0.002);

      this._addIncident({
        appId: app.config.id,
        appName: app.config.name,
        severity: "RESOLVED",
        message: `Service restored to healthy operational baseline. All health probes returning 200 OK.`
      });
    } else if (newState === "WARNING") {
      app.target.cpu = 79 + (Math.random() * 8);
      app.target.memory = 74 + (Math.random() * 6);
      app.target.latency = 890 + (Math.random() * 280);
      app.target.rps = Math.round(base.rps * 0.68);
      app.target.errorRate = 5.2 + (Math.random() * 2.5);
      app.target.netIn = +(base.netIn * 1.5).toFixed(1);
      app.target.netOut = +(base.netOut * 0.7).toFixed(1);
      app.target.sloScore = 84.5;
      app.target.http2xx = Math.round(app.target.rps * 0.88);
      app.target.http4xx = Math.round(app.target.rps * 0.06);
      app.target.http5xx = Math.round(app.target.rps * 0.06);

      this._addIncident({
        appId: app.config.id,
        appName: app.config.name,
        severity: "WARNING",
        message: `High latency threshold exceeded (>850ms) and 5xx error rate spiked to ${app.target.errorRate.toFixed(1)}%.`
      });
    } else if (newState === "CRITICAL") {
      app.target.cpu = 97 + (Math.random() * 2.5);
      app.target.memory = 95 + (Math.random() * 3.5);
      app.target.latency = 3750 + (Math.random() * 850);
      app.target.rps = Math.max(12, Math.round(base.rps * 0.1));
      app.target.errorRate = 48 + (Math.random() * 18);
      app.target.netIn = +(base.netIn * 0.15).toFixed(1);
      app.target.netOut = +(base.netOut * 0.12).toFixed(1);
      app.target.sloScore = 28.3;
      app.target.http2xx = Math.round(app.target.rps * 0.25);
      app.target.http4xx = Math.round(app.target.rps * 0.15);
      app.target.http5xx = Math.round(app.target.rps * 0.60);

      this._addIncident({
        appId: app.config.id,
        appName: app.config.name,
        severity: "CRITICAL",
        message: `CRITICAL OUTAGE: Service unresponsive, severe 5xx error rate (>45%), connection timeouts exceeding 3.5s.`
      });
    }

    this._notifySubscribers();
  }

  _tick() {
    const timeStr = this._formatTime(new Date());

    Object.keys(this.apps).forEach(appId => {
      const app = this.apps[appId];
      app.uptimeSeconds += Math.round(this.config.dashboard.refreshIntervalMs / 1000);

      // Smooth interpolation towards target (LERP) + organic Gaussian noise
      const lerp = 0.35;
      const isCrit = app.state === "CRITICAL";
      const isWarn = app.state === "WARNING";

      const jitterCpu = (Math.random() - 0.5) * (isCrit ? 2.5 : isWarn ? 2.0 : 1.2);
      const jitterMem = (Math.random() - 0.5) * 0.7;
      const jitterLatency = (Math.random() - 0.5) * (isCrit ? 220 : isWarn ? 60 : 7);
      const jitterRps = (Math.random() - 0.5) * 20;
      const jitterError = (Math.random() - 0.5) * (isCrit ? 3.5 : isWarn ? 0.6 : 0.05);

      app.current.cpu = Math.max(1, Math.min(100, +(app.current.cpu + (app.target.cpu - app.current.cpu) * lerp + jitterCpu).toFixed(1)));
      app.current.memory = Math.max(1, Math.min(100, +(app.current.memory + (app.target.memory - app.current.memory) * lerp + jitterMem).toFixed(1)));
      app.current.latency = Math.max(5, Math.round(app.current.latency + (app.target.latency - app.current.latency) * lerp + jitterLatency));
      app.current.rps = Math.max(0, Math.round(app.current.rps + (app.target.rps - app.current.rps) * lerp + jitterRps));
      app.current.errorRate = Math.max(0, Math.min(100, +(app.current.errorRate + (app.target.errorRate - app.current.errorRate) * lerp + jitterError).toFixed(2)));
      app.current.netIn = Math.max(0.1, +(app.current.netIn + (app.target.netIn - app.current.netIn) * lerp + (Math.random() - 0.5) * 2).toFixed(1));
      app.current.netOut = Math.max(0.1, +(app.current.netOut + (app.target.netOut - app.current.netOut) * lerp + (Math.random() - 0.5) * 4).toFixed(1));
      app.current.sloScore = Math.max(5, Math.min(100, +(app.current.sloScore + (app.target.sloScore - app.current.sloScore) * lerp).toFixed(2)));

      app.current.http2xx = Math.max(0, Math.round(app.current.http2xx + (app.target.http2xx - app.current.http2xx) * lerp));
      app.current.http4xx = Math.max(0, Math.round(app.current.http4xx + (app.target.http4xx - app.current.http4xx) * lerp));
      app.current.http5xx = Math.max(0, Math.round(app.current.http5xx + (app.target.http5xx - app.current.http5xx) * lerp));

      // Update time-series history
      app.history.timestamps.push(timeStr);
      app.history.cpu.push(app.current.cpu);
      app.history.memory.push(app.current.memory);
      app.history.latency.push(app.current.latency);
      app.history.rps.push(app.current.rps);
      app.history.errorRate.push(app.current.errorRate);
      app.history.netIn.push(app.current.netIn);
      app.history.netOut.push(app.current.netOut);

      if (app.history.timestamps.length > this.historyLength) {
        app.history.timestamps.shift();
        app.history.cpu.shift();
        app.history.memory.shift();
        app.history.latency.shift();
        app.history.rps.shift();
        app.history.errorRate.shift();
        app.history.netIn.shift();
        app.history.netOut.shift();
      }

      // Update Defrag-style blocks based on state
      this._updateDefragBlocks(app);
    });

    this._notifySubscribers();
  }

  // Defrag blocks update:
  // 0: Gray (Idle), 1: Green (Healthy), 2: Blue (Cache), 3: Purple (Master)
  // 4: Yellow/Amber (Degraded/High I/O), 5: Red (Failed/Outage)
  _updateDefragBlocks(app) {
    const blocks = app.defragBlocks;
    const isCrit = app.state === "CRITICAL";
    const isWarn = app.state === "WARNING";

    for (let i = 0; i < blocks.length; i++) {
      const rand = Math.random();
      if (isCrit) {
        // Critical: High percentage of red and dark gray failed blocks
        if (rand < 0.55) blocks[i] = 5;      // Red (corrupted / failed)
        else if (rand < 0.80) blocks[i] = 4; // Orange/Yellow
        else if (rand < 0.92) blocks[i] = 0; // Gray (unreachable)
        else blocks[i] = 1;                  // Green remnant
      } else if (isWarn) {
        // Warning: Significant number of yellow/orange contention blocks
        if (rand < 0.45) blocks[i] = 4;      // Yellow/Amber
        else if (rand < 0.70) blocks[i] = 1; // Green
        else if (rand < 0.85) blocks[i] = 2; // Blue
        else if (rand < 0.95) blocks[i] = 0; // Gray
        else blocks[i] = 5;                  // Occasional red warning
      } else {
        // Healthy: Clean green, blue, purple, gray
        if (blocks[i] >= 4) {
          // Heal corrupted blocks progressively
          blocks[i] = rand < 0.65 ? 1 : rand < 0.85 ? 2 : 0;
        } else if (rand < 0.05) {
          // Slight natural churn
          blocks[i] = rand < 0.03 ? 1 : 2;
        }
      }
    }
  }

  _addIncident(incident) {
    const newIncident = {
      id: Date.now(),
      time: this._getTimeString(),
      ...incident
    };
    this.incidentLogs.unshift(newIncident);
    if (this.incidentLogs.length > 35) {
      this.incidentLogs.pop();
    }
  }

  subscribe(callback) {
    this.subscribers.push(callback);
  }

  _notifySubscribers() {
    this.subscribers.forEach(cb => cb(this.apps, this.incidentLogs));
  }

  _formatTime(date) {
    return date.toTimeString().split(' ')[0];
  }

  _getTimeString() {
    return new Date().toLocaleTimeString();
  }
}
