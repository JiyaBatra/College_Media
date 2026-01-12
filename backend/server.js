/**
 * ================================
 *  College Media – Backend Server
 *  Memory-Safe | Production Ready
 * ================================
 */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const os = require("os");

/* ------------------
   🔧 INTERNAL IMPORTS
------------------ */
const { initDB } = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const resumeRoutes = require("./routes/resume");
const uploadRoutes = require("./routes/upload");
const { globalLimiter, authLimiter } = require("./middleware/rateLimiter");
const { slidingWindowLimiter } = require("./middleware/slidingWindowLimiter");

/* ------------------
   🌱 ENV SETUP
------------------ */
dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Disable unnecessary header
app.disable("x-powered-by");

/* ------------------
   🌍 CORS CONFIG
------------------ */
const corsOptions = {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "X-API-Version",
  ],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* ------------------
   📦 BODY PARSERS
------------------ */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/* ------------------
   🔁 API VERSIONING
------------------ */
app.use((req, res, next) => {
  req.apiVersion = req.headers["x-api-version"] || "v1";
  res.setHeader("X-API-Version", req.apiVersion);
  next();
});

/* ------------------
   ⏱️ REQUEST TIMEOUT
------------------ */
app.use((req, res, next) => {
  res.setTimeout(30 * 1000, () => {
    res.status(408).json({
      success: false,
      message: "Request timeout",
    });
  });
  next();
});

/* ------------------
   ⏱️ RATE LIMITING
------------------ */
app.use("/api", slidingWindowLimiter);
app.use("/api", globalLimiter);

/* ------------------
   📊 REQUEST LOGGING (LIGHT)
------------------ */
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(
        `⚠️ Slow Request: ${req.method} ${req.originalUrl} - ${duration}ms`
      );
    }
  });

  next();
});

/* ------------------
   📁 STATIC FILES
------------------ */
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "1h",
    etag: true,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=3600");
    },
  })
);

/* ------------------
   ❤️ HEALTH CHECK
------------------ */
app.get("/", (req, res) => {
  res.json({
    success: true,
    apiVersion: req.apiVersion,
    message: "College Media API is running!",
    uptime: process.uptime(),
    memory: {
      rss: process.memoryUsage().rss,
      heapUsed: process.memoryUsage().heapUsed,
    },
    cpu: os.loadavg(),
  });
});

/* ------------------
   🚀 START SERVER
------------------ */
let dbConnection = null;

const startServer = async () => {
  try {
    dbConnection = await initDB();
    console.log("✅ Database initialized");
  } catch (err) {
    console.error("❌ DB init failed:", err.message);
    dbConnection = null;
  }

  /* ------------------
     🔐 ROUTES
  ------------------ */
  app.use("/api/auth", authLimiter, require("./routes/auth"));
  app.use("/api/users", require("./routes/users"));
  app.use("/api/resume", resumeRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/messages", require("./routes/messages"));
  app.use("/api/account", require("./routes/account"));
  app.use("/api/notifications", require("./routes/notifications"));

  /* ------------------
     ❌ ERROR HANDLING
  ------------------ */
  app.use(notFound);
  app.use(errorHandler);

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

/* ------------------
   🧹 GRACEFUL SHUTDOWN
------------------ */
const shutdown = async (signal) => {
  console.log(`\n⚠️ ${signal} received. Starting cleanup...`);

  server.close(async () => {
    console.log("🛑 HTTP server closed");

    try {
      if (dbConnection?.mongoose) {
        await dbConnection.mongoose.connection.close(false);
        console.log("🧹 MongoDB connection closed");
      }
    } catch (err) {
      console.error("❌ Error closing DB:", err.message);
    }

    process.exit(0);
  });

  // Force exit if cleanup hangs
  setTimeout(() => {
    console.error("⏰ Force shutdown due to timeout");
    process.exit(1);
  }, 10 * 1000);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

/* ------------------
   🧨 PROCESS SAFETY
------------------ */
process.on("unhandledRejection", (reason) => {
  console.error("🔥 Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  process.exit(1);
});

/* ------------------
   🚦 SERVER TUNING
------------------ */
server.keepAliveTimeout = 60 * 1000;
server.headersTimeout = 65 * 1000;

/* ------------------
   ▶️ BOOTSTRAP
------------------ */
startServer();
