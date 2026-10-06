import express from "express";
import {
  verifyEmailConnection,
  sendEmail,
  sendInquiryAlertToAdmin,
} from "../services/emailService.js";
import { emailTemplateService } from "../services/emailTemplateService.js";

const router = express.Router();

/**
 * @route   GET /api/email/status
 * @desc    Check if email SMTP configuration is valid and connected
 */
router.get("/status", async (req, res) => {
  const result = await verifyEmailConnection();
  const routing = await emailTemplateService.getGlobalRoutingSettings().catch(() => ({}));
  res.json({
    configured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
    sender: process.env.SMTP_USER || "Not configured",
    smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
    smtpPort: process.env.SMTP_PORT || "465",
    enableEmails: process.env.ENABLE_EMAILS === "true",
    enableVisitorEmails:
      typeof routing?.enableVisitorEmails === "boolean"
        ? routing.enableVisitorEmails
        : (process.env.ENABLE_VISITOR_EMAILS === "true"),
    ...result,
  });
});

/**
 * @route   POST /api/email/test
 * @desc    Send a test email to verify credentials and delivery
 */
router.post("/test", async (req, res, next) => {
  try {
    const targetEmail = req.body.to || process.env.ADMIN_NOTIFICATION_EMAIL || "info@logic-fruit.com";

    const testInquiry = {
      name: "Logic Fruit Test Submitter",
      email: targetEmail,
      phone: "+91 124 4567890",
      company: "Logic Fruit Technologies Test",
      industry: "Embedded Systems",
      type: "contact",
      resourceTitle: "SMTP Email Setup Test",
      message: "This is a test notification confirming that the backend email sending setup is fully functional.",
    };

    const info = await sendInquiryAlertToAdmin(testInquiry);

    res.json({
      success: true,
      message: `Test email successfully sent to ${targetEmail}`,
      messageId: info.messageId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/email/send
 * @desc    Send a custom email directly
 */
router.post("/send", async (req, res, next) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: to, subject, and body (html or text).",
      });
    }

    const info = await sendEmail({ to, subject, html, text });

    res.json({
      success: true,
      message: `Email sent to ${to}`,
      messageId: info.messageId,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
