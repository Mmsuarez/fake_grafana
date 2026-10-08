// ==============================================================================
// APPLICATION AND MONITORING CONFIGURATION (GRAFANA / PROMETHEUS SIMULATOR)
// ==============================================================================
// You can easily modify application names, descriptions, and baseline data here!
// All properties are loaded dynamically by the dashboard.
// ==============================================================================

const APP_CONFIG = {
  // General Dashboard Settings
  dashboard: {
    title: "Production System Health / Core Workloads",
    cluster: "k8s-prod-us-east-01",
    environment: "PRODUCTION",
    refreshIntervalMs: 1500, // Telemetry scrape interval in milliseconds (1.5s)
    historyDataPoints: 22,   // Number of points displayed in time-series charts
  },

  // ----------------------------------------------------------------------------
  // APPLICATION 1 (Keyboard Shortcuts: 'app1d' = Warning, 'app1k' = Critical, 'app1u' = Restore)
  // ----------------------------------------------------------------------------
  app1: {
    id: "app1",
    name: "Ticketera DTID - Soporte",                                   // <-- CHANGE APP 1 NAME HERE
    shortCode: "TKT-DTID",                                       // Short acronym / tag
    description: "Support Transaction processing and gateway", // <-- APP 1 DESCRIPTION
    host: "srv-payments-node-01.prod.internal",                 // Simulated hostname
    ip: "10.240.12.44:8080",                                    // Simulated IP / Port
    version: "v2.14.3",
    color: "#5794f2",                                           // Primary Grafana Blue

    // Optimal baseline metrics for simulation
    baseline: {
      cpu: 24,         // CPU %
      memory: 42,      // RAM %
      latency: 45,     // Latency in ms
      rps: 420,        // Requests per second
      errorRate: 0.1,  // 5xx error rate %
      netIn: 34.5,     // Inbound traffic MB/s
      netOut: 82.1,    // Outbound traffic MB/s
      sloScore: 99.98  // SLO compliance %
    }
  },

  // ----------------------------------------------------------------------------
  // APPLICATION 2 (Keyboard Shortcuts: 'app2d' = Warning, 'app2k' = Critical, 'app2u' = Restore)
  // ----------------------------------------------------------------------------
  app2: {
    id: "app2",
    name: "Portal Fortigate40F - Auth & Customer",                             // <-- CHANGE APP 2 NAME HERE
    shortCode: "FG40F-PORTAL",                                   // Short acronym / tag
    description: "OAuth2 authentication, user sessions & web portal", // <-- APP 2 DESCRIPTION
    host: "srv-auth-portal-02.prod.internal",                   // Simulated hostname
    ip: "10.240.18.91:443",                                     // Simulated IP / Port
    version: "v3.0.1",
    color: "#b877d9",                                           // Primary Grafana Purple

    // Optimal baseline metrics for simulation
    baseline: {
      cpu: 18,         // CPU %
      memory: 38,      // RAM %
      latency: 32,     // Latency in ms
      rps: 680,        // Requests per second
      errorRate: 0.05, // 5xx error rate %
      netIn: 48.2,     // Inbound traffic MB/s
      netOut: 115.4,   // Outbound traffic MB/s
      sloScore: 99.99  // SLO compliance %
    }
  }
};
