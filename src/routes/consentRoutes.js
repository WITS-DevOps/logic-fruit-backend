import express from "express";
import { dynamoService } from "../services/dynamoService.js";

const router = express.Router();

const POLICY_VERSION = "v1-2026-10";
const VALID_STATUSES = new Set(["accept_all", "reject_all", "custom"]);

function normalizePreferences(prefs = {}) {
  return {
    necessary: true,
    analytics: Boolean(prefs.analytics),
    functional: Boolean(prefs.functional),
    marketing: Boolean(prefs.marketing),
  };
}

function getClientIp(req) {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp.trim().length > 0) return cfIp.trim();
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim().length > 0) return realIp.trim();
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "";
}

/**
 * @route   POST /api/consents
 * @desc    Record a visitor cookie / data-tracking consent choice
 * @body    { consentId, status, preferences { analytics, functional, marketing }, pageUrl, policyVersion }
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      consentId = "",
      status = "custom",
      preferences = {},
      pageUrl = "",
      referrer = "",
      policyVersion = POLICY_VERSION,
    } = req.body || {};

    const normalizedStatus = VALID_STATUSES.has(status) ? status : "custom";
    const normalizedPrefs = normalizePreferences(preferences);

    // Derive status from prefs when caller sends ambiguous status
    let finalStatus = normalizedStatus;
    if (normalizedStatus === "custom") {
      const allOn = normalizedPrefs.analytics && normalizedPrefs.functional && normalizedPrefs.marketing;
      const allOff = !normalizedPrefs.analytics && !normalizedPrefs.functional && !normalizedPrefs.marketing;
      if (allOn) finalStatus = "accept_all";
      else if (allOff) finalStatus = "reject_all";
    } else if (normalizedStatus === "accept_all") {
      normalizedPrefs.analytics = true;
      normalizedPrefs.functional = true;
      normalizedPrefs.marketing = true;
    } else if (normalizedStatus === "reject_all") {
      normalizedPrefs.analytics = false;
      normalizedPrefs.functional = false;
      normalizedPrefs.marketing = false;
    }

    const record = await dynamoService.create("consent", {
      consentId: String(consentId || ""),
      status: finalStatus,
      preferences: normalizedPrefs,
      pageUrl: String(pageUrl || "").slice(0, 2000),
      referrer: String(referrer || "").slice(0, 2000),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 1000),
      ip: String(getClientIp(req) || "").slice(0, 100),
      policyVersion: String(policyVersion || POLICY_VERSION).slice(0, 50),
    });

    res.status(201).json({
      success: true,
      message: "Consent recorded successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/consents/stats
 * @desc    Aggregated consent counts (for admin dashboards)
 */
router.get("/stats", async (req, res, next) => {
  try {
    const items = await dynamoService.getAll("consent", {});

    // Sort newest first
    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Deduplicate / group by IP to see unique users
    const ipMap = new Map();
    for (const item of items) {
      const key = item.ip || item.consentId || item.id;
      if (!ipMap.has(key)) {
        ipMap.set(key, item);
      }
    }
    const uniqueItems = Array.from(ipMap.values());

    const stats = {
      total: items.length,
      uniqueUsers: uniqueItems.length,
      accept_all: 0,
      reject_all: 0,
      custom: 0,
      analyticsOptIn: 0,
      analyticsRejected: 0,
      functionalOptIn: 0,
      marketingOptIn: 0,
      // Unique IP counts
      unique_accept_all: 0,
      unique_reject_all: 0,
      unique_custom: 0,
      unique_analyticsOptIn: 0,
      unique_analyticsRejected: 0,
    };

    for (const item of items) {
      if (stats[item.status] !== undefined) stats[item.status] += 1;
      else stats.custom += 1;
      if (item.preferences?.analytics) stats.analyticsOptIn += 1;
      else stats.analyticsRejected += 1;
      if (item.preferences?.functional) stats.functionalOptIn += 1;
      if (item.preferences?.marketing) stats.marketingOptIn += 1;
    }

    for (const item of uniqueItems) {
      if (stats[`unique_${item.status}`] !== undefined) stats[`unique_${item.status}`] += 1;
      else stats.unique_custom += 1;
      if (item.preferences?.analytics) stats.unique_analyticsOptIn += 1;
      else stats.unique_analyticsRejected += 1;
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/consents
 * @desc    List recorded consents (newest first, paginated)
 */
router.get("/", async (req, res, next) => {
  try {
    const { status, limit, page, unique } = req.query;
    let items = await dynamoService.getAll("consent", {});

    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (unique === "true" || unique === "1") {
      // Group by IP (merging duplicate visits from the same IP)
      const ipMap = new Map();
      for (const item of items) {
        const key = item.ip || item.consentId || item.id;
        if (!ipMap.has(key)) {
          ipMap.set(key, { ...item, totalEvents: 1, history: [item] });
        } else {
          const entry = ipMap.get(key);
          entry.totalEvents += 1;
          entry.history.push(item);
        }
      }
      items = Array.from(ipMap.values());
    }

    if (status && status !== "all") {
      items = items.filter((item) => item.status === status);
    }

    const totalCount = items.length;
    const limitNum = parseInt(limit, 10);
    const pageNum = parseInt(page, 10) || 1;
    if (limitNum > 0) {
      const startIndex = (pageNum - 1) * limitNum;
      items = items.slice(startIndex, startIndex + limitNum);
    }

    res.json({
      success: true,
      count: totalCount,
      page: limitNum > 0 ? pageNum : 1,
      limit: limitNum > 0 ? limitNum : totalCount,
      data: items,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/consents/:id
 * @desc    Erase a single consent record (GDPR right-to-erasure)
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dynamoService.delete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Consent record not found",
      });
    }

    res.json({
      success: true,
      message: "Consent record deleted successfully",
      data: { id },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
