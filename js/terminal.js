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
  // FIX COMMAND ROUTER (4 UNIQUE THEMATIC FIXES)
  // ----------------------------------------------------------------------------
  _runFixCommand(appId, fixNum, willFail, rawCmd) {
    const app = this.metricsEngine.apps[appId];
    if (!app) return;

    let lines = [];
    if (fixNum === "1") {
      lines = this._getFix1Docker(app, willFail, rawCmd);
    } else if (fixNum === "2") {
      lines = this._getFix2Compile(app, willFail, rawCmd);
    } else if (fixNum === "3") {
      lines = this._getFix3Database(app, willFail, rawCmd);
    } else if (fixNum === "4") {
      lines = this._getFix4K8s(app, willFail, rawCmd);
    }

    this._streamLines(lines);
  }

  // ----------------------------------------------------------------------------
  // FIX 1: Docker Container Rebuild & Layer Spin-up
  // ----------------------------------------------------------------------------
  _getFix1Docker(app, willFail, rawCmd) {
    const name = app.config.name;
    const shortCode = app.config.shortCode.toLowerCase();
    const port = app.config.ip.split(":")[1] || "8080";

    const lines = [
      `<span class="term-cyan">[DOCKER] Target Service: ${name}</span>`,
      `<span class="term-gray">[DEBUG] Command: "${this._escapeHtml(rawCmd)}"</span>`,
      `<span class="term-cyan">[DOCKER] Pulling image: registry.internal/workloads/${shortCode}:v2.14.3-hotfix</span>`,
      `<span class="term-gray">72a6902112ac: Pull complete [14.2 MB / 14.2 MB]</span>`,
      `<span class="term-gray">bd64903a11d2: Pull complete [8.1 MB / 8.1 MB]</span>`,
      `<span class="term-gray">9f120aa841c0: Extracting [========================&gt;] 100%</span>`,
      `<span class="term-gray">[1/6] Creating isolated bridge network veth-prod-${shortCode}... [DONE]</span>`,
      `<span class="term-gray">[2/6] Attaching volume mounts (/var/log, /etc/ssl/certs)... [DONE]</span>`,
      `<span class="term-gray">[3/6] Starting container daemon (PID 18420)... [DONE]</span>`
    ];

    if (willFail) {
      lines.push(
        `<span class="term-gray">[4/6] Executing entrypoint probe /healthcheck.sh...</span>`,
        `<span class="term-red">[ERROR] Container crashed: Exit code 137 (OOMKilled).</span>`,
        `<span class="term-red">[FAIL] Healthcheck probe failed: Connection refused 127.0.0.1:${port}</span>`,
        `<span class="term-red">[FAIL] Docker container entered CrashLoopBackOff. Remediation failed!</span>`
      );
    } else {
      lines.push(
        `<span class="term-gray">[4/6] Executing entrypoint probe /healthcheck.sh... [OK]</span>`,
        `<span class="term-gray">[5/6] Registering dynamic IP with ingress reverse-proxy... [DONE]</span>`,
        `<span class="term-gray">[6/6] Traffic route activated. Container status: Up 3 seconds (healthy).</span>`,
        `<span class="term-green">[SUCCESS] Docker container rebuild complete. Service listening on port ${port}.</span>`
      );
    }
    return lines;
  }

  // ----------------------------------------------------------------------------
  // FIX 2: Code Hotfix Patch & Compiler with Micropause
  // ----------------------------------------------------------------------------
  _getFix2Compile(app, willFail, rawCmd) {
    const name = app.config.name;
    const shortCode = app.config.shortCode.toLowerCase();

    const lines = [
      `<span class="term-cyan">[HOTFIX] Applying live source patch to: ${name}</span>`,
      `<span class="term-gray">[DEBUG] Command: "${this._escapeHtml(rawCmd)}"</span>`,
      `<span class="term-gray">[GIT] Applying git diff hotfix/mem-leak-4a8f90b (3 files changed, 48 insertions(+), 12 deletions(-))</span>`,
      `<span class="term-cyan">[COMPILER] Invoking build toolchain: go build -tags=production -v ./cmd/...</span>`,
      `<span class="term-gray">[COMPILER] Compiling package: internal/worker/threadpool.go...</span>`,
      `<span class="term-gray">[COMPILER] Compiling package: internal/net/circuit_breaker.go...</span>`,
      {
        html: `<span class="term-yellow">[COMPILING] Building runtime dependencies & optimizing byte-code [84/104 modules]...</span>`,
        delay: 1700 // Realistic 1.7 second compilation micropause!
      }
    ];

    if (willFail) {
      lines.push(
        `<span class="term-red">[ERROR] fatal: cyclic dependency detected in internal/worker/threadpool.go:142</span>`,
        `<span class="term-red">[FAIL] Build terminated with exit code 2. Binary not generated.</span>`,
        `<span class="term-red">[FAIL] Hotfix patch compilation failed! Existing binary left untouched.</span>`
      );
    } else {
      lines.push(
        `<span class="term-gray">[COMPILER] Linking shared binary: /opt/bin/${shortCode}-server [OK - 34.2 MB]</span>`,
        `<span class="term-gray">[HOTSWAP] Sending SIGHUP signal to master process PID 4821...</span>`,
        `<span class="term-green">[OK] Zero-downtime socket migration completed without dropped packets.</span>`,
        `<span class="term-green">[SUCCESS] Hotfix binary compiled and swapped into active worker process.</span>`
      );
    }
    return lines;
  }

  // ----------------------------------------------------------------------------
  // FIX 3: Database Connection Pool Purge & Cache Synchronization
  // ----------------------------------------------------------------------------
  _getFix3Database(app, willFail, rawCmd) {
    const name = app.config.name;

    const lines = [
      `<span class="term-cyan">[DB-MAINT] Database pool & cache remediation routine for: ${name}</span>`,
      `<span class="term-gray">[DEBUG] Command: "${this._escapeHtml(rawCmd)}"</span>`,
      `<span class="term-gray">[DB] Connecting to PgBouncer pool: psql://pg-cluster.prod.internal:6432/main</span>`,
      `<span class="term-yellow">[DB] Pool inspection: 254/256 connections active (99.2% saturation).</span>`,
      `<span class="term-gray">[PURGE] Terminating 184 idle-in-transaction zombie worker backends...</span>`,
      `<span class="term-gray">[REDIS] Evicting stale session keys from cache cluster (14,290 keys purged)...</span>`,
      {
        html: `<span class="term-yellow">[INDEX] Executing REINDEX TABLE CONCURRENTLY transactions_audit...</span>`,
        delay: 1300 // Database maintenance micropause!
      }
    ];

    if (willFail) {
      lines.push(
        `<span class="term-red">[ERROR] deadlock detected while attempting to acquire ExclusiveLock on table 'transactions_audit'</span>`,
        `<span class="term-red">[FAIL] Statement timeout: Query canceled after 5000ms.</span>`,
        `<span class="term-red">[FAIL] Database cleanup failed! Pool connections remained locked.</span>`
      );
    } else {
      lines.push(
        `<span class="term-gray">[DB] Buffer cache hit ratio restored to 99.4%.</span>`,
        `<span class="term-green">[OK] Active connection pool normalized: 18/256 slots in use.</span>`,
        `<span class="term-green">[OK] Replication lag across read-replicas: 0.02ms (nominal).</span>`,
        `<span class="term-green">[SUCCESS] Database pool drained, deadlocks cleared, and cache synchronized.</span>`
      );
    }
    return lines;
  }

  // ----------------------------------------------------------------------------
  // FIX 4: Kubernetes Rolling Restart & Pod Eviction
  // ----------------------------------------------------------------------------
  _getFix4K8s(app, willFail, rawCmd) {
    const name = app.config.name;
    const shortCode = app.config.shortCode.toLowerCase();
    const k8sDeployment = `${shortCode}-deployment`;

    const lines = [
      `<span class="term-cyan">[K8S] Initiating Kubernetes rolling restart for: ${name}</span>`,
      `<span class="term-gray">[DEBUG] Command: "${this._escapeHtml(rawCmd)}"</span>`,
      `<span class="term-gray">[K8S] kubectl rollout restart deployment/${k8sDeployment} -n production</span>`,
      `<span class="term-gray">[K8S] deployment.apps/${k8sDeployment} restarted</span>`,
      `<span class="term-gray">[K8S] Cordoning tainted worker node ip-10-240-12-44.internal... [OK]</span>`,
      `<span class="term-gray">[K8S] Evicting terminating pod ${k8sDeployment}-7b89d4-xk9z...</span>`
    ];

    if (willFail) {
      lines.push(
        `<span class="term-red">[ERROR] Error from server (Forbidden): PodDisruptionBudget '${shortCode}-pdb' is violated.</span>`,
        `<span class="term-red">[FAIL] Cannot evict pod: minimum available replicas threshold breached.</span>`,
        `<span class="term-red">[FAIL] Rollout stuck at 1/4 replicas. Manual cluster intervention required.</span>`
      );
    } else {
      lines.push(
        `<span class="term-gray">[K8S] Waiting for deployment rollout: 0 of 4 updated replicas are available...</span>`,
        `<span class="term-gray">[K8S] pod/${k8sDeployment}-8c11e2-mm4q: ContainerCreating -&gt; Running [OK]</span>`,
        `<span class="term-gray">[K8S] Waiting for deployment rollout: 1 of 4 updated replicas are available...</span>`,
        `<span class="term-gray">[K8S] pod/${k8sDeployment}-8c11e2-k9lp: ContainerCreating -&gt; Running [OK]</span>`,
        `<span class="term-gray">[K8S] Waiting for deployment rollout: 3 of 4 updated replicas are available...</span>`,
        `<span class="term-gray">[K8S] pod/${k8sDeployment}-8c11e2-z7tw: ContainerCreating -&gt; Running [OK]</span>`,
        `<span class="term-green">[OK] deployment "${k8sDeployment}" successfully rolled out (4/4 replicas ready).</span>`,
        `<span class="term-green">[SUCCESS] Kubernetes pod eviction & rolling replacement completed successfully.</span>`
      );
    }
    return lines;
  }

  // ----------------------------------------------------------------------------
  // Asynchronous Streamer with Delay/Micropause Support
  // ----------------------------------------------------------------------------
  async _streamLines(lines, onComplete) {
    this.isBusy = true;
    for (const item of lines) {
      if (typeof item === "string") {
        this._printLine(item);
        await new Promise(r => setTimeout(r, 42));
      } else if (item && typeof item === "object") {
        if (item.html) {
          this._printLine(item.html);
        }
        const delay = item.delay !== undefined ? item.delay : 42;
        await new Promise(r => setTimeout(r, delay));
      }
    }
    this.isBusy = false;
    if (onComplete) onComplete();
  }

  _printHelp() {
    const helpLines = [
      `<span class="term-cyan">=== CLUSTER CLI DIAGNOSTIC CONSOLE ===</span>`,
      `Available commands:`,
      `  <span class="term-yellow">app1 status</span> / <span class="term-yellow">app2 status</span>     Check real-time health and diagnostic logs`,
      `  <span class="term-yellow">app1 fix1 [args...]</span>            🐳 Fix 1: Docker rebuild, layer pull & step counter`,
      `  <span class="term-yellow">app1 fix2 [args...]</span>            ⚙️ Fix 2: Code hotfix patch & compilation with micropause`,
      `  <span class="term-yellow">app1 fix3 [args...]</span>            🗄️ Fix 3: Database pool purge & Redis cache sync`,
      `  <span class="term-yellow">app1 fix4 [args...]</span>            ☸️ Fix 4: Kubernetes rolling restart & pod eviction`,
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
