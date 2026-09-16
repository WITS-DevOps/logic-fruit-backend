import express from "express";
import slugify from "slugify";
import { Whitepaper } from "../models/Whitepaper.js";

const router = express.Router();

/**
 * @route   GET /api/whitepapers
 * @desc    Get all whitepapers (supports status filter)
 */
router.get("/", async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    } else {
      filter.status = "published";
    }

    const whitepapers = await Whitepaper.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: whitepapers.length,
      data: whitepapers,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/whitepapers/:slug
 * @desc    Get a single whitepaper by slug or ID
 */
router.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;

    let whitepaper = await Whitepaper.findOne({ slug: slug.toLowerCase() });

    if (!whitepaper && slug.match(/^[0-9a-fA-F]{24}$/)) {
      whitepaper = await Whitepaper.findById(slug);
    }

    if (!whitepaper) {
      return res.status(404).json({
        success: false,
        message: "Whitepaper not found",
      });
    }

    res.json({
      success: true,
      data: whitepaper,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/whitepapers
 * @desc    Create a new whitepaper
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      title,
      slug,
      tag,
      date,
      author,
      authorRole,
      img,
      pdfUrl,
      hasLivePdf,
      overview,
      whatYouLearn,
      keyHighlights,
      status,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Please provide a whitepaper title",
      });
    }

    const generatedSlug = slug
      ? slugify(slug, { lower: true, strict: true })
      : slugify(title, { lower: true, strict: true });

    const existing = await Whitepaper.findOne({ slug: generatedSlug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A whitepaper with slug '${generatedSlug}' already exists. Please choose a different title or slug.`,
      });
    }

    const newWhitepaper = await Whitepaper.create({
      title,
      slug: generatedSlug,
      tag: tag || "Whitepaper",
      date: date || undefined,
      author: author || "",
      authorRole: authorRole || "",
      img: img || "",
      pdfUrl: pdfUrl || "",
      hasLivePdf: Boolean(pdfUrl || hasLivePdf),
      overview: Array.isArray(overview) ? overview : overview ? [overview] : [],
      whatYouLearn: Array.isArray(whatYouLearn) ? whatYouLearn : whatYouLearn ? [whatYouLearn] : [],
      keyHighlights: Array.isArray(keyHighlights) ? keyHighlights : keyHighlights ? [keyHighlights] : [],
      status: status || "published",
    });

    res.status(201).json({
      success: true,
      message: "Whitepaper created successfully",
      data: newWhitepaper,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/whitepapers/:id
 * @desc    Update a whitepaper
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.body.title && !req.body.slug) {
      req.body.slug = slugify(req.body.title, { lower: true, strict: true });
    } else if (req.body.slug) {
      req.body.slug = slugify(req.body.slug, { lower: true, strict: true });
    }

    if (req.body.pdfUrl) {
      req.body.hasLivePdf = true;
    }

    const updatedWhitepaper = await Whitepaper.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedWhitepaper) {
      return res.status(404).json({
        success: false,
        message: "Whitepaper not found to update",
      });
    }

    res.json({
      success: true,
      message: "Whitepaper updated successfully",
      data: updatedWhitepaper,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/whitepapers/:id
 * @desc    Delete a whitepaper
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const deletedWhitepaper = await Whitepaper.findByIdAndDelete(id);

    if (!deletedWhitepaper) {
      return res.status(404).json({
        success: false,
        message: "Whitepaper not found to delete",
      });
    }

    res.json({
      success: true,
      message: "Whitepaper deleted successfully",
      data: { id },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
