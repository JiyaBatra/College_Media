/**
 * advancedLatencyAlerting.js
 * ---------------------------------------------------
 * Comprehensive Latency Monitoring & Alerting System
 *
 * Detects API latency degradation using percentiles
 * and triggers alerts before users are impacted.
 *
 * Tech Stack: Node.js + Express
 */

const express = require("express");
const os = require("os");
const app = express();

app.use(express.json());

/* ===================================================
   CONFIGURATION
=================================================== */

const SERVER_PORT = process.env.PORT || 3000;

const METRIC_WINDOW_SIZE = 2000;
const EVALUATION_INTERVAL_MS = 10000;
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;
const SUSTAINED_BREACH_COUNT = 3;

const LATENCY_THRESHOLDS = {
  p50: 300,
  p90: 600,
  p95: 900,
  p99: 1500
};

/* ===================================================
   DATA STORES
=================================================== */

let latencySamples = [];
let alertHistory = [];
let lastAlertTimestamp = 0;

let breachCounter = {
  p90: 0,
  p95: 0,
  p99: 0
};

/* ===================================================
   UTILITY FUNCTIONS
=================================================== */

function now() {
  return new Date().toISOString();
}

function recordLatency(value) {
  latencySamples.push(value);
  if (latencySamples.length > METRIC_WINDOW_SIZE) {
    latencySamples.shift();
  }
}

function percentile(data, p) {
  if (!data.length) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}

function cooldownOver() {
  return Date.now() - lastAlertTimestamp > ALERT_COOLDOWN_MS;
}

/* ===================================================
   ALERT SYSTEM
=================================================== */

function createAlert(level, metric, value) {
  const alert = {
    level,
    metric,
    value,
    host: os.hostname(),
    time: now()
  };

  alertHistory.push(alert);
  lastAlertTimestamp = Date.now();

  console.error("🚨 ALERT 🚨", alert);
}

function evaluateBreach(metric, value, threshold) {
  if (value > threshold) {
    breachCounter[metric]++;
  } else {
    breachCounter[metric] = 0;
  }

  if (
    breachCounter[metric] >= SUSTAINED_BREACH_COUNT &&
    cooldownOver()
  ) {
    createAlert("HIGH", metric, value);
    breachCounter[metric] = 0;
  }
}

/* ===================================================
   LATENCY TRACKING MIDDLEWARE
=================================================== */

function latencyMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    recordLatency(durationMs);
  });

  next();
}

app.use(latencyMiddleware);

/* ===================================================
   DEMO ROUTES
=================================================== */

app.get("/fast", (req, res) => {
  res.json({ status: "fast" });
});

app.get("/medium", async (req, res) => {
  await new Promise(r => setTimeout(r, 500));
  res.json({ status: "medium" });
});

app.get("/slow", async (req, res) => {
  await new Promise(r => setTimeout(r, 1400));
  res.json({ status: "slow" });
});

app.get("/very-slow", async (req, res) => {
  await new Promise(r => setTimeout(r, 2000));
  res.json({ status: "very slow" });
});

/* ===================================================
   LATENCY EVALUATION ENGINE
=================================================== */

function evaluateLatency() {
  if (latencySamples.length < 50) return;

  const p50 = percentile(latencySamples, 50);
  const p90 = percentile(latencySamples, 90);
  const p95 = percentile(latencySamples, 95);
  const p99 = percentile(latencySamples, 99);

  console.log(
    `📊 Latency Metrics | p50=${p50.toFixed(
      2
    )} | p90=${p90.toFixed(2)} | p95=${p95.toFixed(
      2
    )} | p99=${p99.toFixed(2)}`
  );

  evaluateBreach("p90", p90, LATENCY_THRESHOLDS.p90);
  evaluateBreach("p95", p95, LATENCY_THRESHOLDS.p95);
  evaluateBreach("p99", p99, LATENCY_THRESHOLDS.p99);
}

/* ===================================================
   SCHEDULER
=================================================== */

setInterval(() => {
  try {
    evaluateLatency();
  } catch (err) {
    console.error("Latency evaluation error:", err);
  }
}, EVALUATION_INTERVAL_MS);

/* ===================================================
   METRICS APIs
=================================================== */

app.get("/metrics", (req, res) => {
  res.json({
    samples: latencySamples.length,
    p50: percentile(latencySamples, 50),
    p90: percentile(latencySamples, 90),
    p95: percentile(latencySamples, 95),
    p99: percentile(latencySamples, 99)
  });
});

app.get("/alerts", (req, res) => {
  res.json({
    totalAlerts: alertHistory.length,
    alerts: alertHistory
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    hostname: os.hostname()
  });
});

/* ===================================================
   LOAD SIMULATION (OPTIONAL)
=================================================== */

function simulateTraffic() {
  const routes = ["/fast", "/medium", "/slow", "/very-slow"];
  const route = routes[Math.floor(Math.random() * routes.length)];

  require("http").get(
    `http://localhost:${SERVER_PORT}${route}`,
    () => {}
  );
}

// Uncomment to auto-generate load
// setInterval(simulateTraffic, 300);

/* ===================================================
   SERVER START
=================================================== */

app.listen(SERVER_PORT, () => {
  console.log(
    `🚀 Advanced Latency Alerting running on port ${SERVER_PORT}`
  );
});

/* ===================================================
   END OF FILE
=================================================== */
