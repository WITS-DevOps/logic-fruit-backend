import express from "express";
import slugify from "slugify";
import { dynamoService } from "../services/dynamoService.js";

const router = express.Router();

/**
 * Helper to determine if an incoming request is from the Staging environment.
 * Checks query param (env=staging), custom header (X-Environment: staging),
 * or Origin / Referer matching STAGING_URL or vercel.app / localhost.
 */
function isStagingRequest(req) {
  // 1. Explicit query parameter or custom header
  const envParam = req.query?.env || req.headers?.["x-environment"] || "";
  if (typeof envParam === "string" && envParam.toLowerCase() === "staging") {
    return true;
  }

  // 2. Check Origin or Referer against configured staging URLs
  const origin = (req.headers?.origin || req.headers?.referer || "").toLowerCase();
  const stagingUrl = (process.env.STAGING_URL || "https://logic-fruit-ui.vercel.app").toLowerCase();
  const stagingOrigins = [
    stagingUrl,
    "logic-fruit-ui.vercel.app",
    "localhost",
    "127.0.0.1",
  ];

  return stagingOrigins.some((stg) => origin.includes(stg.replace(/^https?:\/\//, "")));
}

/**
 * @route   GET /api/news
 * @desc    Get all news articles (supports status filter, respects staging vs live production)
 */
router.get("/", async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {
      status: status || "published",
    };

    let newsArticles = await dynamoService.getAll("news", filter);

    // Staging vs Production visibility rule:
    // 1. If requested by Admin CMS (status === "all"), return all news so admins can manage everything.
    // 2. If requested on Staging (Vercel / localhost), return all published news (both live and staging-only).
    // 3. If requested on Live Production, exclude news where isProduction is explicitly false.
    const isStaging = isStagingRequest(req);
    const isAdmin = status === "all";

    if (!isStaging && !isAdmin) {
      newsArticles = newsArticles.filter((n) => n.isProduction !== false);
    }

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
 * @desc    Get a single news article by slug or ID (protected if staging-only)
 */
router.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { preview } = req.query;

    const article = await dynamoService.getBySlugOrId("news", slug);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "News article not found",
      });
    }

    const isStaging = isStagingRequest(req);
    const isPreview = preview === "true";

    // Protect draft news articles from public viewing unless preview mode is active
    if (article.status === "draft" && !isPreview) {
      return res.status(404).json({
        success: false,
        message: "News article not found",
      });
    }

    // If news article is marked staging-only (isProduction === false) and accessed on live production, return 404
    if (!isStaging && !isPreview && article.isProduction === false) {
      return res.status(404).json({
        success: false,
        message: "News article not available in production",
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
      isProduction,
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
      isProduction: isProduction !== false,
      metaTitle: metaTitle || "",
      metaDescription: metaDescription || "",
      metaKeywords: metaKeywords || "",
      canonicalUrl: canonicalUrl || `/news/${generatedSlug}`,
      ogImage: ogImage || heroImage || "",
      noIndex: Boolean(noIndex),
      order: typeof order === "number" ? order : 0,
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
 * @route   PUT /api/news/reorder
 * @desc    Reorder news articles
 */
router.put("/reorder", async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    await dynamoService.reorder("news", orderedIds);
    res.json({
      success: true,
      message: "News reordered successfully",
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

    // Defensive safeguard if request matches /:id instead of /reorder
    if (id === "reorder") {
      const { orderedIds } = req.body;
      await dynamoService.reorder("news", orderedIds);
      return res.json({
        success: true,
        message: "News reordered successfully",
      });
    }

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
