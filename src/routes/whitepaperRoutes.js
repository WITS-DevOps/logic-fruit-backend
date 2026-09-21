import express from "express";
import slugify from "slugify";
import { dynamoService } from "../services/dynamoService.js";

const router = express.Router();

/**
 * @route   GET /api/whitepapers
 * @desc    Get all whitepapers (supports status filter)
 */
router.get("/", async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {
      status: status || "published",
    };

    const whitepapers = await dynamoService.getAll("whitepaper", filter);

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

    const whitepaper = await dynamoService.getBySlugOrId("whitepaper", slug);

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
      metaTitle,
      metaDescription,
      metaKeywords,
      canonicalUrl,
      ogImage,
      noIndex,
      order,
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

    const exists = await dynamoService.slugExists(generatedSlug);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `A whitepaper with slug '${generatedSlug}' already exists. Please choose a different title or slug.`,
      });
    }

    const newWhitepaper = await dynamoService.create("whitepaper", {
      title,
      slug: generatedSlug,
      tag: tag || "Whitepaper",
      date:
        date ||
        new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      author: author || "",
      authorRole: authorRole || "",
      img: img || "",
      pdfUrl: pdfUrl || "",
      hasLivePdf: hasLivePdf !== undefined ? Boolean(hasLivePdf) : Boolean(pdfUrl),
      overview: Array.isArray(overview) ? overview : overview ? [overview] : [],
      whatYouLearn: Array.isArray(whatYouLearn) ? whatYouLearn : whatYouLearn ? [whatYouLearn] : [],
      keyHighlights: Array.isArray(keyHighlights) ? keyHighlights : keyHighlights ? [keyHighlights] : [],
      status: status || "published",
      metaTitle: metaTitle || "",
      metaDescription: metaDescription || "",
      metaKeywords: metaKeywords || "",
      canonicalUrl: canonicalUrl || `/whitepaper/${generatedSlug}`,
      ogImage: ogImage || img || "",
      noIndex: Boolean(noIndex),
      order: typeof order === "number" ? order : 0,
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
 * @route   PUT /api/whitepapers/reorder
 * @desc    Reorder whitepapers
 */
router.put("/reorder", async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    await dynamoService.reorder("whitepaper", orderedIds);
    res.json({
      success: true,
      message: "Whitepapers reordered successfully",
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

    // Defensive safeguard if request matches /:id instead of /reorder
    if (id === "reorder") {
      const { orderedIds } = req.body;
      await dynamoService.reorder("whitepaper", orderedIds);
      return res.json({
        success: true,
        message: "Whitepapers reordered successfully",
      });
    }

    const updates = { ...req.body };

    if (updates.title && !updates.slug) {
      updates.slug = slugify(updates.title, { lower: true, strict: true });
    } else if (updates.slug) {
      updates.slug = slugify(updates.slug, { lower: true, strict: true });
    }

    if (updates.hasLivePdf !== undefined) {
      updates.hasLivePdf = Boolean(updates.hasLivePdf);
    }

    const updatedWhitepaper = await dynamoService.update(id, updates);

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

    const result = await dynamoService.delete(id);

    if (!result) {
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
