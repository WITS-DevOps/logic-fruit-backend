import express from "express";
import slugify from "slugify";
import { dynamoService } from "../services/dynamoService.js";

const router = express.Router();

/**
 * @route   GET /api/blogs
 * @desc    Get all blogs (supports category and status filter)
 */
router.get("/", async (req, res, next) => {
  try {
    const { category, status } = req.query;
    const filter = {
      category,
      status: status || "published",
    };

    const blogs = await dynamoService.getAll("blog", filter);

    res.json({
      success: true,
      count: blogs.length,
      data: blogs,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/blogs/categories
 * @desc    Get all custom blog categories stored in DB
 */
router.get("/categories", async (req, res, next) => {
  try {
    let customCategories = [];
    try {
      customCategories = await dynamoService.getAll("category");
    } catch (e) {
      console.warn("Could not query categories from DB:", e.message);
    }

    res.json({
      success: true,
      data: customCategories || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/blogs/categories
 * @desc    Create and store a new blog category in DB
 */
router.post("/categories", async (req, res, next) => {
  try {
    const { label, value } = req.body;
    if (!label || !label.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a category name",
      });
    }

    const trimmedLabel = label.trim();
    const slug = value
      ? slugify(value, { lower: true, strict: true })
      : slugify(trimmedLabel, { lower: true, strict: true });

    let existing = [];
    try {
      existing = await dynamoService.getAll("category");
    } catch (e) {
      console.warn("Could not check existing categories:", e.message);
    }

    const duplicate = existing.find(
      (c) => c.value === slug || (c.label && c.label.toLowerCase() === trimmedLabel.toLowerCase())
    );

    if (duplicate) {
      return res.json({
        success: true,
        message: "Category already exists",
        data: duplicate,
      });
    }

    const newCategory = await dynamoService.create("category", {
      label: trimmedLabel,
      value: slug,
    });

    res.status(201).json({
      success: true,
      message: "Category added successfully to database",
      data: newCategory,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/blogs/:slug
 * @desc    Get a single blog by slug or ID
 */
router.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { preview } = req.query;

    const blog = await dynamoService.getBySlugOrId("blog", slug);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    // Protect draft blogs from public viewing unless preview mode is active
    if (blog.status === "draft" && preview !== "true") {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    res.json({
      success: true,
      data: blog,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/blogs
 * @desc    Create a new blog post
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      title,
      slug,
      category,
      tag,
      author,
      authorRole,
      readTime,
      date,
      heroImage,
      excerpt,
      contentMarkdown,
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
        message: "Please provide a blog title",
      });
    }

    const generatedSlug = slug
      ? slugify(slug, { lower: true, strict: true })
      : slugify(title, { lower: true, strict: true });

    const exists = await dynamoService.slugExists(generatedSlug);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `A blog with slug '${generatedSlug}' already exists. Please choose a different title or slug.`,
      });
    }

    const newBlog = await dynamoService.create("blog", {
      title,
      slug: generatedSlug,
      category: category || "all",
      tag: tag || "Article",
      author: author || "Logic Fruit Team",
      authorRole: authorRole || "",
      readTime: readTime || "5 min read",
      date:
        date ||
        new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      heroImage: heroImage || "",
      excerpt: excerpt || "",
      contentMarkdown: contentMarkdown || "",
      status: status || "published",
      metaTitle: metaTitle || "",
      metaDescription: metaDescription || "",
      metaKeywords: metaKeywords || "",
      canonicalUrl: canonicalUrl || `/blogs/${generatedSlug}`,
      ogImage: ogImage || heroImage || "",
      noIndex: Boolean(noIndex),
      order: typeof order === "number" ? order : 0,
    });

    res.status(201).json({
      success: true,
      message: "Blog post created successfully",
      data: newBlog,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/blogs/reorder
 * @desc    Reorder blogs
 */
router.put("/reorder", async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    await dynamoService.reorder("blog", orderedIds);
    res.json({
      success: true,
      message: "Blogs reordered successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/blogs/:id
 * @desc    Update a blog post
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Defensive safeguard if request matches /:id instead of /reorder
    if (id === "reorder") {
      const { orderedIds } = req.body;
      await dynamoService.reorder("blog", orderedIds);
      return res.json({
        success: true,
        message: "Blogs reordered successfully",
      });
    }

    const updates = { ...req.body };

    if (updates.title && !updates.slug) {
      updates.slug = slugify(updates.title, { lower: true, strict: true });
    } else if (updates.slug) {
      updates.slug = slugify(updates.slug, { lower: true, strict: true });
    }

    const updatedBlog = await dynamoService.update(id, updates);

    if (!updatedBlog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found to update",
      });
    }

    res.json({
      success: true,
      message: "Blog updated successfully",
      data: updatedBlog,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/blogs/:id
 * @desc    Delete a blog post
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await dynamoService.delete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Blog not found to delete",
      });
    }

    res.json({
      success: true,
      message: "Blog deleted successfully",
      data: { id },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
