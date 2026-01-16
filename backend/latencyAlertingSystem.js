/**
 * latencyAlertingSystem.js
 * -----------------------
 * Implements latency monitoring and alerting to detect
 * API performance degradation before users are impacted.
 *
 * Tech Stack: Node.js + Express
 */

const express = require("express");
const os = require("os");

const app = express();
app.use(express.json());

/* --------------------------------------------------
   CONFIGURATION
---------------------------------------------------*/

const METRIC_WINDOW_SIZE = 1000;
const EVALUATION_INTERVAL_MS = 10000;
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

const LATENCY_THRESHOLDS = {
  p95: 800,  // ms
  p99: 1500 // ms
};

/* --------------------------------------------------
   METRIC STORAGE
---------------------------------------------------*/

let latencySamples = [];
let lastAlertTimestamp = 0;

/* --------------------------------------------------
   UTILITY FUNCTIONS
---------------------------------------------------*/

function recordLatency(value) {
  latencySamples.push(value);

  if (latencySamples.length > METRIC_WINDOW_SIZE) {
    latencySamples.shift();
  }
}

function calculatePercentile(data, percentile) {
  if (data.length === 0) return 0;

  const sorted = [...data].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

function isCooldownOver() {
  return Date.now() - lastAlertTimestamp > ALERT_COOLDOWN_MS;
}

/* --------------------------------------------------
   ALERTING
---------------------------------------------------*/

function sendAlert(type, value) {
  lastAlertTimestamp = Date.now();

  console.error("🚨 LATENCY ALERT 🚨");
  console.error(`Type: ${type}`);
  console.error(`Value: ${value} ms`);
  console.error(`Host: ${os.hostname()}`);
  console.error(`Time: ${new Date().toISOString()}`);
}

/* --------------------------------------------------
   LATENCY MIDDLEWARE
---------------------------------------------------*/

function latencyTracker(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    recordLatency(durationMs);
  });

  next();
}

app.use(latencyTracker);

/* --------------------------------------------------
   SAMPLE ROUTES
---------------------------------------------------*/

app.get("/fast", (req, res) => {
  res.json({ message: "Fast response" });
});

app.get("/medium", async (req, res) => {
  await new Promise(r => setTimeout(r, 600));
  res.json({ message: "Medium response" });
});

app.get("/slow", async (req, res) => {
  await new Promise(r => setTimeout(r, 1400));
  res.json({ message: "Slow response" });
});

/* --------------------------------------------------
   LATENCY EVALUATION
---------------------------------------------------*/

function evaluateLatency() {
  if (latencySamples.length < 20) return;

  const p50 = calculatePercentile(latencySamples, 50);
  const p95 = calculatePercentile(latencySamples, 95);
  const p99 = calculatePercentile(latencySamples, 99);

  console.log(
    `📊 Latency Check | p50=${p50.toFixed(2)}ms | p95=${p95.toFixed(
      2
    )}ms | p99=${p99.toFixed(2)}ms`
  );

  if (p95 > LATENCY_THRESHOLDS.p95 && isCooldownOver()) {
    sendAlert("P95 Latency Breach", p95);
  }

  if (p99 > LATENCY_THRESHOLDS.p99 && isCooldownOver()) {
    sendAlert("P99 Latency Breach", p99);
  }
}

/* --------------------------------------------------
   SCHEDULER
---------------------------------------------------*/

setInterval(() => {
  evaluateLatency();
}, EVALUATION_INTERVAL_MS);

/* --------------------------------------------------
   METRICS ENDPOINTS
---------------------------------------------------*/

app.get("/metrics", (req, res) => {
  res.json({
    p50: calculatePercentile(latencySamples, 50),
    p95: calculatePercentile(latencySamples, 95),
    p99: calculatePercentile(latencySamples, 99),
    totalSamples: latencySamples.length
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    samplesCollected: latencySamples.length
  });
});

/* --------------------------------------------------
   SERVER START
---------------------------------------------------*/

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Latency Alerting System running on port ${PORT}`);
});

/* --------------------------------------------------
   END OF FILE
---------------------------------------------------*/
