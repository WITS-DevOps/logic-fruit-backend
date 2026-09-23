import express from "express";
import { dynamoService } from "../services/dynamoService.js";
import {
  sendInquiryAlertToAdmin,
  sendUserConfirmation,
} from "../services/emailService.js";

const router = express.Router();

/**
 * @route   GET /api/inquiries
 * @desc    Get all form inquiries/leads (supports type filter)
 */
router.get("/", async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const filter = {};
    if (type && type !== "all") filter.type = type;
    if (status && status !== "all") filter.status = status;

    const items = await dynamoService.getAll("inquiry", filter);

    // Sort descending by createdAt (newest first)
    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/inquiries/:id
 * @desc    Get single inquiry details
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const inquiry = await dynamoService.getById(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry submission not found",
      });
    }

    res.json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/inquiries
 * @desc    Submit a new contact, whitepaper, or product lead form
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      fullName,
      firstName,
      lastName,
      email,
      workEmail,
      phone,
      company,
      companyName,
      industry,
      type = "contact",
      resourceTitle = "Website Contact",
      resourceSlug = "",
      message,
      projectRequirements,
      notes,
    } = req.body;

    // Normalize submitter name
    const submitterName =
      fullName ||
      name ||
      (firstName ? `${firstName} ${lastName || ""}`.trim() : "Anonymous Submitter");

    // Normalize email
    const submitterEmail = email || workEmail || "";

    if (!submitterEmail) {
      return res.status(400).json({
        success: false,
        message: "Email address is required for submission",
      });
    }

    const newInquiry = await dynamoService.create("inquiry", {
      name: submitterName,
      email: submitterEmail,
      phone: phone || "",
      company: company || companyName || "",
      industry: industry || "",
      type: type || "contact", // 'contact' | 'whitepaper' | 'product' | 'general'
      resourceTitle: resourceTitle || "Website Contact",
      resourceSlug: resourceSlug || "",
      message: message || projectRequirements || notes || "",
      status: "new",
      createdAt: new Date().toISOString(),
    });

    // Send email notifications in background without delaying client response
    sendInquiryAlertToAdmin(newInquiry).catch((err) => {
      console.error("⚠️ Could not send admin inquiry email:", err.message);
    });

    sendUserConfirmation(newInquiry).catch((err) => {
      console.error("⚠️ Could not send user confirmation email:", err.message);
    });

    res.status(201).json({
      success: true,
      message: "Form inquiry submitted successfully",
      data: newInquiry,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/inquiries/:id
 * @desc    Update inquiry status (e.g. 'read', 'archived')
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const updated = await dynamoService.update(id, updates);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found to update",
      });
    }

    res.json({
      success: true,
      message: "Inquiry updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/inquiries/:id
 * @desc    Delete an inquiry submission
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dynamoService.delete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found to delete",
      });
    }

    res.json({
      success: true,
      message: "Inquiry deleted successfully",
      data: { id },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
