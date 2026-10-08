// ==============================================================================
// SIMULATED INTERACTIVE TERMINAL / CLI CONTROLLER (TERMINAL.JS)
// ==============================================================================

class TerminalConsole {
  constructor(metricsEngine) {
    this.metricsEngine = metricsEngine;
    this.modal = document.getElementById("terminal-modal");
    this.output = document.getElementById("terminal-output");
    this.input = document.getElementById("terminal-input");
    this.promptPrefix = document.getElementById("terminal-prompt-prefix");
    this.closeBtn = document.getElementById("terminal-close-btn");
    this.toggleBtn = document.getElementById("btn-terminal-toggle");

    this.history = [];
    this.historyIndex = -1;
    this.isBusy = false;

    this._init();
  }

  _init() {
    // Open/Close button events
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener("click", () => this.toggle());
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.close());
    }

    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    // Input keyboard events
    if (this.input) {
      this.input.addEventListener("keydown", (e) => this._handleInputKey(e));
    }

    // Custom window events
    window.addEventListener("toggle-terminal", () => this.toggle());
    window.addEventListener("close-terminal", () => this.close());
  }

  open() {
    if (!this.modal) return;
    this.modal.classList.add("open");
    setTimeout(() => {
      if (this.input) this.input.focus();
    }, 100);
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.remove("open");
  }

  toggle() {
    if (!this.modal) return;
    if (this.modal.classList.contains("open")) {
      this.close();
    } else {
      this.open();
    }
  }

  _handleInputKey(e) {
    if (e.key === "Enter") {
      const rawCmd = this.input.value.trim();
      if (!rawCmd) return;

      // Add to command history
      this.history.push(rawCmd);
      this.historyIndex = this.history.length;

      // Print command line
      this._printLine(`<span class="term-prompt">operator@k8s-bastion:~$</span> <span class="term-cmd">${this._escapeHtml(rawCmd)}</span>`);
      this.input.value = "";

      // Process command
      this._executeCommand(rawCmd);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (this.history.length > 0 && this.historyIndex > 0) {
        this.historyIndex--;
        this.input.value = this.history[this.historyIndex];
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.input.value = this.history[this.historyIndex];
      } else {
        this.historyIndex = this.history.length;
        this.input.value = "";
      }
    }
  }

  _executeCommand(raw) {
    const cmd = raw.toLowerCase().trim();

    // 1. CLEAR
    if (cmd === "clear" || cmd === "cls") {
      this.output.innerHTML = "";
      return;
    }

    // 2. EXIT / QUIT
    if (cmd === "exit" || cmd === "quit") {
      this.close();
      return;
    }

    // 3. HELP
    if (cmd === "help" || cmd === "?") {
      this._printHelp();
      return;
    }

    // 4. STATUS COMMANDS: "app1 status", "app2 status"
    const statusMatch = cmd.match(/^app(1|2)\s+status/);
    if (statusMatch) {
      const appId = `app${statusMatch[1]}`;
      this._runStatusCommand(appId);
      return;
    }

    // 5. FAILED FIX WITH HYPHEN: "app1 -fix1", "app2 -fix2", etc.
    const failFixMatch = cmd.match(/^app(1|2)\s+-fix([1-4])/);
    if (failFixMatch) {
      const appId = `app${failFixMatch[1]}`;
      const fixNum = failFixMatch[2];
      this._runFixCommand(appId, fixNum, true, raw);
      return;
    }

    // 6. SUCCESSFUL FIX: "app1 fix1", "app2 fix2", etc. (accepts any text after)
    const fixMatch = cmd.match(/^app(1|2)\s+fix([1-4])/);
    if (fixMatch) {
      const appId = `app${fixMatch[1]}`;
      const fixNum = fixMatch[2];
      this._runFixCommand(appId, fixNum, false, raw);
      return;
    }

    // 7. SIMULATION TRIGGERS VIA CLI
    if (cmd === "app1d" || cmd === "app1 down") {
      this.metricsEngine.setState("app1", "WARNING");
      this._printLine(`<span class="term-yellow">[ALERT] Triggered WARNING state on App 1 (Payments Core API)</span>`);
      return;
    }
    if (cmd === "app1k" || cmd === "app1 kill") {
      this.metricsEngine.setState("app1", "CRITICAL");
      this._printLine(`<span class="term-red">[ALERT] Triggered CRITICAL OUTAGE on App 1 (Payments Core API)</span>`);
      return;
    }
    if (cmd === "app1u" || cmd === "app1 up" || cmd === "app1 restore") {
      this.metricsEngine.setState("app1", "HEALTHY");
      this._printLine(`<span class="term-green">[OK] App 1 restored to HEALTHY baseline</span>`);
      return;
    }

    if (cmd === "app2d" || cmd === "app2 down") {
      this.metricsEngine.setState("app2", "WARNING");
      this._printLine(`<span class="term-yellow">[ALERT] Triggered WARNING state on App 2 (Auth & Customer Portal)</span>`);
      return;
    }
    if (cmd === "app2k" || cmd === "app2 kill") {
      this.metricsEngine.setState("app2", "CRITICAL");
      this._printLine(`<span class="term-red">[ALERT] Triggered CRITICAL OUTAGE on App 2 (Auth & Customer Portal)</span>`);
      return;
    }
    if (cmd === "app2u" || cmd === "app2 up" || cmd === "app2 restore") {
      this.metricsEngine.setState("app2", "HEALTHY");
      this._printLine(`<span class="term-green">[OK] App 2 restored to HEALTHY baseline</span>`);
      return;
    }

    // UNKNOWN COMMAND
    this._printLine(`<span class="term-red">command not found: ${this._escapeHtml(raw)}. Type 'help' for available commands.</span>`);
  }

  // ----------------------------------------------------------------------------
  // STATUS COMMAND GENERATOR (Lines stream based on current state)
  // ----------------------------------------------------------------------------
  _runStatusCommand(appId) {
    const app = this.metricsEngine.apps[appId];
    if (!app) return;

    const state = app.state; // HEALTHY, WARNING, CRITICAL
    const name = app.config.name;
    const host = app.config.host;
    const curr = app.current;

    const lines = [
      `<span class="term-cyan">[INIT] Querying telemetry target: ${host}...</span>`,
      `<span class="term-gray">[DEBUG] Handshake established via gRPC port 9100.</span>`,
      `<span class="term-gray">[DEBUG] Probing HTTP endpoints: /healthz, /ready, /metrics...</span>`,
      `<span class="term-gray">[METRIC] Sampling thread pool allocation across 4 worker cores...</span>`,
      `<span class="term-gray">[METRIC] TCP socket audit: syn_backlog count checked.</span>`
    ];

    if (state === "HEALTHY") {
      lines.push(
        `<span class="term-green">[OK] Probe /healthz: 200 OK (Latency: ${curr.latency}ms)</span>`,
        `<span class="term-green">[OK] Probe /ready: all 4 pods reporting healthy readiness probes.</span>`,
        `<span class="term-green">[OK] CPU load: ${curr.cpu}% within nominal threshold (&lt; 70%).</span>`,
        `<span class="term-green">[OK] Memory heap: ${curr.memory}% allocated. Garbage collection nominal.</span>`,
        `<span class="term-green">[OK] Network throughput: ${curr.rps} req/sec | 5xx error rate: ${curr.errorRate}%.</span>`,
        `<span class="term-green">[OK] Database pool: active connections healthy, 0 queued transactions.</span>`,
        `<span class="term-green">[SUCCESS] Service Status: OPERATIONAL - All health probes OK.</span>`
      );
    } else if (state === "WARNING") {
      lines.push(
        `<span class="term-yellow">[WARN] Probe /healthz: 200 OK with degraded response (${curr.latency}ms).</span>`,
        `<span class="term-yellow">[WARN] Thread saturation: worker pool utilization reached 84%.</span>`,
        `<span class="term-yellow">[WARN] CPU load: ${curr.cpu}% - high I/O wait contention detected.</span>`,
        `<span class="term-yellow">[WARN] Latency spike: p99 duration exceeding 850ms threshold.</span>`,
        `<span class="term-yellow">[WARN] Minor HTTP 503 errors detected: ${curr.errorRate}% rate.</span>`,
        `<span class="term-yellow">[ALERT] Service Status: DEGRADED - High latency and resource contention.</span>`
      );
    } else {
      // CRITICAL
      lines.push(
        `<span class="term-red">[FATAL] Probe /healthz: TIMEOUT after 3500ms (Connection refused).</span>`,
        `<span class="term-red">[FATAL] Readiness check failed on 3 out of 4 container pods.</span>`,
        `<span class="term-red">[ERROR] OutOfMemory (OOMKilled) events detected on node executor.</span>`,
        `<span class="term-red">[ERROR] CPU load pinned at ${curr.cpu}% with unhandled event queue buildup.</span>`,
        `<span class="term-red">[ERROR] Cascading 5xx error rate: ${curr.errorRate}% of client requests failing.</span>`,
        `<span class="term-red">[FATAL] Circuit breaker OPEN: inbound traffic shedding active.</span>`,
        `<span class="term-red">[EMERGENCY] Service Status: CRITICAL OUTAGE - Immediate remediation required!</span>`
      );
    }

    this._streamLines(lines);
  }

  // ----------------------------------------------------------------------------
  // FIX COMMAND GENERATOR (fix1..4, and -fix1..4 failure)
  // ----------------------------------------------------------------------------
  _runFixCommand(appId, fixNum, willFail, rawCmd) {
    const app = this.metricsEngine.apps[appId];
    if (!app) return;

    const name = app.config.name;

    const fixDescriptions = {
      1: "Restarting pod container instances & flushing in-memory cache",
      2: "Rolling back deployment revision to previous known-good baseline",
      3: "Scaling horizontal pod autoscaler (HPA) & clearing network queue",
      4: "Applying hotfix patch to threadpool & reloading configuration"
    };

    const actionText = fixDescriptions[fixNum] || "Applying automated cluster remediation";

    const lines = [
      `<span class="term-cyan">[EXEC] Target: ${name} (ID: ${appId})</span>`,
      `<span class="term-cyan">[TASK] ${actionText}...</span>`,
      `<span class="term-gray">[DEBUG] Executing command: "${this._escapeHtml(rawCmd)}"</span>`,
      `<span class="term-gray">[STEP 1/4] Draining current socket connections...</span>`,
      `<span class="term-gray">[STEP 2/4] Verifying cluster state & pod replica manifests...</span>`
    ];

    if (willFail) {
      // SIMULATED FAILURE (when '-' was used, like "app1 -fix1")
      lines.push(
        `<span class="term-gray">[STEP 3/4] Deploying remediation hook...</span>`,
        `<span class="term-red">[ERROR] Lock acquisition failed: Resource deadlock detected on node daemon.</span>`,
        `<span class="term-red">[FAIL] Rollback aborted: Checksum signature verification mismatch!</span>`,
        `<span class="term-red">[ERROR] Container crashed during patch restart (ExitCode 137).</span>`,
        `<span class="term-red">[FAIL] Remediation failed! Service remains in degraded/critical state.</span>`
      );
      this._streamLines(lines);
    } else {
      // SUCCESSFUL REPAIR SIMULATION (Does not alter dashboard telemetry state)
      lines.push(
        `<span class="term-gray">[STEP 3/4] Applying configuration changes & spinning up replacement pods...</span>`,
        `<span class="term-green">[OK] New container pods initialized and bound to endpoints.</span>`,
        `<span class="term-gray">[STEP 4/4] Running synthetic health checks...</span>`,
        `<span class="term-green">[OK] Local probe /healthz returning 200 OK (32ms).</span>`,
        `<span class="term-green">[OK] Error rate normalized locally.</span>`,
        `<span class="term-green">[SUCCESS] Fix script executed successfully for ${name}.</span>`
      );

      this._streamLines(lines);
    }
  }

  // ----------------------------------------------------------------------------
  // Animated typewriter line streamer
  // ----------------------------------------------------------------------------
  _streamLines(lines, onComplete) {
    let index = 0;
    const interval = setInterval(() => {
      if (index < lines.length) {
        this._printLine(lines[index]);
        index++;
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 45); // 45ms between lines for realistic fast CLI output
  }

  _printHelp() {
    const helpLines = [
      `<span class="term-cyan">=== CLUSTER CLI DIAGNOSTIC CONSOLE ===</span>`,
      `Available commands:`,
      `  <span class="term-yellow">app1 status</span> / <span class="term-yellow">app2 status</span>     Check real-time health and diagnostic logs`,
      `  <span class="term-yellow">app1 fix1 [args...]</span>            Execute Fix 1 script (Pod restart & cache flush)`,
      `  <span class="term-yellow">app1 fix2 [args...]</span>            Execute Fix 2 script (Revision rollback)`,
      `  <span class="term-yellow">app1 fix3 [args...]</span>            Execute Fix 3 script (HPA autoscale & queue drain)`,
      `  <span class="term-yellow">app1 fix4 [args...]</span>            Execute Fix 4 script (Threadpool hotfix patch)`,
      `  <span class="term-yellow">app1 -fix1</span> .. <span class="term-yellow">-fix4</span>          Simulate fix attempt with failure (with '-' sign)`,
      `  <span class="term-yellow">app1u</span> / <span class="term-yellow">app2u</span>                     Recover dashboard telemetry to Healthy (Operational)`,
      `  <span class="term-yellow">app1d</span> / <span class="term-yellow">app2d</span>                     Degrade dashboard telemetry to Warning (Degraded)`,
      `  <span class="term-yellow">app1k</span> / <span class="term-yellow">app2k</span>                     Degrade dashboard telemetry to Critical (Outage)`,
      `  <span class="term-yellow">clear</span>                              Clear terminal screen`,
      `  <span class="term-yellow">exit</span>                               Close console modal`,
      `Note: Dashboard states only change with app1u/app2u, app1d/app2d, app1k/app2k.`
    ];
    helpLines.forEach(l => this._printLine(l));
  }

  _printLine(html) {
    if (!this.output) return;
    const div = document.createElement("div");
    div.className = "term-line";
    div.innerHTML = html;
    this.output.appendChild(div);
    this.output.scrollTop = this.output.scrollHeight;
  }

  _escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
