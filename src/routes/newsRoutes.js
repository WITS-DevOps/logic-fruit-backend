import express from "express";
import slugify from "slugify";
import { News } from "../models/News.js";

const router = express.Router();

/**
 * @route   GET /api/news
 * @desc    Get all news articles (supports status filter)
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

    const newsArticles = await News.find(filter).sort({ createdAt: -1 });

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

    let article = await News.findOne({ slug: slug.toLowerCase() });

    if (!article && slug.match(/^[0-9a-fA-F]{24}$/)) {
      article = await News.findById(slug);
    }

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
    const { title, slug, tag, date, location, heroImage, excerpt, contentMarkdown, externalUrl, status } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Please provide a news title",
      });
    }

    const generatedSlug = slug
      ? slugify(slug, { lower: true, strict: true })
      : slugify(title, { lower: true, strict: true });

    const existing = await News.findOne({ slug: generatedSlug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A news article with slug '${generatedSlug}' already exists. Please choose a different title or slug.`,
      });
    }

    const newArticle = await News.create({
      title,
      slug: generatedSlug,
      tag: tag || "Announcement",
      date: date || undefined,
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

    if (req.body.title && !req.body.slug) {
      req.body.slug = slugify(req.body.title, { lower: true, strict: true });
    } else if (req.body.slug) {
      req.body.slug = slugify(req.body.slug, { lower: true, strict: true });
    }

    const updatedArticle = await News.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

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

    const deletedArticle = await News.findByIdAndDelete(id);

    if (!deletedArticle) {
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
