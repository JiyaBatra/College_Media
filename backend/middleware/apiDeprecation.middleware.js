/**
 * ============================================================
 * API Deprecation Middleware
 * ============================================================
 * Purpose:
 * - Handle API version deprecation in a centralized way
 * - Notify clients via headers
 * - Support sunset enforcement
 * - Enable logging & observability
 * - Prevent breaking changes
 *
 * Author: Ayaan Shaikh
 * Issue: API Version Deprecation Strategy Missing (#587)
 * ============================================================
 */

const fs = require("fs");
const path = require("path");

/**
 * ============================================================
 * Configuration Section
 * ============================================================
 */

/**
 * Deprecation policy config
 * You can move this to DB / Redis / Config Service later
 */
const API_VERSION_CONFIG = {
  v1: {
    deprecated: true,
    sunsetDate: "2026-06-30",
    successor: "v2",
    message:
      "API v1 is deprecated and will be removed in the future. Please migrate to v2.",
    documentationUrl:
      "https://github.com/abhishekkumar177/College_Media/blob/main/README.md",
    allowRequestsUntilSunset: true,
    blockAfterSunset: true
  },

  v2: {
    deprecated: false
  }
};

/**
 * Environment-based flags
 */
const ENVIRONMENT = process.env.NODE_ENV || "development";
const ENABLE_DEPRECATION_LOGS =
  process.env.API_DEPRECATION_LOGS !== "false";

/**
 * Log file path (local fallback)
 */
const LOG_FILE_PATH = path.join(
  __dirname,
  "../../logs/api-deprecation.log"
);

/**
 * ============================================================
 * Utility Functions
 * ============================================================
 */

/**
 * Parse API version from request
 * Example:
 *   /api/v1/users -> v1
 */
function extractApiVersion(req) {
  if (!req.baseUrl) return null;
  const parts = req.baseUrl.split("/");
  return parts.length >= 3 ? parts[2] : null;
}

/**
 * Check if sunset date is passed
 */
function isSunsetPassed(sunsetDate) {
  if (!sunsetDate) return false;
  return new Date() > new Date(sunsetDate);
}

/**
 * Safe log writer
 */
function writeLog(entry) {
  if (!ENABLE_DEPRECATION_LOGS) return;

  const logLine = `[${new Date().toISOString()}] ${JSON.stringify(
    entry
  )}\n`;

  try {
    fs.appendFileSync(LOG_FILE_PATH, logLine, { encoding: "utf8" });
  } catch (err) {
    // Fail silently to avoid crashing the app
    console.error("Deprecation log write failed:", err.message);
  }
}

/**
 * ============================================================
 * Response Header Helpers
 * ============================================================
 */

function setStandardDeprecationHeaders(res, config) {
  res.setHeader("X-API-Deprecated", "true");
  res.setHeader("X-API-Sunset", config.sunsetDate);
  res.setHeader("X-API-Successor", config.successor || "");
  res.setHeader("X-API-Docs", config.documentationUrl || "");

  /**
   * RFC 7234 Warning Header
   * 299 = Miscellaneous Persistent Warning
   */
  res.setHeader(
    "Warning",
    `299 - "${config.message}"`
  );
}

/**
 * ============================================================
 * Audit & Telemetry
 * ============================================================
 */

function buildAuditPayload(req, version, config) {
  return {
    apiVersion: version,
    deprecated: config.deprecated,
    sunsetDate: config.sunsetDate,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers["user-agent"] || "unknown",
    timestamp: new Date().toISOString()
  };
}

/**
 * ============================================================
 * Main Middleware
 * ============================================================
 */

function apiDeprecationMiddleware(req, res, next) {
  const apiVersion = extractApiVersion(req);

  // If version not found, skip
  if (!apiVersion) {
    return next();
  }

  const versionConfig = API_VERSION_CONFIG[apiVersion];

  // If version not registered, allow request
  if (!versionConfig) {
    return next();
  }

  /**
   * ============================================================
   * Case 1: Deprecated API Version
   * ============================================================
   */
  if (versionConfig.deprecated) {
    // Attach headers
    setStandardDeprecationHeaders(res, versionConfig);

    // Audit log
    writeLog(
      buildAuditPayload(req, apiVersion, versionConfig)
    );

    /**
     * ============================================================
     * Sunset Enforcement
     * ============================================================
     */
    if (
      versionConfig.blockAfterSunset &&
      isSunsetPassed(versionConfig.sunsetDate)
    ) {
      return res.status(410).json({
        success: false,
        error: "API version has been sunset and is no longer available",
        meta: {
          deprecatedVersion: apiVersion,
          successorVersion: versionConfig.successor,
          documentation: versionConfig.documentationUrl
        }
      });
    }

    /**
     * Allow request (soft deprecation)
     */
    return next();
  }

  /**
   * ============================================================
   * Case 2: Active API Version
   * ============================================================
   */
  return next();
}

/**
 * ============================================================
 * Health & Debug Helpers (Optional)
 * ============================================================
 */

/**
 * Returns all deprecation configs
 * Useful for admin/debug endpoints
 */
apiDeprecationMiddleware.getDeprecationConfig = function () {
  return API_VERSION_CONFIG;
};

/**
 * Dynamically update deprecation policy
 * (future-proofing)
 */
apiDeprecationMiddleware.updateVersionPolicy = function (
  version,
  policy
) {
  API_VERSION_CONFIG[version] = {
    ...API_VERSION_CONFIG[version],
    ...policy
  };
};

/**
 * ============================================================
 * Module Export
 * ============================================================
 */
module.exports = apiDeprecationMiddleware;
