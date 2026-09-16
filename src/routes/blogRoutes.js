import express from "express";
import slugify from "slugify";
import { Blog } from "../models/Blog.js";

const router = express.Router();

/**
 * @route   GET /api/blogs
 * @desc    Get all blogs (supports category and status filter)
 */
router.get("/", async (req, res, next) => {
  try {
    const { category, status } = req.query;
    const filter = {};

    if (category && category !== "all") {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    } else {
      // By default, return published blogs for frontend consumers
      filter.status = "published";
    }

    const blogs = await Blog.find(filter).sort({ createdAt: -1 });

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

    // Search by slug first, or by MongoDB _id if it's a valid ID
    let blog = await Blog.findOne({ slug: slug.toLowerCase() });

    if (!blog && slug.match(/^[0-9a-fA-F]{24}$/)) {
      blog = await Blog.findById(slug);
    }

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
    const { title, slug, category, tag, author, authorRole, readTime, date, heroImage, excerpt, contentMarkdown, status } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Please provide a blog title",
      });
    }

    // Auto-generate slug if not provided
    const generatedSlug = slug
      ? slugify(slug, { lower: true, strict: true })
      : slugify(title, { lower: true, strict: true });

    // Check if slug already exists
    const existing = await Blog.findOne({ slug: generatedSlug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A blog with slug '${generatedSlug}' already exists. Please choose a different title or slug.`,
      });
    }

    const newBlog = await Blog.create({
      title,
      slug: generatedSlug,
      category: category || "all",
      tag: tag || "Article",
      author: author || "Logic Fruit Team",
      authorRole: authorRole || "",
      readTime: readTime || "5 min read",
      date: date || undefined,
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

    if (req.body.title && !req.body.slug) {
      req.body.slug = slugify(req.body.title, { lower: true, strict: true });
    } else if (req.body.slug) {
      req.body.slug = slugify(req.body.slug, { lower: true, strict: true });
    }

    const updatedBlog = await Blog.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

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

    const deletedBlog = await Blog.findByIdAndDelete(id);

    if (!deletedBlog) {
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
