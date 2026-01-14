"use strict";

/**
 * ============================================================
 * API Version & Deprecation Middleware
 * ============================================================
 */

const DEPRECATED_VERSIONS = {
  v1: {
    deprecated: true,
    sunsetDate: "2025-12-31",
    message: "API v1 is deprecated. Please migrate to v2.",
  },
};

module.exports = function apiVersionMiddleware(req, res, next) {
  const versionMatch = req.originalUrl.match(/^\/api\/(v\d+)/);
  const version = versionMatch ? versionMatch[1] : null;

  if (!version) {
    return res.status(400).json({
      success: false,
      message: "API version missing. Use /api/v1 or /api/v2",
    });
  }

  req.apiVersion = version;

  const deprecationInfo = DEPRECATED_VERSIONS[version];

  if (deprecationInfo?.deprecated) {
    res.setHeader("Deprecation", "true");
    res.setHeader("Sunset", deprecationInfo.sunsetDate);
    res.setHeader("Warning", `299 - "${deprecationInfo.message}"`);
  }

  next();
};
