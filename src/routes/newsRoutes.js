import express from "express";
import slugify from "slugify";
import { dynamoService } from "../services/dynamoService.js";

const router = express.Router();

/**
 * @route   GET /api/news
 * @desc    Get all news articles (supports status filter)
 */
router.get("/", async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {
      status: status || "published",
    };

    const newsArticles = await dynamoService.getAll("news", filter);

    res.json({
      success: true,
      count: newsArticles.length,
      data: newsArticles,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/news/:slug
 * @desc    Get a single news article by slug or ID
 */
router.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;

    const article = await dynamoService.getBySlugOrId("news", slug);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "News article not found",
      });
    }

    res.json({
      success: true,
      data: article,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/news
 * @desc    Create a new news article
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      title,
      slug,
      tag,
      date,
      location,
      heroImage,
      excerpt,
      contentMarkdown,
      externalUrl,
      status,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Please provide a news title",
      });
    }

    const generatedSlug = slug
      ? slugify(slug, { lower: true, strict: true })
      : slugify(title, { lower: true, strict: true });

    const exists = await dynamoService.slugExists(generatedSlug);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `A news article with slug '${generatedSlug}' already exists. Please choose a different title or slug.`,
      });
    }

    const newArticle = await dynamoService.create("news", {
      title,
      slug: generatedSlug,
      tag: tag || "Announcement",
      date:
        date ||
        new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      location: location || "",
      heroImage: heroImage || "",
      excerpt: excerpt || "",
      contentMarkdown: contentMarkdown || "",
      externalUrl: externalUrl || "",
      status: status || "published",
    });

    res.status(201).json({
      success: true,
      message: "News article created successfully",
      data: newArticle,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/news/:id
 * @desc    Update a news article
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.title && !updates.slug) {
      updates.slug = slugify(updates.title, { lower: true, strict: true });
    } else if (updates.slug) {
      updates.slug = slugify(updates.slug, { lower: true, strict: true });
    }

    const updatedArticle = await dynamoService.update(id, updates);

    if (!updatedArticle) {
      return res.status(404).json({
        success: false,
        message: "News article not found to update",
      });
    }

    res.json({
      success: true,
      message: "News article updated successfully",
      data: updatedArticle,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/news/:id
 * @desc    Delete a news article
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await dynamoService.delete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "News article not found to delete",
      });
    }

    res.json({
      success: true,
      message: "News article deleted successfully",
      data: { id },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
