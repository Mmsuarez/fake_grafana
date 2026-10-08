// ==============================================================================
// GLOBAL KEYBOARD SHORTCUT LISTENER (BUFFERED KEYSTROKE DETECTOR)
// ==============================================================================

class KeyboardListener {
  constructor(onCommandTriggered) {
    this.buffer = "";
    this.bufferTimeout = null;
    this.onCommandTriggered = onCommandTriggered;

    // Dictionary of recognized command sequences
    this.commands = {
      app1d: { appId: "app1", action: "WARNING", label: "App 1 -> Degraded (Warning / Amber Alert)" },
      app1k: { appId: "app1", action: "CRITICAL", label: "App 1 -> Critical Outage (Kill / Red Alert)" },
      app1u: { appId: "app1", action: "HEALTHY", label: "App 1 -> Restored to Normal (Up / Optimal)" },

      app2d: { appId: "app2", action: "WARNING", label: "App 2 -> Degraded (Warning / Amber Alert)" },
      app2k: { appId: "app2", action: "CRITICAL", label: "App 2 -> Critical Outage (Kill / Red Alert)" },
      app2u: { appId: "app2", action: "HEALTHY", label: "App 2 -> Restored to Normal (Up / Optimal)" }
    };

    this._init();
  }

  _init() {
    window.addEventListener("keydown", (e) => {
      // Ignore if focus is in an input or textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        return;
      }

      // Shortcut to open/close interactive terminal (`~` or backtick)
      if (e.key === "`" || e.key === "~") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-terminal"));
        return;
      }

      // Shortcut to open/close help cheat sheet ('?' or 'Escape')
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-cheat-modal"));
        return;
      }

      if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent("close-cheat-modal"));
        window.dispatchEvent(new CustomEvent("close-terminal"));
        return;
      }

      // Only accumulate alphanumeric keys
      if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        this.buffer += e.key.toLowerCase();

        // Check if user typed "term" or "cli" to open terminal
        if (this.buffer.endsWith("term") || this.buffer.endsWith("cli")) {
          this.buffer = "";
          window.dispatchEvent(new CustomEvent("toggle-terminal"));
          return;
        }

        // Keep rolling buffer within last 8 chars
        if (this.buffer.length > 8) {
          this.buffer = this.buffer.slice(-8);
        }

        // Reset buffer after 3.5s of inactivity
        clearTimeout(this.bufferTimeout);
        this.bufferTimeout = setTimeout(() => {
          this.buffer = "";
        }, 3500);

        this._checkBuffer();
      }
    });
  }

  _checkBuffer() {
    for (const [cmd, details] of Object.entries(this.commands)) {
      if (this.buffer.endsWith(cmd)) {
        this.buffer = ""; // Clear buffer once triggered
        this.showFeedbackToast(cmd, details.label);
        if (this.onCommandTriggered) {
          this.onCommandTriggered(details.appId, details.action);
        }
        break;
      }
    }
  }

  showFeedbackToast(cmd, description) {
    const toast = document.getElementById("command-toast");
    if (!toast) return;

    toast.innerHTML = `<span class="cmd-pill">${cmd}</span> <span class="cmd-desc">${description}</span>`;
    toast.classList.remove("hidden");
    toast.classList.add("visible");

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.classList.add("hidden"), 300);
    }, 2800);
  }
}
