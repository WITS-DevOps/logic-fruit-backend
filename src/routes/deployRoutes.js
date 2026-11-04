import express from "express";
import { triggerDeployWebhook } from "../services/deployWebhookService.js";

const router = express.Router();

/**
 * @route   POST /api/deploy/trigger
 * @desc    Manually triggers background deployment via configured deploy hook
 */
router.post("/trigger", async (req, res) => {
  const webhookUrl = process.env.DEPLOY_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(400).json({
      success: false,
      message: "No DEPLOY_WEBHOOK_URL is configured for this environment.",
    });
  }

  const reason = req.body?.reason || "Manual CMS trigger";
  triggerDeployWebhook(reason);

  return res.json({
    success: true,
    message: "Background build deployment requested successfully.",
    environment: process.env.NODE_ENV || "development",
  });
});

/**
 * @route   GET /api/deploy/status
 * @desc    Checks whether deploy webhook is configured for this environment
 */
router.get("/status", (req, res) => {
  const webhookUrl = process.env.DEPLOY_WEBHOOK_URL;
  return res.json({
    success: true,
    isConfigured: Boolean(webhookUrl),
    preview: webhookUrl ? `${webhookUrl.slice(0, 32)}...` : null,
  });
});

export default router;
