import express from "express";
import slugify from "slugify";
import { Product } from "../models/Product.js";

const router = express.Router();

/**
 * @route   GET /api/products
 * @desc    Get all products (supports type and status filters)
 */
router.get("/", async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const filter = {};

    if (type && type !== "all") {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    } else {
      filter.status = "published";
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/products/:slug
 * @desc    Get a single product by slug or ID
 */
router.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;

    let product = await Product.findOne({ slug: slug.toLowerCase() });

    if (!product && slug.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(slug);
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/products
 * @desc    Create a new product
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      title,
      slug,
      type,
      feature,
      featureList,
      heroImage,
      galleryImages,
      videodesc,
      videourl,
      datasheetUrl,
      status,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Please provide a product title",
      });
    }

    const generatedSlug = slug
      ? slugify(slug, { lower: true, strict: true })
      : slugify(title, { lower: true, strict: true });

    const existing = await Product.findOne({ slug: generatedSlug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A product with slug '${generatedSlug}' already exists. Please choose a different title or slug.`,
      });
    }

    const newProduct = await Product.create({
      title,
      slug: generatedSlug,
      type: type || "System /Board",
      feature: feature || "",
      featureList: Array.isArray(featureList)
        ? featureList
        : featureList
        ? [featureList]
        : [],
      heroImage: heroImage || "",
      galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
      videodesc: videodesc || "",
      videourl: videourl || "",
      datasheetUrl: datasheetUrl || "",
      status: status || "published",
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: newProduct,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.body.title && !req.body.slug) {
      req.body.slug = slugify(req.body.title, { lower: true, strict: true });
    } else if (req.body.slug) {
      req.body.slug = slugify(req.body.slug, { lower: true, strict: true });
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found to update",
      });
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found to delete",
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
      data: { id },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
