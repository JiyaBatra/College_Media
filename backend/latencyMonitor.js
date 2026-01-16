/**
 * latencyMonitor.js
 * -----------------
 * Monitors API latency and raises alerts when latency degrades
 * beyond defined thresholds.
 *
 * Tech: Node.js + Express
 */

const express = require("express");
const os = require("os");

const app = express();
app.use(express.json());

/* -----------------------------
   CONFIGURATION
--------------------------------*/

const LATENCY_THRESHOLDS = {
  p95: 800, // ms
  p99: 1500 // ms
};

const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const METRICS_WINDOW_SIZE = 1000;

/* -----------------------------
   IN-MEMORY METRICS STORE
--------------------------------*/

let latencySamples = [];
let lastAlertTime = 0;

/* -----------------------------
   UTILITY FUNCTIONS
--------------------------------*/

function recordLatency(duration) {
  latencySamples.push(duration);

  if (latencySamples.length > METRICS_WINDOW_SIZE) {
    latencySamples.shift();
  }
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;

  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}

function shouldSendAlert() {
  const now = Date.now();
  return now - lastAlertTime > ALERT_COOLDOWN_MS;
}

/* -----------------------------
   ALERTING
--------------------------------*/

function sendAlert(type, value) {
  lastAlertTime = Date.now();

  console.error("🚨 ALERT TRIGGERED 🚨");
  console.error(`Type: ${type}`);
  console.error(`Latency Value: ${value} ms`);
  console.error(`Host: ${os.hostname()}`);
  console.error(`Time: ${new Date().toISOString()}`);
}

/* -----------------------------
   MIDDLEWARE
--------------------------------*/

function latencyMiddleware(req, res, next) {
  const startTime = process.hrtime.bigint();

  res.on("finish", () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6;

    recordLatency(durationMs);
  });

  next();
}

app.use(latencyMiddleware);

/* -----------------------------
   SAMPLE ROUTES
--------------------------------*/

app.get("/fast", (req, res) => {
  res.json({ message: "Fast response" });
});

app.get("/slow", async (req, res) => {
  await new Promise((r) => setTimeout(r, 1200));
  res.json({ message: "Slow response" });
});

/* -----------------------------
   METRICS EVALUATION
--------------------------------*/

function evaluateLatency() {
  const p95 = percentile(latencySamples, 95);
  const p99 = percentile(latencySamples, 99);

  console.log(
    `Latency Check → p95=${p95.toFixed(2)}ms | p99=${p99.toFixed(2)}ms`
  );

  if (p95 > LATENCY_THRESHOLDS.p95 && shouldSendAlert()) {
    sendAlert("P95 Latency Breach", p95);
  }

  if (p99 > LATENCY_THRESHOLDS.p99 && shouldSendAlert()) {
    sendAlert("P99 Latency Breach", p99);
  }
}

/* -----------------------------
   SCHEDULED CHECK
--------------------------------*/

setInterval(() => {
  if (latencySamples.length > 0) {
    evaluateLatency();
  }
}, 10000); // every 10 seconds

/* -----------------------------
   HEALTH ENDPOINT
--------------------------------*/

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    samplesCollected: latencySamples.length
  });
});

/* -----------------------------
   METRICS ENDPOINT
--------------------------------*/

app.get("/metrics", (req, res) => {
  res.json({
    p95: percentile(latencySamples, 95),
    p99: percentile(latencySamples, 99),
    totalSamples: latencySamples.length
  });
});

/* -----------------------------
   SERVER START
--------------------------------*/

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Latency Monitor running on port ${PORT}`);
});

/* -----------------------------
   END OF FILE
--------------------------------*/
