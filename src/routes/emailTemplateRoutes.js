import express from "express";
import {
  emailTemplateService,
  DEFAULT_EMAIL_TEMPLATES,
} from "../services/emailTemplateService.js";

const router = express.Router();

/**
 * @route   GET /api/email-templates/settings/config
 * @desc    Get current global routing settings from Database (with env fallback)
 */
router.get("/settings/config", async (req, res, next) => {
  try {
    const dbSettings = await emailTemplateService.getGlobalRoutingSettings();
    res.json({
      success: true,
      data: {
        ...dbSettings,
        enableEmails: process.env.ENABLE_EMAILS === "true",
        enableVisitorEmails:
          typeof dbSettings?.enableVisitorEmails === "boolean"
            ? dbSettings.enableVisitorEmails
            : (process.env.ENABLE_VISITOR_EMAILS === "true"),
        smtpUser: process.env.SMTP_USER || "info@logic-fruit.com",
        s3Bucket: process.env.AWS_S3_BUCKET_NAME || "logicfruit-cms-assets-833823555826",
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/email-templates/settings/config
 * @desc    Save global routing settings to Database
 */
router.put("/settings/config", async (req, res, next) => {
  try {
    const updates = req.body;
    delete updates.entityType;
    const updated = await emailTemplateService.updateGlobalRoutingSettings(updates);
    res.json({
      success: true,
      message: "Global routing configuration saved to database successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});


/**
 * @route   GET /api/email-templates
 * @desc    Get all email templates (auto-seeds defaults from WordPress if DB is empty)
 */
router.get("/", async (req, res, next) => {
  try {
    const templates = await emailTemplateService.getAllTemplates();
    res.json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/email-templates/:id
 * @desc    Get a single email template by id or templateKey
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await emailTemplateService.getTemplateByKey(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Email template not found",
      });
    }
    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/email-templates/:id
 * @desc    Update an email template
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Handle global routing settings updates via /:id
    if (id === "global_routing_settings" || id === "config" || id === "settings") {
      delete updates.entityType;
      const updated = await emailTemplateService.updateGlobalRoutingSettings(updates);
      return res.json({
        success: true,
        message: "Global routing configuration saved to database successfully",
        data: updated,
      });
    }

    // Do not allow overwriting templateKey or entityType
    delete updates.entityType;

    const updated = await emailTemplateService.updateTemplate(id, updates);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Could not find template to update",
      });
    }

    res.json({
      success: true,
      message: "Email template updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/email-templates/reset/:templateKey
 * @desc    Reset a template back to original WordPress default
 */
router.post("/reset/:templateKey", async (req, res, next) => {
  try {
    const { templateKey } = req.params;
    const resetItem = await emailTemplateService.resetTemplate(templateKey);
    res.json({
      success: true,
      message: `Template '${templateKey}' successfully reset to default WordPress settings.`,
      data: resetItem,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/email-templates/preview
 * @desc    Render a template with sample dummy data for live previewing
 */
router.post("/preview", (req, res) => {
  const { template, sampleInquiry } = req.body;
  if (!template) {
    return res.status(400).json({ success: false, message: "Template is required for preview" });
  }

  const dummy = sampleInquiry || {
    name: "Alex Vance",
    email: "alex.vance@example.com",
    phone: "+1 (555) 234-5678",
    company: "Acme Aerospace Solutions",
    industry: "Defense & Avionics",
    resourceTitle: "PCIe Gen 6 Equalization Unraveled",
    type: template.target === "internal" ? "whitepaper" : "whitepaper",
    pageUrl: "https://www.logic-fruit.com/resources/whitepapers/pcie-gen-6",
    message: "Interested in evaluating your PCIe Gen 6 IP core for our next-generation avionics flight computer.",
  };

  const dummyDownloadUrl =
    "https://api.logic-fruit.com/api/upload/media/legacy-wp/PCIe-Gen-6-Equalization-Unraveled.pdf";

  let rendered;
  if (template.target === "internal") {
    rendered = emailTemplateService.renderInternalAlert(template, dummy);
  } else {
    rendered = emailTemplateService.renderVisitorEmail(template, dummy, dummyDownloadUrl);
  }

  res.json({
    success: true,
    data: rendered,
  });
});

export default router;
