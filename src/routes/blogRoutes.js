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
 * @route   GET /api/blogs/:slug
 * @desc    Get a single blog by slug or ID
 */
router.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;

    const blog = await dynamoService.getBySlugOrId("blog", slug);

    if (!blog) {
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
 * @route   PUT /api/blogs/:id
 * @desc    Update a blog post
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
